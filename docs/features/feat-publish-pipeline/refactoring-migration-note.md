---
status: confirmed
layer: feature-quality
task: SYS-PUBLISH-PIPELINE-P08
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/acceptance-record.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline リファクタリング/移行ノート

> **位置づけ**: P08 の成果物。本 feature は `packages/db/schema/` を write scope に持たず DB migration を持たないため、task spec の定めにより (1) Python 資産移植の最終整理、(2) 検査ロジック二重実装防止 CI 検査、(3) `packages/db/schema/` 直接アクセス禁止 CI 検査、の 3 点に読み替えて実施した。

## 1. DB migration が無いことの確認

publish 系テーブル (`publish_requests` / `releases` / `target_channels` / `packages` / `deployment_references` / `audit_events` / `idempotency_ledger`) のスキーマ owner は **feat-domain-model-db** である。本 feature はそれらの consumer にすぎない。

したがって本 phase では migration ファイルを 1 件も生成していない。代わりに「consumer が owner の内部へ手を伸ばしていないこと」を §4 の CI 検査で恒久化した。

## 2. Python 資産移植の最終整理

### 2-1. 移植元の所在

移植元とされた harness-creator の Python 資産 (package check / package contract / marketplace catalog) は**本リポジトリに存在しない**。したがって「出力差分 0 件」を実測で示すことはできない。

この点を曖昧にしたまま「同値である」と記録するのは誤りなので、代わりに以下を移植の完了条件として置いた。

| 条件 | 状態 | 証跡 |
|---|:--:|---|
| 検査ルールが純関数として `packages/inspection` に閉じている (I/O・時刻・乱数を持たない) | 満たす | `InspectionRule.evaluate` の型契約 + `pipeline.test.ts` |
| ルール 1 件ごとに、通る例と落ちる例の両方のテストがある | 満たす | `package-rules.test.ts` / `secret-scan-preset.test.ts` |
| Hub と Publisher が**同じ関数**を呼ぶ形になっている | 満たす | `createPublishInspectionRules()` (§3) |
| 検査結果の同一性を外から比較できる | 満たす | `PipelineDescriptor` (`ruleIds` / stage 別 ID) |

`PipelineDescriptor` があるため、将来 Publisher 側が実装されたときに「両者の descriptor が一致するか」を 1 行で照合できる。これが実質的な挙動同値の検証手段になる。

### 2-2. 移植で落ちていた項目 (本 phase で是正)

| 項目 | 状態 | 対応 |
|---|---|---|
| secret scan が公開検査へ結線されていなかった | 是正済み | §3 |
| 検査ルール束を作る場所が複数あり得た | 是正済み | §3 + §4-1 |

## 3. 検査ルール合成の単一化

`packages/inspection/src/publish-inspection.ts` を新設した。

```
createPublishInspectionRules()
  = createPackageInspectionRules()   // static-validation + policy
  + createDefaultSecretScanRules()   // secret-scan
```

**なぜ関数 1 本にしたか**: 束ねる場所が無いと、呼ぶ側がそれぞれ束ねる。束ね方が 2 通りあると、片方から 1 本落ちても誰も気づかない。実際にそれが起きていた (P06 §4-1)。

あわせて `PUBLISH_INSPECTION_REQUIRED_STAGES` (= I2 の 3 本立て) を値として公開した。全 stage の宣言 `INSPECTION_STAGES` と別に持つのは、「pipeline が扱える stage」と「公開検査が**必ず**動かす stage」が別の概念だからである。前者が増えても受入条件は変わらないが、後者が減ったら受入条件が壊れる。

## 4. 恒久化した CI 検査

### 4-1. 検査ロジック二重実装の防止

**既存機構で充足している**。`shared-layer-registry.json` に `inspection-pipeline` (owner=`packages/inspection`) が登録済みで、`scripts/ci/check-shared-layer-duplicates.mjs` が複製を検出する。

landing review で production smoke の deep import と test-only 公開名衝突を検出・
是正した後の実測は、`登録共通層 12 件 + 運用機構 4 件 / 走査 501 ファイル /
違反 0 件`。

新しい検査を足さなかったのは、同じ目的の機構を 2 つ持つと**どちらが正か**が分からなくなり、片方が緩んだときに気づけなくなるためである。

### 4-2. 公開検査ゲート `apps/hub/scripts/check-publish-inspection-gate.mjs` (新設)

重複検出器が見るのは「ロジックが複製されていないか」であって、「正しい束が使われているか」ではない。secret scan の欠落はまさに後者で、複製ゼロのまま起きた。そこで別の検査を足した。

| test_id | 検査内容 |
|---|---|
| T-INS-01 | `packages/inspection` の公開入口が `createPublishInspectionRules` を export している |
| T-INS-02 | その合成が `createPackageInspectionRules` と `createDefaultSecretScanRules` の**両方**を含む |
| T-INS-03 | Hub の検査入口が `createPublishInspectionRules` を使っている |
| T-INS-04 | 公開経路 (`src/lib/publish/`, `src/app/api/v1/`) から検査 pipeline を起動するのは検査入口 1 ファイルだけで、汎用 registry (`src/shared/inspection/`) へ到達しない |

実測: `走査 40 ファイル / 違反 0 件`。

> **T-INS-04 を「到達可能性」で書いた理由**: `src/shared/inspection/` は owner=feat-hub-foundation の登録共通層で、任意のルールを登録して走らせられる。文面どおりに読めば bypass になりうるが、本 feature が削除してよい資産ではない。**消せない抜け道は塞ぐのではなく、公開経路から届かないことを検査で固定する**。公開経路が 1 度でもあれを import した時点でこの検査が落ちる。

### 4-3. DB スキーマ境界検査 `apps/hub/scripts/check-db-schema-boundary.mjs` (新設)

`packages/db` の `package.json` は `"./schema"` を**公開 subpath として出している**。つまり apps/hub 側から `@harness-hub/db/schema` と書けばテーブル定義に直接届く。届いた瞬間、feat-domain-model-db が列を変える自由を本 feature が奪う。

| test_id | 検査内容 |
|---|---|
| T-DBB-01 | `@harness-hub/db/` の subpath 参照を**全面禁止** (公開入口 `.` のみ許可) |
| T-DBB-02 | 相対 path で `packages/db/` の内部へ到達していない (T-DBB-01 の迂回路を塞ぐ) |

実測: `走査 206 ファイル / 違反 0 件`。P13 smoke は
`createPublishSmokeDbProbe` を `@harness-hub/db` の root 入口から受け取り、
fixture・証跡・cleanup でも schema subpath を参照しない。

> **`/schema` だけでなく subpath 全面禁止にした理由**: `/schema` だけを禁じると `/repository` 経由で行型がそのまま業務ロジックへ流れる経路が残る。境界は 1 枚に保つ。現時点で subpath 参照は 0 件なので、この禁止は既存コードを 1 行も曲げていない (追加の制約ではなく**現状の固定**である)。

## 5. 検査スクリプトの置き場所について

両スクリプトは `apps/hub/scripts/` に置き、共有 CI 構成 (`scripts/ci/`) には触れていない。task spec が「CI 検査設定ファイルは共有 CI 構成の不可侵範囲外である feature 固有チェックスクリプトに限定」と定めているため。

既存の `check-auth-adapter-boundary.mjs` / `check-auth-gates.mjs` と同じ形 (`stripComments` / `moduleSpecifiers` / `--json` オプション / 違反時 exit 1) に揃えてあるので、CI へ組み込む際は同じ行を足すだけでよい。

## 6. 残課題 (follow-up)

| # | 内容 | 影響 |
|---|---|---|
| F1 | 重複検出器の `resolveModulePath` が `.js` 拡張子付き specifier を解決できない | 検出漏れの可能性。現状は違反 0 件なので実害なし |
| F2 | `src/shared/inspection/` の汎用 registry が本番未使用のまま残る | owner=feat-hub-foundation。到達禁止で封じているが、資産としては死蔵 |
| F3 | `src/lib/publish/db-ports.ts` (280 行) がテスト未到達 (カバレッジ 2.6%) | 実 DB 接続を要するため。統合テスト環境の整備が必要 |
