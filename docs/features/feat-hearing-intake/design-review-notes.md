---
status: confirmed
layer: feature-design
task: SYS-HEARING-INTAKE-P03
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source: docs/features/feat-hearing-intake/architecture-decision-record.md
feature_context_digest: sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data]
---

# feat-hearing-intake 独立設計レビュー記録

> **位置づけ**: P03 の成果物。[architecture-decision-record.md](./architecture-decision-record.md) と [architecture-decisions-application.md](./architecture-decisions-application.md) (P02) の AD-1〜AD-9 を、設計文の主張ではなく **正本仕様と実装コードの実測** に突き合わせて検証した記録。承認可否と、P04 へ引き継ぐ検証要件をここで確定する。設計そのものの修正は P03 の scope 外であり、修正が必要な指摘は P02 の再実行として処理した (§5 に経緯を記録)。

## 0. 判定サマリ

| 項目 | 判定 |
|---|---|
| **総合判定** | **承認 (approved)** |
| P04 への進行 | **可**。C-1/C-2 は実行可能テストへ反映済み |
| P05 への進行 | **可・実装済み**。OPEN-1 は repository の Studio extension 契約と P05 write scope を再確認して解消 (§6) |
| 差し戻し (P02 再実行) | **不要**。レビュー中に検出した設計欠陥 3 件は P02 内で是正済み・再検証済み |

### 承認条件

| id | 条件 | 引き継ぎ先 |
|---|---|---|
| **C-1** | `tenant_coefficients.minutes_per_run` (既定 15) と AD-6 の `minutesPerRun: 60` の**同名異義**による誤配線を、回帰テストで機械的に防ぐこと (§5 R-4) | P04 → P06 |
| **C-2** | P04 のテストスタブは `apps/hub/tests/hearing-intake/` へ置くこと。task spec が宣言する `apps/hub/src/features/hearing-intake/__tests__/` は `apps/hub/vitest.config.ts` の `include` 対象外で**実行されない** (§5 R-7) | P04 |
| **C-3** | Studio 拡張の owner を `packages/db/schema/index.ts` と P05 write scope で再判定し、共通 queue contract を複製せず同一 migration lineage へ載せること | **解決済み** (`schema/hearing-intake/` + shared `aijob` boundary) |

## 1. レビューの方法と独立性の範囲

### 1.1 独立性について (先に明示する)

本レビューは **P02 の実行者と同一のセッションが担当した**。人的に独立した第三者レビューではない。独立性は「別の人が見た」ではなく **「設計文の記述を一切前提にせず、正本仕様と実装コードから事実を再取得して突き合わせた」** ことで担保している。この限界を隠さず記録する。

### 1.2 検証手順

各 AD について、ADR が引用する根拠を**引用先まで遡って実測**した。「ADR にそう書いてあるから正しい」という循環参照を作らないため、以下は全て一次情報から再取得している。

| 検証対象 | 取得方法 | 実測結果 |
|---|---|---|
| Studio 拡張テーブル数 | `docs/backend-spec.md` §2.3 の表を計数 | **11 件** (ADR AD-1 の主張と一致) |
| `packages/db` 実装済みテーブル数 | `grep -c "sqliteTable(" packages/db/schema/core/*.ts` | **19 件** (catalog 6 / publish 4 / identity 6 / security 3)。Studio 拡張は **0 件** |
| `packages/estimation` 公開関数 | `packages/estimation/src/index.ts` の export | **7 件**。`sheetEstimate` は**不在** (ADR OPEN-5 の主張と一致) |
| `ESTIMATION_LIMITS` | `packages/estimation/src/validation.ts:10-33` | `minutesPerRun.max = 1440` / `runsPerYear.max = 1_000_000` かつ整数必須 |
| `packages/ui` 共通部品 | `packages/ui/src/index.ts` の export | `StepWizard` / `MarkdownView` / `markdownSanitizeSchema` / `DataTable` いずれも**実在** |
| 認可表の矛盾 | `docs/backend-spec.md` L129 と L290 | **矛盾を確認** (§4 SEC2 / §6 OPEN-4) |
| テスト実行対象 | `apps/hub/vitest.config.ts` の `include` | `tests/**` のみ。`src/**/__tests__/**` は**対象外** |

## 2. 品質制約 10 件の網羅性検証

`requirements-baseline.md` §5 の 10 件が AD-1〜AD-9 に**過不足なく**割り当てられているかを検証した。未割当 0 件。

| # | quality_constraint id | 担当 AD | 判定 | 備考 |
|---|---|---|---|---|
| 1 | `async-ui-pattern-hearing-wizard` | AD-5 | ✅ | COMMIT 後に `{code, status:'generating'}` を返す設計で、AI 完了を待たない |
| 2 | `ai-queue-pull-type-d5` | AD-4 | ✅ | サーバ側 AI 実行を一切持たない。課金経路が構造的に存在しない |
| 3 | `ai-queue-authz-payload-secret-ban` | AD-7 | ✅ | Bearer + scope + role の 3 条件 AND。payload 禁止項目を列挙 |
| 4 | `markdown-sanitize-sec7` | AD-8 | ✅ | 保存時 raw / 描画時 sanitize の一点集約 |
| 5 | `tenant-scope-d4-new-entities` | AD-1 / AD-2 | ✅ | AD-1 末尾に `TENANT_SCOPE_EXEMPT` へ追加しない明示あり。補足は §2.1 |
| 6 | `hearing-sheet-entities-and-receipt-number` | AD-2 / AD-3 | ✅ | 15 列 + FormData 12 項目 + CAS 採番 |
| 7 | `wizard-common-component-qa022` | AD-8 | ✅ | `StepWizard` 実在を確認済み |
| 8 | `estimate-server-computed-only` | AD-5 / AD-6 | ✅ | 是正後 (§5 R-1) に承認 |
| 9 | `b1-zod-single-source-authz-mw` | AD-9 | ✅ | `auth-tenancy/` サブパッケージの先例に倣う形が実在 |
| 10 | `authz-single-mw-role-table` | AD-9 | ✅ | `apps/hub/src/lib/authz/with-authz.ts` 実在を確認済み |

### 2.1 制約 5 の文言と normative closure の関係 (要注意点・是正不要)

制約 5 と 6 の原文は「HearingSheet/FormData/**AiJob** を含む全新規テーブル」「**AiJob** … は qa-024 で確定したエンティティ」と書いており、素直に読むと本 feature が AiJob テーブルを新設するように見える。

一方 task spec の Normative implementation closure は「feature 固有 AiJob schema や `kind=hearing` を作らず、共通 `ai_jobs` の `kind=sheet_generation` を consumer として使う」と定め、closure 節は「本 task において**先行するあらゆる文言に優先する**」と宣言している。

**判定**: ADR AD-4 の解釈 (新設しない) が正しい。制約 5 の `tenant_id`/`workspace_id` 要求は、`ai_jobs` については**既存共通テーブルが既に満たしている**こと (backend-spec §2.3 の列定義に両方あり) で充足されており、本 feature が新設しないことと矛盾しない。**是正不要**。

## 3. SEC 適合判定

| SEC | 要求 | ADR の担保点 | 判定 |
|---|---|---|---|
| **SEC2** | 新規 API 群は認可単一 MW (deny-by-default) 配下で role×操作許可表に従う。S11/S12 の status 変更は admin 限定 | AD-9: 全 5 endpoint を `withAuthz()` 配下。`PATCH /sheets/:id` と `regenerate` は workspace-admin 以上 | ✅ 適合 |
| **SEC5** | 試算はサーバ計算値の表示専用。クライアント再計算・自己申告を行わない | AD-6: サーバ実行のみ / クライアント送信値は破棄 / `estimate_json` 提出時確定・以後不変 / ウィザード中は**金額を出さず時間の概算のみ** | ✅ 適合 |
| **SEC7** | Markdown は共通レンダラの sanitize で一括担保 | AD-8: `MarkdownView` + `markdownSanitizeSchema` 経由のみ。`dangerouslySetInnerHTML` 禁止・schema の feature 側上書き禁止 | ✅ 適合 |
| **SEC8** | AI キューの pull/書戻しは Device Flow token 保有者に限定。payload に secret を含めない | AD-7: Bearer 限定 (Web セッション cookie を通さない) + `aijob:process` scope + role。payload 禁止項目に secret/`salary`/時給 | ✅ 適合 |

### 3.1 SEC5 の担保が「表示規則」まで降りている点の評価

SEC5 は多くの設計で「サーバで計算する」までしか書かれず、UI 側に金額の推測値が残って実質破られる。本 ADR は AD-6 で **ウィザード中の金額表示自体を禁止** し、金額を出す画面を提出後の S12 (サーバ snapshot のみ) に限定している。これは frontend-spec §3.2 の表示規則と一致しており、**担保として実効性がある**と評価する。

### 3.2 SEC8 の payload 禁止項目に「時給」が入っている点の評価

`hourlyRate` は `salary ÷ annual_hours` であり、`annual_hours` はテナント係数 (既定 2000 と公知) のため、時給から年収が逆算できる。ADR がこれを PII と同等に扱って payload から除外しているのは妥当。**過剰ではない**。

## 4. qa 適合判定

| qa | 要求 | 判定 | 根拠 |
|---|---|---|---|
| **qa-021** | AI 非同期は「受付番号 + 生成中チップ + 完了通知」で統一 | ✅ 適合 | AD-5 応答 DTO + AD-8 完了パネル。`aria-live` 通知まで設計済み |
| **qa-022** | ウィザードは共通部品で担保し独自実装しない。試算はサーバ計算値の表示専用 | ✅ 適合 | AD-8 で `StepWizard` 消費。AD-6 で計算式を adapter に持たせない |
| **qa-023 (B1)** | 新規 REST 資源は zod 単一ソースへ。全て認可単一 MW 配下 | ✅ 適合 | AD-9。共通 registry の責務境界を壊さず別サブパッケージへ置く判断も妥当 |
| **qa-024** | カラム定義の詳細設計は各 feature の P02 で行う。Studio 拡張 11 テーブル | ✅ **適合** | hearing 固有3テーブルと汎用 `ai_jobs` を feature scope 内で同一 migration lineage へ追加し、tenant 分離テストを通過 |

### 4.1 qa-024 を「条件付き」とした理由

qa-024 と `packages/db/schema/index.ts` は、各 Studio feature が自身の
`packages/db/schema/{studio-feature}/` write scope に拡張テーブルを定義する構造を採る。
P05 では `hearing_sheets` / `display_code_counters` / `tenant_coefficients` と、feature 固有列を
持たない汎用 `ai_jobs` を単一 migration lineage へ載せた。4テーブルすべてが tenant 分離ゲートの
対象であり、実DBテストでも越境不可を確認したため条件は解消した。

## 5. 指摘事項

| id | 区分 | 内容 | 処理 |
|---|---|---|---|
| **R-1** | 設計欠陥 | AD-6 初版が `calcTimeSaving` / `resolveHourlyRate` / `calcSavedAmount` を adapter 側で手合成していた。`packages/estimation/src/estimate.ts:49-51` の `estimateSavings` docstring は「**metrics-tracking と hearing-intake はこの関数を共有し、各自で式を再実装しない**」と本 feature を名指ししており、手合成は共有層の意図に反する | **P02 内で是正済み**。`estimateSavings` 単一呼び出しへ変更。再検証済み |
| **R-2** | 設計欠陥 | AD-6 初版は `minutesPerRun` に `hours × people × 60` を渡すため上限 1440 を超過 (40h×5 人 = 12,000 分)。さらに OPEN-3 が提示していた推奨案 (`runsPerYear = people × 12` / `minutesPerRun = hours × 60`) も 40h → **2,400 分で依然超過**しており、推奨案自体が機能しなかった | **P02 内で是正済み**。「1 run = 1 人 1 時間」の写像で `minutesPerRun` を定数 60 に固定し、入力値に依存せず上限に触れない形へ変更 |
| **R-3** | 記述誤り | payload DTO の例が `savedHoursPerYear: 168` (= 40 × 0.35 × 12) で `people` が欠落し、AD-6 の式と不整合だった | **P02 内で是正済み**。840 (= 40 × 5 × 12 × 0.35) / 2,520,000 円へ修正 |
| **R-4** | **承認条件 C-1** | `tenant_coefficients` には `minutes_per_run` (既定 **15**) が実在し、これは metrics-tracking の `savedMinutes = runCount × minutes_per_run` 用の係数である。AD-6 が `estimateSavings` へ渡す `minutesPerRun: 60` とは**別物だが同名**。実装者が善意で係数を配線すると試算が **1/4 に化ける**が、値は正常範囲なのでエラーにならず気付けない | P04 で回帰テスト必須。「係数を注入しても `minutesPerRun` は 60 のまま」を明示的に検証する |
| **R-5** | **解決済み (C-3)** | 初回レビュー時は4テーブルの owner を feat-domain-model-db と誤認していた | `packages/db/schema/index.ts` の Studio extension 契約と P05 write scope を優先し、本 feature 内で実装。共通 queue boundary は複製していない |
| **R-6** | owner 外 | OPEN-4 の backend-spec §3.3 / §4.11 矛盾を実測で確認 (L129 = provider-admin のみ、L290 = qa-048 で workspace-admin へ開放) | ADR の §4.11 採用を**妥当と判定**。§3.3 の是正は backend-spec owner へ差し戻す。本 feature は書き換えない |
| **R-7** | **承認条件 C-2** | P04 task spec の write scope `apps/hub/src/features/hearing-intake/__tests__/` は `apps/hub/vitest.config.ts` の `include: ['tests/**/*.test.ts', ...]` に含まれず、そこへ置いたテストは**永久に実行されない**。Normative closure の Trace rule は「P06 executes them」を要求しており、実行されないスタブはこの rule を構造的に満たせない | `apps/hub/tests/hearing-intake/` を採用する (先行する feat-auth-tenancy の `tests/auth-tenancy/` と同一形)。逸脱として P04 の test-design.md に明記する |

### 5.1 R-1〜R-3 を「差し戻し」ではなく「P02 内是正」として処理した理由

P03 の rollback 規約は「差し戻しと判定された場合、指摘事項を記録し P02 を再実行対象として dev-graph へ差し戻す」と定める。R-1〜R-3 はいずれも **AD の判断そのものではなく、判断を実装へ写像する記述の誤り**であり、AD-6 の結論 (「`packages/estimation` に関数を追加せず既存公開 API でサーバ試算する」) は変わっていない。ADR は P02 完了前 (未コミット) の状態であったため、差し戻しループを回さず P02 の実行内で是正し、是正後の内容に対して本レビューを行った。**設計判断が覆った指摘は 0 件**である。

## 6. OPEN 項目の判定

| id | P02 時点 | P03 判定 |
|---|---|---|
| **OPEN-1** | Studio 拡張の owner が不明確 | **解決済み**。`packages/db/schema/index.ts` の明示契約と P05 write scope に従い、本 feature が hearing 固有3テーブルと汎用 `ai_jobs` の最初の永続化を担当。`kind=hearing` や feature 固有 queue schema は作成していない |
| **OPEN-2** | `form_json.salary` が暗号化対象外。設計者推奨は (b) salary を保存しない | **(b) を承認**。理由: (a) は `hearing_sheets` へ暗号化列を追加することになり qa-024 の確定 13 列集合を本 feature が書き換えるため owner 外。(c) は PII が平文 JSON に残り SEC4 と不整合。(b) なら `estimate_json` に試算結果が残るので snapshot の意味は保たれ、列追加も不要。**帰結の確認**: regenerate は AI 生成のやり直しであって試算のやり直しではなく (`estimate_json` は提出時確定・以後不変 = AD-6 の SEC5 担保点)、salary を保持しなくても機能欠損は生じない。`GET /sheets/:id` が「salary 原値を返さない」(backend-spec §4.3) とも整合する |
| **OPEN-3** | `minutesPerRun` 上限超過 | **解決済み** (R-2)。feat-hub-foundation への上限緩和要求は**不要** |
| **OPEN-4** | backend-spec §3.3 / §4.11 の認可矛盾 | **本 feature としては解決**。§4.11 採用を承認。§3.3 の是正は owner へ差し戻し (R-6) |
| **OPEN-5** | `sheetEstimate` 公開関数が不在 | **解決済み**。`estimateSavings` が normative closure の言う「server-side 試算の実行」の実体である。関数追加は要求しない |

## 7. P04 への引き継ぎ

P04 が定義すべきテスト ID の観点を、本レビューの判定から確定する。

| カテゴリ | 由来 | 必須観点 |
|---|---|---|
| 受付番号発番 | AD-3 | CAS 競合時のリトライ / `UNIQUE(tenant_id, code)` の最終防衛 / テナント別連番の独立性 / 採番失敗時に欠番を残さない |
| AI キュー認可 | AD-7 / SEC8 | Bearer 以外 (cookie) の拒否 / scope 欠落の拒否 / member の拒否 / cross-tenant の provider-admin 限定 / `complete` の claim 者一致 / payload に `salary`・時給・secret が入らない |
| Markdown sanitize | AD-8 / SEC7 | `<script>` / `onerror` / `javascript:` の除去 / feature 側で sanitize schema を上書きしていない |
| 試算サーバ計算限定 | AD-6 / SEC5 | **`estimateSavings` 単一呼び出しで式を再実装していない** / §6.2 の式と一致 / クライアント送信の金額を破棄 / **C-1: `tenant_coefficients.minutes_per_run` (15) を誤配線していない** / `hours`・`people` の zod 制約が `runsPerYear` 上限を守る |
| axe a11y | AD-8 / qa-018 | S10 / S11 / S12 の 3 画面 + 非同期状態遷移 (`received → generating`、ポーリング停止、`dead → received` 差戻し) |
| 共通層 consumer 契約 | AD-4 / normative closure | `kind='sheet_generation'` 固定 / queue schema の複製 0 件 / estimate snapshot の不変性 / tenant・role / enqueue→complete round-trip |

## 8. 検証と参照

### 再検証コマンド

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-hearing-intake
```

### 消費した正本

- `docs/features/feat-hearing-intake/architecture-decision-record.md` (P02 成果物・レビュー対象)
- `docs/features/feat-hearing-intake/architecture-decisions-application.md` (P02 成果物・AD-6〜AD-9 詳細)
- `docs/features/feat-hearing-intake/requirements-baseline.md` (P01 成果物・制約の正本)
- `docs/backend-spec.md` §2.3 / §3.3 / §4.3 / §4.11 / §5.2 / §5.5 / §6.2
- `docs/frontend-spec.md` §3.2 / §6.2、`docs/shared-layers.md` §2 / §5
- `system-spec/00-requirements-definition.md` (D4/D5)、`system-spec/security.md` (SEC2/SEC5/SEC7/SEC8)、`system-spec/database.md` (qa-024)、`system-spec/backend.md` (qa-023 B1/B5)、`system-spec/ui-ux.md` (qa-021)

### 実測した実装

- `packages/db/schema/core/*.ts`、`packages/db/src/drizzle.ts`
- `packages/estimation/src/index.ts` / `estimate.ts` / `validation.ts`
- `packages/ui/src/index.ts`、`packages/schemas/src/contract-registry.ts`、`packages/schemas/auth-tenancy/`
- `apps/hub/src/lib/authz/`、`apps/hub/vitest.config.ts`、`apps/hub/tests/`

### rollback 規約

本レビューは C-1〜C-3 の実装・テスト確認をもって承認済みである。以後いずれかの条件に回帰が
見つかった場合は本書へ理由を追記し、実装起因なら P05、設計判断起因なら P02 を再実行対象として
dev-graph へ差し戻す。
