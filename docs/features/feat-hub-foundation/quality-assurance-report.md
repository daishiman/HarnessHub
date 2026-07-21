---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P09
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
measured_at: "2026-07-21"
---

# feat-hub-foundation 品質・セキュリティ・運用保証 (P09)

> **P09 の責務**: 適用対象の検査を **fail-closed**（違反があれば必ず落ちる）にすること。ゲートが「存在する」ことではなく「**実際に落ちること**」を確認する。

## 1. CI 品質ゲートの実効性確認

各ゲートについて、**正常系で pass すること**と**違反状態で fail すること**の両方を実測した。片方だけの確認は、常時緑になる故障（Goodhart 化）を見逃す。

| ゲート | 正常系 | 違反時 | 実効性 |
|---|---|---|---|
| G1 pnpm 混入検査 | exit 0（違反 0 件） | `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` / `bun.lockb` の 4 種すべてで**非ゼロ終了**を実測 | ✅ 実効あり |
| G1 packageManager pin | exit 0 | pin 無し・`npm@` pin の両方で非ゼロ終了 | ✅ 実効あり |
| G3 typecheck | 全 6 package PASS | `exactOptionalPropertyTypes` 由来の型エラー 5 件を**実際に検出**（P05 中に発生・修正済み） | ✅ 実効あり |
| G4 test | 36 files / 495 tests pass | a11y テストの timeout 故障を検出（下記 §2） | ✅ 実効あり |
| G5 bundle 予算 | 0.951 MiB / 3 MiB | 閾値 1 KiB で**非ゼロ終了**を実測。未ビルド時も**非ゼロ終了**（fail-closed） | ✅ 実効あり |
| G9 axe a11y | 部品・画面とも違反 0 件 | — （違反注入は未実施。§4 の限界） | ⚠️ 片系のみ |
| G10 duplicate detector | 174 ファイル走査・0 件 | 意図的違反 fixture で**2 種とも検出**（owner 外 export / deep import） | ✅ 実効あり |
| G6 secret scan | 177 ファイル走査・検出 0 件 | private key / AWS key / GitHub token / 代入形 API key の 4 種で**検出を実測**。env 参照は誤検出しないことも確認 | ✅ 実効あり |
| G8 OpenAPI / zod drift | snapshot 一致で exit 0 | snapshot を 1 文字ずらすと **exit 1** を実測 | ✅ 実効あり |
| G7 破壊的 DDL | — | — | ⬜ **未実行**（対象 migrations 不在。§3） |
| G11 CWV 定期計測 | — | — | ⬜ **未実行**（デプロイ後） |

## 2. 実効性検証で発見・是正した「常時緑/常時赤」故障 4 件

ゲートは実装ミスで壊れても静かに緑になるため、以下は放置すると受入判定を無意味にした。

| # | 故障 | 症状 | 是正 |
|---|---|---|---|
| 1 | duplicate detector の `isInside()` が常に `false` を返す | owner 自身の export を重複と誤検出 → **常時赤**になり、いずれ無効化される | `resolve(rel).startsWith(sep)` → `isAbsolute(rel)` |
| 2 | bundle ゲートが `.open-next` 全体を計測 | デプロイされない中間生成物まで二重計上し **5.44 MiB と誤検出（常時赤）**。逆に不完全な成果物では **0.004 MiB と誤って緑** | wrangler dry-run の実 bundle のみを計測。`measurementMode` を証跡に記録し、テストで固定 |
| 3 | a11y テストが vitest 既定 5 秒で timeout | 「違反 0 件」を証明するゲートが**常時赤** → skip されて実質無効化される | `testTimeout: 30_000` |
| 4 | pnpm 混入検査がリポジトリ全体を走査 | plugin の vendor 資産（`plugins/slide-report-generator/vendor/package-lock.json` 等）を違反判定し **常時赤** | 走査範囲を Hub monorepo（root + `apps/` + `packages/`）へ限定 |
| 5 | G2 が `apps/hub` を検査せず素通り | `apps/hub` だけ `lint` script が無く、`pnpm -r run lint` は script 不在の package を**エラーにせず黙って飛ばす**。ゲートは緑のまま本体アプリを一度も検査していなかった | `apps/hub/package.json` に `lint` を追加し exit 0 を実測 |

> **`pnpm -r run <script>` の落とし穴**: script が存在しない package は「成功」でも「失敗」でもなく**沈黙してスキップ**される。ゲートを `-r` で回す設計では、**全 workspace member が当該 script を持っていること自体を検査しない限り、緑は「全部通った」を意味しない**。

## 3. 未実行のゲート（fail-closed のまま残すもの）

| ゲート | 未実行の理由 | 解除条件 |
|---|---|---|
| G7 破壊的 DDL 検査 | `packages/db/migrations` が存在しない（スキーマ実体は feat-domain-model-db の責務） | 当該 feature 着手時。CI は「migrations 未作成なら対象なし」と明示スキップ |
| G11 CWV | デプロイ未実施 | P13 完了後 |

> G6 / G8 は当初未配線だったが、**本 phase で配線し実効性まで実測した**（上表）。G6 は `packages/inspection` の公開 API（`defineSecretScanRule` / `runInspection`）を再利用しており、CLI 用の別実装を作っていない（作れば duplicate detector が検出する）。これにより **CI が `packages/inspection` の実在する第 2 consumer** になり、第 4 acceptance の contract 要件も満たす（ADR §6 / R-07）。

**これらを「N/A」とはしない。** 未配線・未実行として記録し、CI が緑でも充足したことにしない（requirements-baseline §9.5）。

## 3.1 既知のゲート弱点（緑でも保証していない範囲）

| # | 弱点 | 影響 | 是正先 |
|---|---|---|---|
| W-1 | **G2 の実体が `tsc --noEmit`** で、6 package とも実リンター（ESLint 等）を導入していない。設定ファイルも無い | G2 は G3 と同一検査であり、**フォーマット・コード規約の検査は効いていない**。qa-038【2】の "lint・format" 要求を実質満たしていない | follow-up（実リンター導入の要否はユーザー判断） |
| W-2 | **phantom dependency**: `node_modules` が hoisted 配置のため、`apps/hub` が宣言していない依存（例: `drizzle-orm`）を import でき typecheck も通る | ADR §2.1 が案 (b) の根拠にした「package 境界での**物理的**強制」がこの linker 設定では弱まる。宣言なき依存が動いてしまう | follow-up。(1) `node-linker=isolated` へ戻す（lockfile 再生成を伴う）(2) import 先が自 package の dependencies に宣言されているかを検査する仕組みを足す |
| W-3 | G9（axe）は**違反注入テストが無い**。「違反 0 件」は確認したが、「違反があれば落ちる」は未確認 | a11y ゲートが実質無効化されていても気づけない | follow-up（意図的違反 fixture の追加） |

## 4. セキュリティ境界の確認

| 項目 | 結果 |
|---|---|
| 認可 deny-by-default | 実装済み。`HF-QA-TENANT-001` 10 件 pass（未認証・越境スコープを拒否） |
| 認可の fail-open 対策（ADR §11.3-3） | `withAuthz()` wrapper 規約は確定。**未 wrap route の静的検出は未実装** → 是正先 P13 後の follow-up |
| secret の取り扱い | 新規 secret 値は保持していない。`.dev.vars` は `.gitignore` 済み。secret 台帳の正本は infrastructure-spec §2 |
| XSS sanitize | Markdown レンダラの sanitize テストあり（`packages/ui`） |
| PII ガード | `apps/hub/src/shared/pii/` に境界実装。admin 限定表示・マスクの contract を提供 |

## 5. 運用 readiness

| 項目 | 状態 |
|---|---|
| エラーバジェット運用 | 手順を ADR §7 に確定（70% 警告 / 100% 凍結）。**実運用は監視設定後** |
| restore drill | 手順は runbook.md に記載。`backup.yml` は**未実装**（P13 後の follow-up として起票が必要） |
| /health | 実装済み・契約テスト 8 件 pass。実 HTTP 疎通はデプロイ後 |
| 外形監視 | **未設定**（ユーザー作業） |

## 6. 総合判定

- **CI 品質ゲートのうち実装済みの 6 種は fail-closed であることを実測で確認した。**
- **未配線 4 種（G6/G7/G8/G11）と backup.yml は未充足**であり、これを緑と見なさない。
- したがって P09 は「**実装済みゲートについては保証、未配線分は未充足として明示**」という条件付き完了とする。
