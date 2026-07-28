---
status: confirmed
layer: feature-design
task: SYS-HEARING-INTAKE-P02
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source: docs/features/feat-hearing-intake/requirements-baseline.md
feature_context_digest: sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data]
---

# feat-hearing-intake アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 の成果物。[requirements-baseline.md](./requirements-baseline.md) の quality_constraints 10 件・acceptance 3 件を実装可能な構造へ具体化する。本書で確定した決定は P05 実装の拘束条件であり、実装が本書と矛盾した場合は実装側を是正する (P05 rollback 規約)。未解決事項 (§10) は P03 独立設計レビューの判定対象である。

## 0. 決定一覧 (索引)

| id | 決定 | 対応する quality_constraint / acceptance |
|---|---|---|
| [AD-1](#1-ad-1-hearing-固有テーブルは本-feature-が定義し共通-ai_jobs-は汎用契約として最初の-consumer-が永続化する) | `hearing_sheets` / 採番・係数は本 feature が所有する。`ai_jobs` は共通契約を保った汎用テーブルとして同じ migration lineage へ載せる | 全件の前提 |
| [AD-2](#2-ad-2-formdata-はテーブルではなく-hearing_sheetsform_json-の値オブジェクトである) | FormData は独立テーブルを持たず `hearing_sheets.form_json` に埋め込む (`salary` を除く 11 項目) | hearing-sheet-entities-and-receipt-number / tenant-scope-d4-new-entities |
| [AD-3](#3-ad-3-受付番号-hs-コード-は-display_code_counters-の同一トランザクション内-increment-で採番する) | HS コードは `display_code_counters` の CAS increment でテナント別連番を発番する | hearing-sheet-entities-and-receipt-number |
| [AD-4](#4-ad-4-ai-キューは共通-ai_jobs-の-kindsheet_generation-を消費するだけで-schema-を複製しない) | feature 固有 AiJob schema / `kind=hearing` を作らない。consumer adapter のみ実装する | ai-queue-pull-type-d5 |
| [AD-5](#5-ad-5-post-apiv1sheets-は-試算-→-snapshot-保存-→-enqueue-を単一トランザクションで実行する) | 試算のサーバ実行・snapshot 保存・AiJob enqueue・採番を 1 トランザクションに束ねる | estimate-server-computed-only / async-ui-pattern-hearing-wizard |
| [AD-6](#6-ad-6-試算は-packagesestimation-の公開-estimatesavings-を単一呼び出しする) | `estimation-adapter/` が公開 `estimateSavings` を 1 回呼ぶだけの入力写像層になる。`packages/estimation` は変更しない | estimate-server-computed-only |
| [AD-7](#7-ad-7-ai-キューの認可は-device-flow-token--scope--role-の-3-条件-and-とし-payload-に-pii-と-secret-を載せない) | pull/complete は Bearer + `aijob:process` scope + workspace-admin 以上。payload に salary/secret を含めない | ai-queue-authz-payload-secret-ban |
| [AD-8](#8-ad-8-s10-s12-は共通部品を消費し独自実装を持たない) | StepWizard / MarkdownView / DataTable を `packages/ui` から消費する | wizard-common-component-qa022 / markdown-sanitize-sec7 |
| [AD-9](#9-ad-9-新規-rest-資源は-packagesschemas-の-zod-単一ソースへ登録し認可単一ミドルウェア配下に置く) | sheets / ai-jobs の契約を zod 単一ソースへ追加し、deny-by-default MW 配下に置く | b1-zod-single-source-authz-mw / authz-single-mw-role-table |

---

## 1. AD-1: hearing 固有テーブルは本 feature が定義し、共通 `ai_jobs` は汎用契約として最初の consumer が永続化する

### 判断

`hearing_sheets` / `display_code_counters` / `tenant_coefficients` は
`packages/db/schema/hearing-intake/` に本 feature が定義する。`ai_jobs` も同じ migration で
初めて永続化するが、feature 固有の列や `kind=hearing` は持たせず、共通 D5 contract の
3 kind (`sheet_generation` / `feedback_response` / `doc_draft`) を保持する。

アプリ側の共通 queue boundary は `apps/hub/src/shared/aijob/` が owner のままであり、
hearing は `ai-job-adapter/` から consumer として接続する。物理テーブルを最初の consumer の
write scope に置くことと、共通 contract を feature 側へ複製することは別である。

### 根拠

- `packages/db/schema/index.ts` は Studio 拡張 feature が
  `packages/db/schema/{studio-feature}/` に自身のテーブルを定義し、単一 migration lineage へ
  統合する契約を明記している。
- P05 の write scope は `packages/db/schema/hearing-intake/` を含む。
- normative closure が禁止するのは feature 固有 AiJob schema / `kind=hearing` の複製であり、
  汎用 `ai_jobs` の最初の永続化を禁止していない。
- `packages/db` の tenant 分離・guarded write・migration lineage をそのまま再利用でき、
  別 feature の完了を待たず P1 slice を閉じられる。

### 帰結: port と adapter の関係

| 層 | 置き場所 | 責務 |
|---|---|---|
| hearing schema | `packages/db/schema/hearing-intake/schema.ts` | hearing 固有3テーブル + 汎用 `ai_jobs`、D4 scope 列 |
| sheet repository | `packages/db/repository/hearing-intake.ts` | tenant/workspace scope・採番・enqueue の transaction |
| queue repository | `packages/db/repository/hearing-intake-queue.ts` | tenant/workspace scope・claim/complete/fail の CAS |
| shared queue boundary | `apps/hub/src/shared/aijob/` | feature 非依存の公開 contract |
| consumer adapter (本 feature) | `apps/hub/src/features/hearing-intake/ai-job-adapter/` | ai_jobs への enqueue / result 反映 |
| consumer adapter (本 feature) | `apps/hub/src/features/hearing-intake/estimation-adapter/` | 試算の合成とサーバ実行 |
| route handler (本 feature) | `apps/hub/src/app/api/v1/sheets/` | 認可通過後の orchestration |

`packages/db/schema/core/scope.ts` の `TENANT_SCOPE_EXEMPT` に本 feature の 4 テーブルは**追加しない**。すなわち全て `tenant_id` 必須であり、分離テスト (DMDB-T03) の対象に入る (D4)。

---

## 2. AD-2: FormData はテーブルではなく `hearing_sheets.form_json` の値オブジェクトである

### 問題

requirements-baseline §3.1 は scope_in に「HearingSheet/**FormData** エンティティ + 受付番号採番」と書いており、素直に読むと 2 テーブルに見える。しかし backend-spec §2.3 が確定した Studio 拡張 11 テーブルに `form_data` は**存在しない**。

### 判断

FormData は独立テーブルを持たない。`hearing_sheets.form_json` (TEXT) に格納される**値オブジェクト**として設計し、型の正本は `packages/schemas/hearing-intake/` の zod スキーマに置く。

### 根拠

1. テーブルを新設すると backend-spec §2.3 の「Studio 拡張 11」という確定集合が 12 になり、qa-024 の確定を本 feature が一方的に書き換えることになる。
2. `hearing_sheets` は既に `form_json` 列を持ち、これが FormData の格納先として設計されている。
3. FormData は HearingSheet と 1:1 かつライフサイクルが完全に一致し、単独で検索・参照される要件がない。JOIN を増やす利得がない。

### HearingSheet カラム一覧 (backend-spec §2.3 の確定を列単位へ展開)

| 列 | 型 | NULL | 内容・制約 |
|---|---|---|---|
| `id` | TEXT | NOT NULL | PK。ULID (§2.1 qa-031) |
| `tenant_id` | TEXT | NOT NULL | **D4 row-level scope**。repository 層で WHERE 強制注入 |
| `workspace_id` | TEXT | NOT NULL | **D4 row-level scope** |
| `code` | TEXT | NOT NULL | 表示用受付番号 `HS-xxxx`。テナント別連番 (AD-3)。UNIQUE(tenant_id, code) |
| `title` | TEXT | NOT NULL | 一覧の主見出し。`form_json.taskName` から複製する非正規化列 |
| `applicant_user_id` | TEXT | NOT NULL | **認可の所有者判定はこの列のみ**。`form_json.applicant` は表示用で信頼しない (§4.3) |
| `department` | TEXT | NULL | 申請者部門の snapshot。`users.department` の非正規化コピーであり users 列の owner ではない |
| `status` | TEXT | NOT NULL | enum `received / generating / review / completed` (§5.2) |
| `form_json` | TEXT | NOT NULL | FormData の JSON (下表)。**`salary` を除く 11 項目**を格納する (P03 判定・OPEN-2)。提出時点の snapshot で以後不変 |
| `estimate_json` | TEXT | NULL | **サーバ側試算 snapshot** (AD-6)。提出時に確定し以後不変 |
| `ai_job_id` | TEXT | NULL | 最新の `ai_jobs.id`。再生成時は新 job の id で上書き |
| `generated_doc_ids_json` | TEXT | NULL | 生成物 (documents) への参照配列 |
| `build_id` | TEXT | NULL | 対応 Build。**P1 期間は常に NULL**、P2 有効化 migration で backfill (§4.11) |
| `created_at` | INTEGER | NOT NULL | epoch ms。**サーバ時刻のみ** (SEC5) |
| `updated_at` | INTEGER | NOT NULL | epoch ms。サーバ時刻のみ |

### FormData 12 項目 (`form_json` の値オブジェクト。backend-spec §4.3 の実測確定)

| キー | 型 | 用途 | 取り扱い |
|---|---|---|---|
| `taskName` | string | 業務名 | `hearing_sheets.title` へ複製 |
| `company` | string | 会社名 | 表示のみ |
| `applicant` | string | 申請者名 (自由入力) | **表示専用。認可判定に使わない** (改ざん可能) |
| `domain` | string | 業務領域 | 一覧の filter 対象 |
| `issue` | string | 現在の課題 | AI 生成の主入力 |
| `tools` | string | 現在使用中のツール | AI 生成の入力 |
| `hours` | number | 月間工数 (時間) | **試算入力**。zod で 1..160 の整数に制約 (AD-6 の `runsPerYear` 上限由来) |
| `people` | number | 対象人数 | **試算入力**。zod で 1..500 の整数に制約 (同上) |
| `salary` | number | 想定年収 | **PII (SEC4)**。リクエストでのみ受領し試算後に破棄。**`form_json` へ保存しない** (P03 判定) |
| `features` | string | 要望機能 | AI 生成の入力 |
| `output` | string | 期待する出力 | AI 生成の入力 |
| `priority` | string | 優先度 | 表示・並び替え |

**`salary` の取り扱い (SEC4/SEC5 の帰結。P03 判定で確定 — §10 OPEN-2)**:

1. **`form_json` に保存しない**。`POST /api/v1/sheets` のリクエストでのみ受け取り、AD-6 の試算実行に使ったのち破棄する。永続化されるのは試算**結果** (`estimate_json`) だけである。
   - 当初案は「保存はするが暗号化対象外」だったが、`users.salary` が暗号化列であるのに同じ PII が平文 JSON にも存在する状態は SEC4 と整合しない。`hearing_sheets` へ暗号化列を追加する案は qa-024 が確定した列集合を本 feature が書き換えることになり owner 外 (AD-1)。保存しなければ両方の問題が消える。
   - `estimate_json` は提出時確定・以後不変 (AD-6) なので、salary を保持しなくても snapshot の意味は失われない。`regenerate` は AI 生成のやり直しであって試算のやり直しではないため、再計算の必要も生じない。
2. `GET /api/v1/sheets/:id` の応答 DTO に `salary` は存在しない (保存していないため構造的に返せない。§4.3 の「salary 原値は返さない」を満たす)。
3. AiJob の `payload_json` に **`salary` を含めない** (AD-7)。
4. S12 の印刷 DOM に含めない (frontend-spec §3.2)。

---

## 3. AD-3: 受付番号 (HS コード) は `display_code_counters` の同一トランザクション内 increment で採番する

### 判断

`HS-xxxx` の採番は `display_code_counters (tenant_id, kind, next_value)` を PK(tenant_id, kind) として、`POST /api/v1/sheets` のトランザクション内で `next_value` を読み取り + 1 して書き戻す方式を採る。UUID/ULID をそのまま表示用コードに流用しない。

### 根拠

- backend-spec §2.3 は `display_code_counters` を「表示用コード採番 (トランザクション内 increment)」と定義しており、`kind` の値域に `HS` が含まれる。
- §2.1 は「PK は ULID。表示用コード (HS-xxxx 等) は**別列**」と分離を明示している。ULID は時系列ソート可能だが人間が読み上げられず、受付番号としての用途 (問い合わせ時の口頭伝達) を満たさない。

### 並行採番の直列化

同一テナントで同時提出が起きた場合、2 リクエストが同じ `next_value` を読むと HS コードが重複する。これを次の 2 段で防ぐ。

1. **CAS (compare-and-swap) 更新**: `UPDATE display_code_counters SET next_value = :read + 1 WHERE tenant_id = :t AND kind = 'HS' AND next_value = :read` の更新行数が 0 なら再読込してリトライする。`releases` の version 採番 (`packages/db/schema/core/catalog.ts`) と同じ直列化方針を踏襲する。
2. **DB 制約による最終防衛**: `UNIQUE(tenant_id, code)` を張り、CAS をすり抜けた重複を挿入時点で必ず失敗させる。

### 書式

- 形式: `HS-` + 4 桁ゼロ埋め連番 (例 `HS-0001`)。10000 件到達時は桁が自然に伸びる (`HS-10000`) 設計とし、上限で失敗させない。
- スコープ: **テナント別連番**。テナント A の `HS-0001` とテナント B の `HS-0001` は併存する。
- 採番の失敗は提出全体の失敗として扱う (AD-5 の単一トランザクション)。「番号だけ発番されてシートが無い」欠番状態を作らない。

---

## 4. AD-4: AI キューは共通 `ai_jobs` の `kind=sheet_generation` を消費するだけで、schema を複製しない

### 判断 (normative closure の実装形)

- feature 固有の `AiJob` テーブル・zod schema・`kind=hearing` を**新設しない**。
- 消費するのは既存の `ai_jobs` の `kind='sheet_generation'` のみ。
- `payload_json` / `result_json` の中身 (hearing 固有 DTO) だけを `packages/schemas/hearing-intake/` で定義する。
- **queue schema の複製は 0 件**とする。

### 根拠 (早すぎる抽象化の禁止との整合)

`docs/shared-layers.md` §5 は「共通層に第 3 の利用者が現れたときに初めて共通化する (2 回目までは重複を許す)」と定める。ただし `ai_jobs` は**既に共通層として確定済み** (backend-spec §2.3、kind に `sheet_generation/feedback_response/doc_draft` の 3 値が列挙済み) であり、本 feature が新規に抽象化を起こす場面ではない。したがって §5 が禁じる「早すぎる抽象化」には当たらず、逆に**確定済み共通層の複製**こそが禁止対象である。

本 feature が確定してよいのは kind 固有の payload/result DTO までであり、queue 自体の汎化スキーマ (lease 方式・retry 方式・status 語彙) には手を触れない。

### `ai_jobs` の consumer 契約 (既存カラムの消費のみ・列追加なし)

| 列 | 本 feature での値 | 書き手 |
|---|---|---|
| `id` | ULID | Hub (enqueue 時) |
| `tenant_id` / `workspace_id` | sheet と同一値 | Hub (enqueue 時) |
| `kind` | **`'sheet_generation'` 固定** | Hub (enqueue 時) |
| `status` | `queued` → `processing` → `completed` / `failed` / `dead` (§5.5) | Hub (状態機械は共通層の実装) |
| `payload_json` | 下記 payload DTO | Hub (enqueue 時) |
| `result_json` | 下記 result DTO | worker (complete 時) |
| `error` | 失敗理由 | worker (fail 時) |
| `attempt` / `max_attempts` | 共通既定 (max 3) | 共通層 |
| `lease_expires_at` | 共通既定 (10 分 visibility timeout) | 共通層 |
| `claimed_by_token_id` | pull した publisher_token の id | 共通層 |
| `ref_type` | **`'hearing_sheet'` 固定** | Hub (enqueue 時) |
| `ref_id` | `hearing_sheets.id` | Hub (enqueue 時) |

**`ref_type`/`ref_id` は書戻し先の束縛である** (`docs/security-spec-request-controls.md` §96)。worker が書き換えられるのはこの 1 行のみで、job に紐づかない任意の書込 API は開放しない。

### payload DTO (`SheetGenerationPayload`)

```jsonc
{
  "sheet_id": "01J...",          // ref_id と同値 (worker 側の自己検証用)
  "sheet_code": "HS-0042",
  "form": {                      // form_json (salary を含まない 11 項目) をそのまま渡す
    "taskName": "...", "company": "...", "applicant": "...", "domain": "...",
    "issue": "...", "tools": "...", "hours": 40, "people": 5,
    "features": "...", "output": "...", "priority": "..."
  },
  "estimate": {                  // サーバ計算済み snapshot の結果値のみ
    "savedHoursPerYear": 840,       // 40h × 5 人 × 12 ヶ月 × 0.35 (AD-6 の式)
    "savedAmountPerYear": 2520000   // 840h × 3,000 円/h (年収 600 万 ÷ 2,000h)
  }
}
```

- **`salary` と `hourlyRate` を含めない**。年収は PII (SEC4) であり、時給は年収を逆算できるため同等に扱う。削減額 (`savedAmountPerYear`) は S12 で member にも表示される集計値なので機密度が異なる。
- secret・token・接続文字列を一切含めない (SEC8)。

### result DTO (`SheetGenerationResult`)

```jsonc
{
  "generated_sections": {
    "overview": "# 概要\n...",           // Markdown (raw)
    "issue": "...",                      // Markdown (raw)
    "feature_tags": ["請求書処理", "OCR"],
    "estimated_effect": "..."            // Markdown (raw)
  }
}
```

- Markdown は **raw のまま保存**する。sanitize は描画時に共通レンダラで一括担保する (AD-8、SEC7 の「共通レンダラの sanitize で一括担保」に忠実)。保存時 sanitize は「どのレンダラを通っても安全」という保証にならず、sanitize 漏れの検出点を分散させるため採らない。

---

## 5. AD-5: `POST /api/v1/sheets` は「試算 → snapshot 保存 → enqueue」を単一トランザクションで実行する

### 判断

次の 5 操作を 1 つの DB トランザクションに束ね、部分成功を作らない。

```text
BEGIN
  1. display_code_counters を CAS increment  → HS コード確定           (AD-3)
  2. estimation-adapter でサーバ試算を実行   → estimate snapshot 確定  (AD-6)
  3. hearing_sheets を INSERT (status='received', form_json = salary を除く 11 項目, estimate_json)
  4. ai_jobs を INSERT (kind='sheet_generation', status='queued', ref_id=sheet.id)
  5. hearing_sheets.ai_job_id を UPDATE + status='generating'
COMMIT
→ (トランザクション外) 受付通知を notifications へ登録
```

### 根拠

- normative closure が「`POST /api/v1/sheets` は server-side `packages/estimation` の試算を実行し estimate snapshot を保存してから、**同一 transaction で** `sheet_generation` を enqueue する」と規定している。
- 分割した場合の破綻: ①採番だけ成功 → 欠番、②sheet だけ成功 → 永久に「受付」のまま生成されない孤児、③job だけ成功 → 存在しない `ref_id` を指す job。いずれも運用で自動回復できない。

### acceptance との対応

acceptance 1「ウィザード完了で受付番号が発番され『生成中』状態が表示される」は、上記 COMMIT 後の応答 DTO が `{ code, status: 'generating' }` を返すことで満たす。S10 の完了パネルはこの 2 値だけで描画でき、AI の完了を待たない (非同期 UI パターン)。

### 通知をトランザクション外に置く理由

通知登録の失敗で提出全体を巻き戻すと、ユーザーは「送信できなかった」と認識して再送し、重複シートが生まれる。通知は補助経路 (D6: アプリ内通知が正本、メールは補助) であり、失敗しても S11 の一覧で受付を確認できる。

---

## 6. AD-6: 試算は `packages/estimation` の公開 `estimateSavings` を単一呼び出しする

### 問題

normative closure は「server-side `packages/estimation` の **`sheetEstimate`** を実行し」と指定する。しかし実測すると、`packages/estimation/src/index.ts` が公開しているのは次の 7 関数であり、**`sheetEstimate` は存在しない**。

```
calcHourlyRateFromSalary / resolveHourlyRate / calcTimeSaving /
calcSavedAmount / estimateSavings / estimateSeatPlan / estimateRoi
```

`sheetEstimate` は backend-spec §6.2 に**計算式としてのみ**定義されている。

```text
sheetEstimate = 月間工数(hours) × 対象人数(people) × sheet_reduction_rate (既定 0.35)
```

### 判断

本 feature は `packages/estimation` に関数を追加しない。`apps/hub/src/features/hearing-intake/estimation-adapter/` は **公開 `estimateSavings` を 1 回呼ぶだけの入力写像層**とし、計算式を一切持たない。

```text
// estimation-adapter の写像 (擬似コード)
coefficients = tenant_coefficients から取得 (annual_hours=2000, sheet_reduction_rate=0.35 が既定)

result = estimateSavings({
  // 「1 run = 1 人が 1 時間行う業務」と定義する。
  // 年間の延べ作業時間 = 月間工数 × 人数 × 12 ヶ月 が実施回数そのものになる。
  runsPerYear:   form.hours * form.people * 12,
  minutesPerRun: 60,                                   // 1 run の定義に対応する定数
  reductionRate: coefficients.sheet_reduction_rate,
  hourlyRate:    { kind: 'from-salary',
                   // salary は「リクエストの HearingSheetFormInput」から取る。
                   // form_json には保存されないため、この 1 箇所が唯一の参照点である (AD-2 / OPEN-2)
                   annualSalary: request.form.salary, annualHours: coefficients.annual_hours },
})
// result = { savedMinutesPerYear, savedHoursPerYear, hourlyRate, savedAmountPerYear }
```

`estimateSavings` は内部で `resolveHourlyRate` → `calcTimeSaving` → `calcSavedAmount` を順に呼ぶため、adapter 側で 3 関数を手作業で合成する必要はない。

### 式の同値性 (§6.2 との一致)

```text
savedMinutesPerYear = runsPerYear × minutesPerRun × reductionRate
                    = (hours × people × 12) × 60 × rate
savedHoursPerYear   = savedMinutesPerYear / 60
                    = hours × people × 12 × rate
                    = (§6.2 の月次 sheetEstimate) × 12    ✔ 年換算として一致
savedAmountPerYear  = savedHoursPerYear × hourlyRate
```

月次値が必要な画面 (S12 の「月あたり削減時間」) は `savedHoursPerYear / 12` を表示側で導出し、**式を再実装しない**。

### 根拠

- 本 task の scope_out は「`packages/estimation` の package 境界/public contract の再設計 (owner=feat-hub-foundation)」を明示的に除外している。関数追加は public contract の変更そのものであり、本 feature が行えば owner 境界を侵す。
- `packages/estimation/src/estimate.ts` の `estimateSavings` は docstring で「**metrics-tracking と hearing-intake はこの関数を共有し、各自で式を再実装しない**」と本 feature を名指ししている。下位 3 関数を adapter 側で合成し直すことは、この共有層の意図に真っ向から反する。単一呼び出しにすれば「Hub 側の結線層が計算式を持たず package に委譲している」という既存 contract test (`tests/shared-layers/contract.estimation.test.ts`) と同じ形で検証できる。
- **`ESTIMATION_LIMITS` の範囲検査を入力設計側で満たす**。`minutesPerRun` の上限 1440 (= 1 日) は「1 回あたりの所要時間」を想定した値であり、`hours × people × 60` のような月間総分を渡す前提ではない。上の写像では `minutesPerRun` を定数 60 に固定するため、**入力値に関わらず上限に触れない**。代わりに `runsPerYear` (上限 1,000,000・整数必須) が効くので、FormData の zod スキーマ側で次を強制する。

  | 項目 | 制約 | 導出 |
  |---|---|---|
  | `hours` | 1 以上 160 以下の**整数** | フルタイム 1 人月 (160h) を上限とする |
  | `people` | 1 以上 500 以下の**整数** | `12 × 160 × 500 = 960,000 ≤ 1,000,000` を満たす最大の丸い上限 |

  これにより `runsPerYear` は常に整数かつ範囲内となり、`EstimationInputError('out-of-range' / 'not-an-integer')` は入力検証 (zod) の段階で先に弾かれる。試算実行時に範囲エラーが出る経路を残さない。

### SEC5 の担保点

- 試算は **サーバ側でのみ実行**する。クライアントから送られた金額・削減量は一切受け取らず、受け取っても破棄する。
- `estimate_json` は提出時点で確定し、以後**不変**とする。係数 (`tenant_coefficients`) が後日変更されても過去シートの試算値は変わらない (snapshot の意味)。
- S10 ウィザード中の参考表示は「月 {hours}h × {people}人 × 35% (既定係数)」という**時間の概算のみ**とし、**金額を出さない** (frontend-spec §3.2)。金額表示は提出後の S12 でサーバ snapshot だけを正として行う。
- クライアントへ `salary` を渡さない。時給換算はサーバ内で完結する。

---

## 7. AD-7: AI キューの認可は「Device Flow token + scope + role」の 3 条件 AND とし、payload に PII と secret を載せない

### 判断

`POST /api/v1/ai-jobs/pull` と `POST /api/v1/ai-jobs/:id/complete` は、次の 3 条件すべてを満たす場合にのみ許可する。

| 条件 | 検査対象 | 根拠 |
|---|---|---|
| ① Bearer token であること | Device Flow 由来の短命 access token (TTL 15 分)。Web セッション cookie では通さない | SEC8 / requirements-baseline `ai-queue-authz-payload-secret-ban` |
| ② scope に `aijob:process` を含むこと | `publisher_tokens.scopes_json` の 4 値のうち該当スコープ | backend-spec §2.2 |
| ③ 実効 role が workspace-admin 以上であること | workspace-admin は**自テナントのジョブのみ**、provider-admin のみ cross-tenant | backend-spec §4.11 (qa-048 改訂) |

`complete` / `fail` は上記に加えて **claim 者本人であること** (`ai_jobs.claimed_by_token_id` の一致) を要求する。

### 仕様間の矛盾と採用理由

本設計は backend-spec 内部の矛盾を 1 件検出している。

| 箇所 | 記述 | 日付 |
|---|---|---|
| §3.3 認可マトリクス | `ai-jobs pull/complete` は **provider-admin のみ** (workspace-admin は「—」) | 未改訂 |
| §4.11 表 + 注記 | pull は **workspace-admin にも開放** (自テナント限定)。「qa-048 で改訂・2026-07-18 中立再確認」 | 2026-07-18 |

**§4.11 を採用する。** 理由は (a) qa-048 で明示的に改訂された旨が本文に書かれており日付が新しい、(b) `system-spec/spec-state.json` の qa-048 回答も「AiJob pull 権限開放」を確定内容として記録している、(c) 開放の目的が「提供者単一障害点の解消」と明記されており、provider-admin 限定に戻すと目的が失われる。

§3.3 の表は更新漏れとみなし、§10 OPEN-4 として backend-spec 側の是正を要求する。**本 feature は §3.3 を書き換えない** (owner 外のため)。

### payload に載せないもの (SEC8)

- secret・API token・接続文字列・暗号鍵
- `form.salary` (PII、AD-2)
- 時給 (`hourlyRate`。年収を逆算可能)

### cross-tenant pull の監査

provider-admin が他テナントのジョブを pull した場合、`audit_events` へ **tenant を明示して** 記録する (D4 の唯一の明示例外、backend-spec §4.11)。action は `provider.cross_tenant_access`。`ai_job.complete` は role を問わず全件監査対象 (§3.8)。

### 状態機械の永続化と消費

`queued → processing (lease 10 分) → completed / failed / dead` (§5.5) は
`packages/db/repository/hearing-intake-queue.ts` が共通行契約として永続化する。feature 側は
`ai-job-adapter/` で DTO を変換し、`dead` 到達時だけ HearingSheet を `received` へ戻す。
claim token・tenant・`ref_type/ref_id` の一致は repository の CAS
(compare-and-swap = 条件が一致した行だけ更新する処理) で強制する。

---

## 8. AD-8: S10-S12 は共通部品を消費し、独自実装を持たない

### S10-S12 画面構成表

| 画面 | route | 最小 role | 消費 API | 共通部品 | 主要素 |
|---|---|---|---|---|---|
| **S10** ヒアリングウィザード | `/sheets/new` | member | `POST /api/v1/sheets` | `StepWizard` (packages/ui) | 4 ステップ + 完了パネル |
| **S11** シート一覧 | `/sheets` | member | `GET /api/v1/sheets` | `DataTable` | 6 列 / モバイルはカード |
| **S12** シート詳細 | `/sheets/[id]` | member | `GET /api/v1/sheets/:id`、admin: `PATCH`・`POST :id/regenerate` | `MarkdownView` | 生成本文 + snapshot + メタ |

### S10: 4 ステップの割り当て (FormData 12 項目)

| step | 項目 | 検証 |
|---|---|---|
| Step1 基本 | `taskName, company, applicant, domain` | step 単位 validation (必須) |
| Step2 現状 | `issue, tools, hours, people, salary` | `hours`/`people`/`salary` は数値範囲検査 |
| Step3 要望 | `features, output, priority` | 必須 + enum |
| Step4 確認 + 試算 | 全項目の確認表示 | **時間削減の参考表示のみ・金額なし** (AD-6) |

- 進捗表示・戻る/次へ・キーボード操作・step 単位 validation は `packages/ui` の `StepWizard` (`StepWizardProps` / `WizardStep`) が担保する。**独自ウィザードを実装しない** (qa-022)。
- 途中状態は `sessionStorage` に保持し、誤離脱ダイアログを出す。
- 提出成功時の完了パネルに `HS コード` / `生成中` チップ / 「シートを見る」「続けて作成」を表示する。「パイプラインを見る」は **P1 期間は非表示** (§4.11 phase 境界)。
- モバイルは 1 step = 1 画面 (frontend-spec パターン P10)。

### S11: 一覧の列と権限

| 列 | 出典 |
|---|---|
| status (チップ) / HS コード・title / domain・department / people・hours / applicant / updated_at | `GET /sheets` の item DTO |

- filter: `status` / `department` / `q` (全文検索)。cursor ページング (`?cursor=&limit=1..100`)。
- **member/owner は `applicant_user_id = principal.user_id` の自分のシートのみ、workspace-admin は自テナント全件**を API が返す。**クライアント側で権限外の行を除外する実装は禁止**する (frontend-spec §145)。
- status=`generating` の行があるときのみ 30 秒ポーリングする。
- `received` の表示ラベルは全画面共通で「**受付**」とする (mock の「下書き」は旧表示)。
- グルーピング (status 別) はクライアント側で行う。

### S12: 詳細の構成と admin 限定操作

| 領域 | 内容 |
|---|---|
| ヘッダ | `code / status / title / applicant / department / created_at / AI 生成表示` |
| 本文 | 生成 4 セクション「概要」「現在の課題」「推奨機能タグ」「想定削減効果」 |
| メタ | 元入力 snapshot (`form_json`、salary 除外) / 試算 snapshot (`estimate_json`) / 対応 Build・PublishRequest 参照 |
| admin 領域 (右側) | status 変更 (`PATCH`) / 再生成 (`POST :id/regenerate`)。**member には非表示かつ API でも拒否** |

- **Markdown sanitize (SEC7)**: 生成本文は `packages/ui` の `MarkdownView` + `markdownSanitizeSchema` を通してのみ描画する。feature 側で `dangerouslySetInnerHTML` を使わない。sanitize schema を feature 独自に上書きしない。これで acceptance 3 を満たす。
- **PDF 出力**: 独立した非認可 API を作らない。認可済み詳細 DTO と同じ表示モデルを print stylesheet で A4 化し `window.print()` を呼ぶ。`salary` 原値・非表示フィールド・操作ボタンを印刷 DOM に含めない。
- 「構築パイプラインへ」ボタンは **P1 期間は非表示**。P2 有効化後に `build_id` が入った行でのみ表示する。
- 2 カラム (`1fr 300px`) はモバイルで縦積みへ (パターン P5)。

### a11y 検査範囲 (P04 へ引き継ぐ観点)

- S10/S11/S12 の 3 画面を axe 検査対象とする。
- 非同期 UI の状態遷移テスト観点: `received → generating` の完了パネル表示、`generating` 中のポーリングと停止、`dead → received` の差戻し表示、status チップの `aria-live` 通知。

---

## 9. AD-9: 新規 REST 資源は `packages/schemas` の zod 単一ソースへ登録し、認可単一ミドルウェア配下に置く

### 判断

sheets 系 5 エンドポイントの request/response 契約を `packages/schemas/hearing-intake/` に zod で定義し、`contract-registry.ts` の `contractSchemaNames` へ登録する。手書きの型定義・OpenAPI の二重管理を作らない (B1)。

### 登録する契約名

| 契約名 | 対応 |
|---|---|
| `HearingSheetFormInput` | ウィザードが送る **12 項目** (`salary` を含む)。リクエスト境界でのみ存在する (AD-2) |
| `HearingSheetFormSnapshot` | `form_json` に保存する **11 項目** (`salary` を含まない)。`HearingSheetFormInput.omit({ salary: true })` として導出し、二重定義しない (AD-2 / OPEN-2) |
| `HearingSheetEstimate` | estimate snapshot (AD-6) |
| `CreateSheetRequest` / `CreateSheetResponse` | `POST /sheets` |
| `SheetListItem` | `GET /sheets` の item DTO |
| `SheetDetail` | `GET /sheets/:id` の DTO (salary 除外) |
| `UpdateSheetStatusRequest` | `PATCH /sheets/:id` |
| `SheetGenerationPayload` / `SheetGenerationResult` | ai_jobs の kind 固有 DTO (AD-4) |

`packages/schemas/src/contract-registry.ts` は「業務ドメイン固有の schema は含めない (本 package の責務は共通プリミティブと共通エンベロープまで)」と明記しているため、hearing 固有契約は **`packages/schemas/hearing-intake/` という別サブパッケージ**へ置き、共通 registry の責務境界を壊さない。`auth-tenancy/` が同じ形で先行している。

### 認可の配置

- 全 5 エンドポイントを `apps/hub/src/lib/authz/` の `withAuthz()` 配下に置く (feat-auth-tenancy AD-4 が確立した単一集約点)。feature 側で個別に role 判定を書かない。
- deny-by-default: 認可表 (§3.3) に行がない操作は拒否される。
- 本 feature が使う行:

| 操作 | member | owner | workspace-admin | provider-admin |
|---|---|---|---|---|
| sheets 作成/自分の閲覧 | ✓ | ✓ | ✓ | ✓ |
| sheets status 変更・再生成 | — | — | ✓ | ✓ |

- エラー形式は RFC 9457 (`application/problem+json`)。zod 検証失敗は `errors[]` へフィールド単位で格納する。
- レート制限は一般 API 枠 (120 req/分) を用い、本 feature で方式・鍵を変更しない。

---

## 10. レビュー・検証の付録

解決済み論点、acceptance 対応表、消費した正本、再検証手順は
[architecture-review-and-validation.md](./architecture-review-and-validation.md) に分離した。
本文と付録を合わせて P02 の設計記録を構成する。
