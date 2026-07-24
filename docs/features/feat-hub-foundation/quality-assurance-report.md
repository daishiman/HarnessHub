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
>
> **最新再検証（2026-07-21 18:06 JST）**: 本書の初回計測後に P10 指摘を是正した。以下の古い件数より §7 と `evidence/local-verify-2026-07-21.md` を優先する。

## 1. CI 品質ゲートの実効性確認

各ゲートについて、**正常系で pass すること**と**違反状態で fail すること**の両方を実測した。片方だけの確認は、常時緑になる故障（Goodhart 化）を見逃す。

| ゲート | 正常系 | 違反時 | 実効性 |
|---|---|---|---|
| G1 pnpm 混入検査 | exit 0（違反 0 件） | `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` / `bun.lockb` の 4 種すべてで**非ゼロ終了**を実測 | ✅ 実効あり |
| G1 packageManager pin | exit 0 | pin 無し・`npm@` pin の両方で非ゼロ終了 | ✅ 実効あり |
| G3 typecheck | 全 6 package PASS | `exactOptionalPropertyTypes` 由来の型エラー 5 件を**実際に検出**（P05 中に発生・修正済み） | ✅ 実効あり |
| G4 test | 46 files / 592 tests pass | a11y テストの timeout 故障を検出（下記 §2） | ✅ 実効あり |
| G5 bundle 予算 | 998,715 bytes（0.952 MiB）/ 3 MiB | 閾値 1 KiB で**非ゼロ終了**を実測。未ビルド時も**非ゼロ終了**（fail-closed） | ✅ 実効あり |
| G9 axe a11y | 部品・画面とも違反 0 件 | **両系で違反注入を実測**（2026-07-24）。部品単体は `packages/ui/src/a11y/axe.test.tsx`、画面結合は `apps/hub/tests/a11y/hub-screens.spec.ts` に alt 無し画像の注入テストを恒久化し、`image-alt` 違反の検出を固定（hub 3 tests / ui 30 tests pass） | ✅ 実効あり |
| G10 duplicate / boundary detector | 200 ファイル走査・0 件 | owner 外 export / deep import / 未認可 route / §3 owner artifact 欠落を検出 | ✅ 実効あり |
| G6 secret scan | 191 ファイル走査・検出 0 件 | private key / AWS key / GitHub token / 代入形 API key の 4 種で**検出を実測**。env 参照は誤検出しないことも確認 | ✅ 実効あり |
| G8 OpenAPI / zod drift | snapshot 一致で exit 0 | snapshot を 1 文字ずらすと **exit 1** を実測 | ✅ 実効あり |
| G7 破壊的 DDL | 対象 migrations 不在を明示判定 | migration が存在する場合は script の事前存在検査を行う | ✅ 現 scope は対象なし（fail-open ではない） |
| G11 CWV 定期計測 | **初回実測済み**（2026-07-24 / run 30074457529 / 本番 URL）。LCP 1154ms（予算 2500ms）OK・CLS 0.00（予算 0.1）OK | **TBT 926ms（予算 200ms・INP の lab 代理指標）超過で run が fail** = 劣化を検出して赤くなることを実証 | ✅ 実効あり（CWV good 自体は未達 → 不要 JS 削減の是正を起票） |

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
| G11 CWV | production は稼働済みだが GitHub Variable と実測 run を未確認 | `HUB_PUBLIC_URL` 設定後の定期 run |

> G6 / G8 は当初未配線だったが、**本 phase で配線し実効性まで実測した**（上表）。G6 は `packages/inspection` の公開 API（`defineSecretScanRule` / `runInspection`）を再利用しており、CLI 用の別実装を作っていない（作れば duplicate detector が検出する）。これにより **CI が `packages/inspection` の実在する第 2 consumer** になり、第 4 acceptance の contract 要件も満たす（ADR §6 / R-07）。

G7 は migration が存在しない現 scope では対象なしだが、対象が生じた際は script 存在確認を含め fail-closed で起動する。G11 は「N/A」とせず未実行として記録し、CI が緑でも充足したことにしない（requirements-baseline §9.5）。

## 3.1 既知のゲート弱点（緑でも保証していない範囲）

| # | 弱点 | 影響 | 是正先 |
|---|---|---|---|
| W-1 | ~~G2 の実体が `tsc --noEmit`~~ | **解消**。root と全 6 package の `lint` は Biome を実行し、G3 typecheck と分離した | 完了 |
| W-2 | **phantom dependency**: `node_modules` が hoisted 配置のため、`apps/hub` が宣言していない依存（例: `drizzle-orm`）を import でき typecheck も通る | ADR §2.1 が案 (b) の根拠にした「package 境界での**物理的**強制」がこの linker 設定では弱まる。宣言なき依存が動いてしまう | follow-up。(1) `node-linker=isolated` へ戻す（lockfile 再生成を伴う）(2) import 先が自 package の dependencies に宣言されているかを検査する仕組みを足す |
| W-3 | ~~G9（axe）の違反注入テストが無い~~ | **解消**。alt の無い画像を意図的に与え、`image-alt` 違反を検出することを固定 | 完了 |

## 4. セキュリティ境界の確認

| 項目 | 結果 |
|---|---|
| 認可 deny-by-default | 実装済み。`HF-QA-TENANT-001` 10 件 pass（未認証・越境スコープを拒否） |
| 認可の fail-open 対策（ADR §11.3-3） | `withAuthz()` wrapper 規約 + G10 の未 wrap route 静的検出を実装。公開 `/health` は理由付き exemption |
| secret の取り扱い | 新規 secret 値は保持していない。`.dev.vars` は `.gitignore` 済み。secret 台帳の正本は infrastructure-spec §2 |
| XSS sanitize | Markdown レンダラの sanitize テストあり（`packages/ui`） |
| PII ガード | `apps/hub/src/shared/pii/` に境界実装。admin 限定表示・マスクの contract を提供 |

## 5. 運用 readiness

| 項目 | 状態 |
|---|---|
| エラーバジェット運用 | 手順を ADR §7 に確定（70% 警告 / 100% 凍結）。**実運用は監視設定後** |
| restore drill | `backup.yml` と runbook 手順は実装済み。四半期の実 drill は未実行 |
| /health | 実装・契約テスト・production HTTP 200（全依存 ok）を確認済み |
| 外形監視 | **未設定**（ユーザー作業） |

## 6. 総合判定

- **ローカル適用対象 G1〜G10 は `pnpm verify` で実行され、exit 0。script 欠落時の fail-open も事前存在検査で封じた。**
- **G11 は workflow 実装済みだが production 実測値がなく、月次 SLO とともに未充足**。backup は workflow 実装済みだが実 drill は未実行。
- したがって P09 のローカル品質・セキュリティ・運用 readiness は確認済み。外部時間依存の G11/SLO を pass には読み替えない。

## 7. 最新再検証結果（2026-07-21）

| 項目 | 結果 |
|---|---|
| `pnpm verify` | **exit 0** |
| lint / format | Biome 152 files、diagnostic 0 |
| typecheck | 全 6 package pass |
| test | 46 files / 592 tests pass |
| G10 | 登録 12 層 + §3 運用機構 4 件、200 files、違反 0 |
| G6 | 191 files、finding 0 |
| G8 | 4 tests pass |
| G5 | 998,715 bytes / 3 MiB、pass |
| route authz | 未 wrap fixture は非ゼロ、`withAuthz()` 経由は pass |
| required package script | 欠落・空文字・壊れた package.json は全て非ゼロ |

一次証跡は `evidence/local-verify-2026-07-21.md`、機械可読値は `evidence/{duplicate-scan,shared-layer-ownership,bundle-report}.json` を参照する。
