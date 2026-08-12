---
status: confirmed
layer: feature-design
task: SYS-PUBLISHER-PLUGIN-P04
parent_feature: feat-publisher-plugin
feature_package_id: feature-package/feat-publisher-plugin
source: [architecture-decision-record.md, requirements-baseline.md, design-review-notes.md]
feature_context_digest: sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-security]
---

# feat-publisher-plugin テストファースト設計 (test-design)

> **位置づけ**: P04 の成果物。[architecture-decision-record.md](./architecture-decision-record.md) の AD-1〜AD-6 が確定した実装構造 (`apps/publisher/{cli,core,inspection-client,auth,deploy}/` + `plugins/harness-hub-publisher/`) に対し、[requirements-baseline.md](./requirements-baseline.md) の quality_constraints 8 件・acceptance 3 件 (+ AD-6 で scope 追加した feedback サブコマンド) それぞれに対応するテストケースを ID 化する。テストは本 phase で **red (実装が存在せず失敗/コンパイル不能) の状態**で `apps/publisher/src/__tests__/` にスタブとして用意し、P05 (実装) で green 化、P06 (テスト実行) で実測結果を確定する。
>
> ID は `feat-publish-pipeline` 側の test-design.md ([docs/features/feat-publish-pipeline/test-design.md](../feat-publish-pipeline/test-design.md)) が使う `T{n}-{x}` と衝突しないよう、本書は `PT{n}-{x}` (Publisher Test) を用いる。`packages/inspection` の判定ロジック自体の単体テスト (`T2-*`) は feat-publish-pipeline の責務であり、本書は import 側 (consumer) からの同値性確認にとどめる (AD-3)。

## 0. quality_constraints / acceptance → テスト対応表

| quality_constraint / acceptance id | 対応 AD | 対応 PT |
|---|---|---|
| publisher-typescript-unification-python-parity-migration-qa010-c3 | AD-1 | PT1 |
| device-flow-auth-os-credential-storage-qa008-qa041 | AD-4 | PT2 |
| inspection-pipeline-shared-no-duplicate-impl-qa010-qa020 | AD-3 | PT3 |
| web-app-egress-wrangler-cli-script-execution-i5-qa003-qa043 | AD-5 | PT4 |
| no-dedicated-desktop-gui-qa007 | AD-2 | PT5 |
| hub-api-implementation-out-of-scope-depends-on-feat-publish-pipeline | AD-3 | PT3-B |
| initial-publish-15min-target-o4-h8 | AD-5 | PT4-D |
| author-toolchain-macos-primary-windows-secondary-same-pnpm-script-qa043 | AD-1 | PT6 |
| 上流未解決事項 (AD-6, feedback サブコマンド owner確定) | AD-6 | PT7 |
| acceptance 1: macOS/Windows 両実機で publish E2E が成功する | AD-1, AD-5 | PT6-B |
| acceptance 2: pre-check と Hub 検査の判定が同値 | AD-3 | PT3-A |
| acceptance 3: 初回 publish 15 分以内の実測記録 | AD-5 | PT4-D |

未割当 0 件 (quality_constraints 8 件 + acceptance 3 件 + AD-6 scope 追加分 = 全 12 項目を PT1〜PT7 で網羅)。

---

## PT1. core/ package 収集 + manifest 補完、Python 資産との挙動同値 (scope_in 1・scope_in 5, AD-1)

### PT1-A manifest 補完のフィールド単位テスト
`core/` の manifest 補完ロジックが、`plugin.json` の必須メタ (`PACKAGE_REQUIRED_META_KEYS` = `name`/`version`/`description`, `packages/inspection/src/package-rules.ts` と同一キー) を欠く入力に対し、どう補完/エラー化するかを個別にテストする。

### PT1-B Python 資産との挙動同値 (収集・カタログ部分)
`packages/inspection/src/package-rules.ts` の T2-D (feat-publish-pipeline 側) が既に「`validate-plugin-package.py` の PKG-xxx 判定」との同値性をカバーしている。本 PT1-B は**その対象外**である「package 収集 (ファイル列挙・対象ディレクトリ確定) と marketplace catalog 生成」部分 (`plugins/harness-creator/skills/ref-pkg-contract/` の `pkg-id-catalog.yaml` 相当ロジック、`skills/run-plugin-package-check/scripts/aggregate-pkg-findings.py` の集計ロジック) を対象に、同一入力に対する出力の同値性を固定する。feat-publish-pipeline 側の T2-D と同じ注意書きに従い、Python 側が扱う範囲 (plugin 全体) と本 feature が扱う範囲 (publish される skills-package) が完全一致しない点を明示し、共通する判定項目のみを同値主張の対象とする。差分は P08 (リファクタリング/マイグレーション) の移植記録に残す。

### PT1-C 5 サブディレクトリの責務境界 (構造テスト)
`apps/publisher/src/{cli,core,inspection-client,auth,deploy}/` の 5 ディレクトリが存在し、`core/` が `auth/`・`deploy/` の実装詳細に依存しない (抽象インターフェース越しにのみ参照する) ことを import グラフ検査で固定する。

---

## PT2. Device Flow 認証 + OS 資格情報域保存 (AD-4)

### PT2-A device_code/token polling 状態機械
`POST /api/v1/device/code` → `POST /api/v1/device/token` の polling が `authorization_pending`/`slow_down`/`expired_token` の 3 応答それぞれで正しく遷移すること (interval 5 秒開始・`slow_down` で +5 秒・上限 60 秒) を状態機械の unit test として設計する。

### PT2-B token 数値契約
device_code TTL 10 分、access token 15 分、refresh token 90 日 rotation の期限判定ロジックをテストする。

### PT2-C reuse-detection によるfamily 全失効
refresh token の再利用が検知された場合に、同一 family の token が全て失効し OS credential store からクリアされることをテストする。

### PT2-D OS 資格情報域への保存・平文非保存
macOS Keychain / Windows Credential Manager の adapter が token を保存すること、および平文ファイル・環境変数・リポジトリへの書き込み経路が一切存在しないことを、ファイルシステム/環境変数の副作用が無いことを検証する形でテストする。

### PT2-E scope 最小権限
コマンドごとに要求する scope が現行5種 (`publish:write`/`metrics:write`/`feedback:write`/`aijob:process`/`docs:write`) のうち必要最小限であることをテストする。`feedback` は `feedback:write` のみ、`docs` は `docs:write` のみを要求する。

---

## PT3. inspection-client 判定同値・owner 境界 (AD-3, acceptance 2)

### PT3-A Publisher context / Hub context の verdict 一致 (acceptance 2)
`packages/inspection` の `runInspection`/`inspect` を Publisher (`inspection-client/`) 経由で呼んだ結果と、Hub (`apps/hub/src/shared/inspection`) 経由で呼んだ結果が、同一 fixture 入力に対して同一 verdict (Green/Yellow/Red) になることをテストする。判定ロジック自体の単体テストは feat-publish-pipeline 側 (T2-A〜T2-E) の責務であり、本 PT3-A は「二つの呼び出し経路が同一関数に収束している」ことの回帰確認に限定する。

### PT3-B 二重実装がないことの構造テスト (hub-api-implementation-out-of-scope)
`inspection-client/` が判定ロジック (severity 分岐等) を再実装していないこと、および Hub 側 API (`POST /api/v1/publish/:id/submit` 等) の実装ファイルが本 feature の write scope に存在しないことを、静的な import/ファイル存在検査でテストする。

---

## PT4. wrangler CLI 実行ラッパー (AD-5, scope_in 4)

### PT4-A プロセス実行・exit code 処理
`deploy/` が wrangler CLI を子プロセスとして実行し、exit code 0 を成功、非 0 を失敗として扱うことをテストする。実際の wrangler / Cloudflare API は呼び出さず、プロセス実行部分を差し替え可能にした fake 経由でテストする (具体的な fake 設計は下記スタブの TODO を参照)。

### PT4-B stdout からの URL 抽出
wrangler の標準出力から deploy 先 URL を抽出するパーサをテストする (成功時のフォーマット・URL が見つからない異常系の両方)。

### PT4-C Hub API (`POST /api/v1/projects/:id/deployment`) 呼出契約
抽出した exit code / URL を Hub の deployment 登録 endpoint へ送る際のリクエスト形状 (`packages/schemas` 型) をテストする。Hub 側の health 確認・Catalog 昇格判定は本 feature の対象外 (AD-5 帰結) であることを、レスポンス処理側にその分岐が実装されていないことで確認する。

### PT4-D 実機 E2E タイムボックス計測 (initial-publish-15min-target-o4-h8, acceptance 1・3)
初回 publish (package 収集 → pre-check → Device Flow 認証 → wrangler 実行 → Hub 登録) の合計所要時間が 15 分以内であることを計測するテストケースを設計する。**実行方針 (2026-08-02 作者確認、2026-08-02 最終レビューで再確認)**: macOS (本開発環境) では fake I/O 境界の自動テストとして制御フローと処理オーバーヘッドを計測する。Windows 実機はこの開発環境に存在しないため、同一手順の**手動実施用再現手順書**を P06 成果物に残す。この二つは実機 E2E の代替証跡ではないため、実測未了のまま acceptance を「合格」と扱わない。

---

## PT5. plugin 面の構造 (AD-2, no-dedicated-desktop-gui-qa007)

### PT5-A plugin manifest/slash command/skill/scripts の実体確認
`plugins/harness-hub-publisher/` に `.claude-plugin/plugin.json`・`commands/publish.md`・`skills/run-publisher-publish/`・`scripts/` が存在し、desktop GUI 相当の実装 (Electron/Tauri 等の依存) が存在しないことをテストする。

### PT5-B apps/publisher への単一接続 (二重実装なし)
plugin 側の script/skill が `apps/publisher/src/cli/` の呼び出しのみを行い、業務ロジック (package 収集・Device Flow・wrangler 実行) を複製していないことを、plugin 側ファイルの依存先解析でテストする。

---

## PT6. cross-platform toolchain (author-toolchain-macos-primary-windows-secondary-same-pnpm-script-qa043)

### PT6-A pnpm script の OS 非依存性
`apps/publisher/package.json` の pnpm script が、パス区切り文字・改行コード・シェル依存構文 (`&&` の POSIX 依存等) をコマンド文字列へ直接埋め込んでいないことを静的にテストする (Node.js の `path` モジュール経由に閉じているか)。

### PT6-B macOS/Windows 両実機での publish E2E 成功 (acceptance 1)
PT4-D の実機 E2E タイムボックス計測と同一の実行が、成功終了 (exit code 0・Hub への登録完了) することを確認するテストケース。macOS 分は自動テストで実施し、Windows 分は PT4-D と同じ理由で手動再現手順書に留める。

---

## PT7. feedback サブコマンド (AD-6, 上流未解決事項の解消分)

### PT7-A feedback CLI 薄いクライアントの契約テスト
`apps/publisher/src/cli/` の `feedback` サブコマンドが、AD-4 の Device Flow 基盤 (Bearer token) を再利用して `POST /api/v1/feedback` を呼び出すだけであり、feat-feedback-loop 側のデータモデル・受理ロジックを再実装していないことをテストする。

---

## 10. テスト配置

`apps/publisher/src/__tests__/` 配下に PT ごとに 1 ファイルを置く。

```text
apps/publisher/src/__tests__/
  pt1-core-manifest-and-python-parity.test.ts
  pt2-device-flow-auth.test.ts
  pt3-inspection-client-parity.test.ts
  pt4-wrangler-deploy-wrapper.test.ts
  pt5-plugin-surface-structure.test.ts
  pt6-cross-platform-toolchain.test.ts
  pt7-feedback-subcommand.test.ts
```

P05 実装後、`apps/publisher/package.json`・`tsconfig.json`・`vitest.config.ts` を追加し (P05 の write scope)、上記ファイルを green 化する。

## 11. 実機 E2E 運用方針 (macOS 自動 / Windows 手順書、2026-08-02 作者確認)

- macOS: この開発環境で fake I/O 境界の自動テストを実行し、実サービス・実ブラウザ認可・実 Wrangler deploy を含む実機 E2E は別途実施する。
- Windows: この開発環境に実機が存在しないため、P06 成果物として「Windows での初回 publish 手動実施手順書 (再現可能なコマンド列・期待結果・15 分計測方法)」を作成し、実機実測が未了であることを明記する。P07 (受入) では、macOS/Windows とも実機 E2E 証跡が揃うまで A1/A3 を未達と記録する。

## 12. 検証

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin`
- Required evidence: quality_constraints 8 件 (id 単位)・acceptance 3 件それぞれに対応するテストケースが本書 §0 に列挙され、`apps/publisher/src/__tests__/` にスタブが存在すること。
