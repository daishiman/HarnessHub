---
status: confirmed
layer: feature-test-design
task: SYS-HEARING-INTAKE-P04
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source: docs/features/feat-hearing-intake/design-review-notes.md
feature_context_digest: sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data]
---

# feat-hearing-intake テストファースト設計

> **位置づけ**: P04 の成果物。[architecture-decision-record.md](./architecture-decision-record.md) と [architecture-decisions-application.md](./architecture-decisions-application.md) (P02)、[design-review-notes.md](./design-review-notes.md) (P03) で確定した設計を、**P05 実装の受入契約**として実行可能なテスト ID へ写像した記録。ここで定義した ID の主体を P05 が実装し、P06 が実行し、P07/P10 は**実行された証拠のみ**を裁定する (task spec の Trace rule)。

## 0. サマリ

| 項目 | 値 |
|---|---|
| テスト配置 | `apps/hub/tests/hearing-intake/` (7 ファイル) |
| P04 で定義したテスト ID | **90 件 (全件実行可能)** |
| P05/P06 で追加した service/HTTP/page 結合テスト | **8 件** |
| 最終実行結果 | **98 件 pass / todo・skip 0 件** |
| 実行コマンド | `pnpm --filter @harness-hub/hub exec vitest run tests/hearing-intake/` |

### 契約層と受入層

P04 では既存共通層を検証する50件と、P05実装を対象にする40件を先に定義した。P05/P06で
40件を全て実テストへ昇格し、service・HTTP・page composition の結合テスト8件も追加した。

最終状態でも次の2層は維持する。

| 層 | 対象 | 状態 | 意図 |
|---|---|---|---|
| **契約層 (50 件)** | 共通層の実測値・写像式・認可表・部品構成 | pass | P05 が設計から外れた瞬間に既存テストが赤くなる |
| **受入層 (40 件 + 結合8件)** | P05 が書いた repository / route / adapter / 画面 | pass | 実装の往復、失敗時動作、画面構成を確認する |

契約層はすべて **Goodhart 対策の生存確認**を同居させている (走査 0 件で緑にしない・空 DOM で緑にしない・検出器が実際に発火することを変異入力で確認する)。

---

## 1. 配置と、task spec からの逸脱 (承認条件 C-2)

| 項目 | task spec の宣言 | 実際の配置 | 理由 |
|---|---|---|---|
| テストスタブ | `apps/hub/src/features/hearing-intake/__tests__/` | **`apps/hub/tests/hearing-intake/`** | `apps/hub/vitest.config.ts` の `include` は `tests/**/*.{test,spec}.{ts,tsx}` のみ。spec の宣言先に置くと **P06 が実行できず**、Trace rule (P06 executes them) を構造的に破る |

- 根拠: design-review-notes.md §5 R-7 / 承認条件 C-2。
- 先行事例: `apps/hub/tests/auth-tenancy/`、`apps/hub/tests/a11y/`、`apps/hub/tests/shared-layers/` がすべて同じ配置。
- `src/**` はカバレッジ計測対象 (`coverage.include`) であり、テストを置く場所ではない。
- **この逸脱は P04 の裁量ではなく P03 の承認条件**である。P07/P10 は spec の path 文字列ではなく「P06 が実行できたか」で判定すること。

### ファイル構成

| ファイル | テストカテゴリ | ID 接頭辞 | 実行 |
|---|---|---|---|
| `receipt-number.test.ts` | 受付番号発番 | `HI-CODE-` | 10 |
| `ai-queue-contract.test.ts` | AI キュー認可・consumer 契約 | `HI-QUEUE-` / `HI-SEC8-` | 25 |
| `markdown-sanitize.test.ts` | Markdown sanitize | `HI-SEC7-` | 9 |
| `estimation-adapter.test.ts` | 試算のサーバ計算限定 | `HI-EST-` | 12 |
| `a11y-screens.test.tsx` | S10-S12 の axe a11y | `HI-A11Y-` | 17 |
| `schema-contract.test.ts` | zod 入出力検証・D4 スコープ列 | `HI-SCHEMA-` / `HI-D4-` | 17 |
| `service-http-adapter.test.tsx` | service / HTTP / adapter / page 結合 | `HI-SVC-` / `HI-HTTP-` / `HI-ADAPTER-` / `HI-PAGE-` | 8 |

---

## 2. 5 テストカテゴリの合否基準

task spec の Required evidence が求める 5 カテゴリを、**合格条件・不合格条件・判定方法**の 3 点で定義する。

### 2.1 受付番号発番 (`HI-CODE-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-3: `display_code_counters` の CAS (compare-and-swap = 期待値と一致したときだけ書き換える更新) による採番 |
| **合格条件** | ① 書式が `HS-` + 4 桁ゼロ埋めで 10000 以降は桁が伸びる ② 同一テナント内で連番 ③ テナント間で番号が併存する (グローバル連番でない) ④ 同一 `next_value` を読んだ並行要求で重複コードが発行されない ⑤ リトライ上限で例外を投げ、欠番を残さない |
| **不合格条件** | 上限到達で採番が失敗する / 競合時に同じコードを 2 回返す / 採番だけ成功してシートが無い状態が残る |
| **判定方法** | `FakeCounterStore` (CAS の updated 行数 0 が競合負けを表す最小模型) に対する決定的テスト。実 DB 版は `HI-CODE-101〜105` で P06 へ引き継ぐ |
| **実行 ID** | `HI-CODE-001` 〜 `005` |
| **受入 ID** | `HI-CODE-101`〜`105` (実 DB トランザクション・`UNIQUE(tenant_id, code)`・単一トランザクション・欠番なし・通知はロールバック対象外) |

### 2.2 AI キュー認可 (`HI-SEC8-*`) と consumer 契約 (`HI-QUEUE-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-4 (共通 `ai_jobs` の `kind='sheet_generation'` 消費) / AD-7 (3 条件 AND 認可・payload の secret/PII 禁止) |
| **合格条件** | ① `apps/hub/src` と `packages/schemas/src` に queue schema の複製が **0 件** ② 検出器が変異入力で発火する ③ 正当な消費コードを誤検出しない ④ payload に `salary`/時給/secret 系のキーが 0 件 ⑤ Bearer token・`aijob:process` scope・workspace-admin 以上の **3 条件すべて**を満たすときのみ pull 許可 ⑥ workspace-admin は自テナントのみ、provider-admin だけ越境可 ⑦ enqueue→claim→complete で `result_json` が書戻される ⑧ claim 者以外の complete が拒否される |
| **不合格条件** | feature 固有 `AiJob` テーブル・`kind='hearing'` の新設 / 3 条件のうち 1 つでも欠けた要求が通る / payload に年収または時給が載る / 他テナントの job を claim できる |
| **判定方法** | ①〜③ は既存ソースの静的走査 (宣言形のみを検出。`job.status === 'processing'` のような**参照**は消費であって複製ではないため除外)。⑤⑥ は **既存の `src/lib/authz/decide.ts` を直接呼ぶ実測**。④⑦⑧ は AD-4 の参照実装と `FakeAiJobQueue` |
| **実行 ID** | `HI-QUEUE-001`〜`007`、`HI-SEC8-001`〜`009` |
| **受入 ID** | `HI-QUEUE-101`〜`105`、`HI-SEC8-101`〜`104` |

**`HI-SEC8-009` は意図的に「通る」ことを固定している。** authz の `selfOnly` は *user* 単位の本人性で、workspace-admin 以上は他人の資源にも及ぶ設計 (`decide.ts` L92-96)。つまり「別 worker が claim 中の job を admin が complete する」要求は**認可層を通過する**。AD-7 が要求する `claimed_by_token_id` 一致は認可規則ではなく **job 行の前提条件**であり、adapter 側で落とさなければならない。この非対称を明示しないと、P05 が「authz を通したから安全」と誤読する。対になる検証が `HI-QUEUE-005`。

### 2.3 Markdown sanitize (`HI-SEC7-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-4 / AD-8: 生成本文は raw 保存し、sanitize は描画時に共通レンダラ (`MarkdownView` + `markdownSanitizeSchema`) で一括担保する (SEC7 / acceptance 3) |
| **合格条件** | ① `<script>` が描画結果に残らない ② `onerror`/`onload` が残らない ③ `javascript:` スキームが残らない ④ **正常な Markdown は描画される** ⑤ 外部リンクに `rel="noopener noreferrer"` が付く ⑥ feature 側が sanitize schema を上書きしていない |
| **不合格条件** | 描画経路に `dangerouslySetInnerHTML` が現れる / schema を feature 独自に差し替える / 何も描画しないことで危険文字列が出ない状態 |
| **判定方法** | `renderToStaticMarkup(MarkdownView)` の出力文字列を直接検査。④ は **Goodhart 対策**で、空出力による自動緑化を防ぐ |
| **実行 ID** | `HI-SEC7-001`〜`006` |
| **受入 ID** | `HI-SEC7-101`〜`103` (S12 が同経路のみを使う・生成 4 セクション全部が同経路・印刷 DOM も sanitize 済み) |

### 2.4 試算表示のサーバ計算限定 (`HI-EST-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-6: `packages/estimation` の公開 `estimateSavings` を**単一呼び出し**し、式を再実装しない (SEC5) |
| **合格条件** | ① AD-6 の写像が backend-spec §6.2 の `sheetEstimate` の年換算と一致 ② 任意入力で `月次式 × 12` と一致 ③ `minutes_per_run` (15) を誤配線すると値が 1/4 になることを固定 (**承認条件 C-1**) ④ `minutesPerRun` は定数 60 なので `ESTIMATION_LIMITS` の上限 1440 に触れない ⑤ zod 上限 (`hours` 1..160 / `people` 1..500) が `runsPerYear` 上限 1,000,000 を必ず満たす ⑥ 上限超過は `EstimationInputError` で拒否 ⑦ 整数制約は zod 側で独立に必要 |
| **不合格条件** | feature 側で削減時間・削減額の式を再実装する / クライアント送信の金額を採用する / `minutesPerRun` に `tenant_coefficients.minutes_per_run` を渡す |
| **判定方法** | `@harness-hub/estimation` の公開 API に対する実測。参照実装 `sheetEstimateMonthlyHours` を式から直接書き、写像経由の結果と突き合わせる (同じ関数を 2 回呼んで一致を見る形にしない) |
| **実行 ID** | `HI-EST-001`〜`007` |
| **受入 ID** | `HI-EST-101`〜`105` |

**承認条件 C-1 の実装が `HI-EST-003`。** `tenant_coefficients.minutes_per_run` (既定 15) と AD-6 の `minutesPerRun` (60) は**同名異義**で、取り違えても例外にならず「もっともらしい小さい値」(正解の 1/4) が出る。型検査でもランタイム検証でも捕まらないため、この差分を数値として固定したテストが唯一の検出点になる。

### 2.5 axe a11y (`HI-A11Y-*`)

| 項目 | 内容 |
|---|---|
| **対象** | AD-8: S10/S11/S12 は共通部品を消費し独自実装を持たない (qa-018 / qa-022 / WCAG 2.2 AA) |
| **合格条件** | ① AD-8 が指定した部品を AD-8 が指定した構成で組んだ DOM の axe 違反が **0 件** ② 全入力欄が `label[for]` と結び付く ③ S10 確認ステップに金額表記が出ない (SEC5) ④ S11 の 6 列と状態チップが描画される ⑤ `received` の表示ラベルが全画面共通で「受付」(旧表示「下書き」を使わない) ⑥ S12 の生成 4 セクションが描画され `salary` 原値が現れない |
| **不合格条件** | 違反 1 件以上 / DOM が空 / ラベル直書きで状態語彙辞書を迂回する / 確認ステップに金額を出す |
| **判定方法** | `renderToStaticMarkup` → jsdom へ載せ替え → `axe.run(document)`。**部品単体の検査は `packages/ui` の HF-QA-A11Y-001 が担うので重複させず、「組み合わせ」を検査対象にする** |
| **実行 ID** | `HI-A11Y-001`〜`007` |
| **受入 ID** | `HI-A11Y-101`〜`110` (実画面 3 枚・非同期状態遷移・ポーリング停止・dead 差戻し・`aria-live`・admin 領域の非表示・権限外行のサーバ側除外・印刷 DOM) |

**P05 実装前に組み合わせを検査する意味**: ここで違反が出るなら、P05 の画面も必ず違反する。つまり AD-8 の**部品選定そのものが誤り**だったことになり、P05 着手前に P02 へ差し戻すべき状態を検出できる。

---

## 3. Normative evidence の対応 (task spec 必須項目)

task spec の Mandatory evidence が列挙する 6 項目に、それぞれ**実行済みの**テスト ID を割り当てる。未割当 0 件。

| # | Normative evidence | 実行済みテスト ID | 検証の実体 |
|---|---|---|---|
| 1 | `kind=sheet_generation` | `HI-SEC8-001`、`HI-QUEUE-002`、`HI-QUEUE-003` | enqueue 行の `kind`/`ref_type` 固定値一致 + feature 固有 kind の新設を検出器で禁止 |
| 2 | shared queue consumer | `HI-QUEUE-001`、`HI-QUEUE-002` | `apps/hub/src` + `packages/schemas/src` の静的走査で複製 0 件。検出器の生存を変異入力で確認 |
| 3 | sheetEstimate server execution | `HI-EST-001`、`HI-EST-002` | AD-6 の写像結果 = backend-spec §6.2 の式 × 12。式の再実装を許さない |
| 4 | estimate snapshot | `HI-SEC8-002`、`HI-SEC8-004` | payload に載る `estimate` は**サーバ計算済みの結果値のみ**で、原値 (`salary`) を含まない |
| 5 | tenant/role | `HI-SEC8-005`〜`007`、`HI-SEC8-008`、`HI-QUEUE-006`、`HI-D4-001`〜`004` | 既存 `decide()` の実測 + テナント越境の遮断 + 4 テーブルのスコープ列 |
| 6 | enqueue/complete round-trip | `HI-QUEUE-004`、`HI-QUEUE-005`、`HI-QUEUE-007` | queued → processing → completed の往復と `claimed_by_token_id` 一致、dead → `received` 差戻し |

---

## 4. workstream 別の対応

| workstream | task spec の change 宣言 | 対応テスト |
|---|---|---|
| Frontend | S10-S12 の axe a11y + 非同期 UI 状態遷移 | `HI-A11Y-001`〜`007` (実行) / `HI-A11Y-101`〜`110` (受入) |
| Backend | 受付番号の一意性 + AI キュー pull/書戻し認可 (SEC8) | `HI-CODE-*` / `HI-SEC8-*` |
| API | HearingSheet/FormData と ai_jobs consumer の zod 入出力検証 | `HI-SCHEMA-001`〜`005` / `HI-SCHEMA-101`〜`105` |
| Data | `tenant_id`/`workspace_id` スコープ列の分離 (D4) | `HI-D4-001`〜`004` / `HI-D4-101`〜`103` |
| Security | 試算のサーバ計算限定 (SEC5) + Markdown sanitize (SEC7) | `HI-EST-*` / `HI-SEC7-*` |
| Quality | P04 の合否基準を P06 実行対象へ整理 | 本文書 §2 と §6 |
| Infrastructure / Operations | N/A | — |

---

## 5. 設計判断: なぜこの形のテストにしたか

### 5.1 参照実装をテストファイル内に置く

`FakeCounterStore` / `FakeAiJobQueue` / `buildEnqueueRow` / `toSavingsInput` は、P05 の実装が満たすべき振る舞いを**実行可能な形で書いた仕様**である。自然言語の合否基準だけでは「実装がそれを満たしたか」を機械判定できない。P05 は実装後、これらを import 元に差し替えて同じアサーションを通す。

### 5.2 検出器には必ず生存確認を付ける

静的走査・禁止キー検査・axe 検査はいずれも「対象が空なら合格」に退化する。そこで各検出器に対し、

- 走査対象が 1 件以上あること (`HI-QUEUE-001`)
- 変異入力で実際に発火すること (`HI-QUEUE-002`、`HI-SEC8-003`)
- 正当な入力を誤検出しないこと (`HI-QUEUE-003`)
- DOM が実際に描画されていること (`HI-A11Y-001`、`HI-SEC7-004`)

を同居させた。「0 件」が「検査していない」の言い換えにならないようにするためである。

### 5.3 既存コードを直接呼べる箇所はモックしない

認可 (`HI-SEC8-005`〜`008`) は `src/lib/authz/decide.ts` を直接呼ぶ。共通プリミティブ (`HI-D4-002`) は `@harness-hub/schemas` の実 schema を呼ぶ。試算 (`HI-EST-*`) は `@harness-hub/estimation` の公開 API を呼ぶ。模型に置き換えると「模型が設計通り」を確認するだけになり、実装との乖離を検出できない。

### 5.4 既存テストと重複させない

- role マトリクスの網羅は `tests/auth-tenancy/authz-matrix.test.ts` が既に担う → 本 feature は **3 条件 AND の同時成立**と**feature が authz 表を増やさないこと** (`HI-SEC8-008`) に限定。
- 部品単体の axe は `packages/ui` の HF-QA-A11Y-001 が担う → 本 feature は **S10-S12 の組み合わせ**に限定。

---

## 6. P06 への引き継ぎ

### 実行コマンド

```bash
pnpm --filter @harness-hub/hub exec vitest run tests/hearing-intake/
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .
```

### 昇格手順

1. 対応する40件を全て実行テストへ昇格し、参照先をP05実装へ差し替えた。
2. 契約層50件もそのまま残し、設計との整合を継続検査する。
3. 現在 `it.todo` は0件である。

### P05 の entry gate (承認条件 C-3)

**OPEN-1 は解消済み。** `packages/db/schema/index.ts` の Studio extension 契約と P05 write scope に従い、
`packages/db/schema/hearing-intake/` へ hearing 固有3テーブルと汎用 `ai_jobs` を追加した。
feature 固有 `kind=hearing` は作らず、共通 boundary の重複検出ゲートも pass している。

---

## 7. 検証と参照

### 実行結果 (P06 最終)

```text
 Test Files  7 passed (7)
      Tests  98 passed (98)
```

### 消費した正本

| 正本 | 参照箇所 |
|---|---|
| `docs/features/feat-hearing-intake/architecture-decision-record.md` | AD-1〜AD-9 |
| `docs/features/feat-hearing-intake/architecture-decisions-application.md` | AD-6〜AD-9 の詳細 |
| `docs/features/feat-hearing-intake/design-review-notes.md` | 承認条件 C-1/C-2/C-3、§5 R-4/R-7、§7 P04 引き継ぎ |
| `docs/backend-spec.md` | §2.3 (テーブル)、§4.3 (sheets API)、§4.11 (AiJob 権限)、§5.2 (status)、§6.2 (`sheetEstimate`) |
| `apps/hub/src/lib/authz/{rules,decide,types}.ts` | 認可の実測対象 |
| `packages/estimation/src/{estimate,validation}.ts` | 試算の実測対象 |
| `packages/ui/src/{components,i18n}/` | S10-S12 の部品と状態語彙辞書 |
| `packages/schemas/src/{primitives,envelope,contract-registry}.ts` | スコープ列・RFC 9457・登録簿の責務境界 |

### acceptance 対応表

| acceptance | 実行済み | 受入 (P05 後) |
|---|---|---|
| ウィザード完了で受付番号が発番され「生成中」状態が表示される | `HI-CODE-001`〜`005`、`HI-A11Y-004` | `HI-A11Y-104`、`HI-CODE-101`〜`104` |
| AI キューのジョブが pull→書戻しで完結しサーバ側 AI 課金が発生しない | `HI-QUEUE-001`〜`007`、`HI-SEC8-005`〜`009` | `HI-QUEUE-101`〜`105`、`HI-SEC8-101`〜`104` |
| シート本文の Markdown が sanitize 済みで描画される (SEC7) | `HI-SEC7-001`〜`006`、`HI-A11Y-007` | `HI-SEC7-101`〜`103` |
