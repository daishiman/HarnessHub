---
status: confirmed
layer: feature-design
task: SYS-HEARING-INTAKE-P02
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source: docs/features/feat-hearing-intake/architecture-decision-record.md
feature_context_digest: sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data]
---

# feat-hearing-intake アプリケーション境界の決定 (AD-6〜AD-9)

本書は [architecture-decision-record.md](./architecture-decision-record.md) から、
試算・AI キュー認可・UI・API 境界の詳細を責務単位で分離した P02 成果物である。
判断内容は分割前を基礎とし、2026-08-12 の用途プロファイル追加契約を §8–9 に反映している。

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

## 7. AD-7: AI キューの認可は「Device Flow token + scope + role」の 3 条件 AND とし、payload に PII と secret を載せない

### 判断

`POST /api/v1/ai-jobs/pull` と `POST /api/v1/ai-jobs/:id/complete` は、次の 3 条件すべてを満たす場合にのみ許可する。

| 条件 | 検査対象 | 根拠 |
|---|---|---|
| ① Bearer token であること | Device Flow 由来の短命 access token (TTL 15 分)。Web セッション cookie では通さない | SEC8 / requirements-baseline `ai-queue-authz-payload-secret-ban` |
| ② scope に `aijob:process` を含むこと | `publisher_tokens.scopes_json` の現行5値のうち該当スコープ | backend-spec §2.2 |
| ③ 実効 role が workspace-admin 以上であること | workspace-admin は**自テナントのジョブのみ**、provider-admin のみ cross-tenant | backend-spec §4.11 (qa-048 改訂) |

`complete` / `fail` は上記に加えて **claim 者本人であること** (`ai_jobs.claimed_by_token_id` の一致) を要求する。

### 仕様間の矛盾と採用理由

本設計は backend-spec 内部の矛盾を 1 件検出している。

| 箇所 | 記述 | 日付 |
|---|---|---|
| §3.3 認可マトリクス | `ai-jobs pull/complete` は **provider-admin のみ** (workspace-admin は「—」) | 未改訂 |
| §4.11 表 + 注記 | pull は **workspace-admin にも開放** (自テナント限定)。「qa-048 で改訂・2026-07-18 中立再確認」 | 2026-07-18 |

**§4.11 を採用する。** 理由は (a) qa-048 で明示的に改訂された旨が本文に書かれており日付が新しい、(b) `system-spec/spec-state.json` の qa-048 回答も「AiJob pull 権限開放」を確定内容として記録している、(c) 開放の目的が「提供者単一障害点の解消」と明記されており、provider-admin 限定に戻すと目的が失われる。

§3.3 の表は更新漏れとみなし、設計レビューの OPEN-4 として backend-spec 側の是正を要求する。**本 feature は §3.3 を書き換えない** (owner 外のため)。

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

## 8. AD-8: S10-S12 は共通部品を消費し、独自実装を持たない

### S10-S12 画面構成表

| 画面 | route | 最小 role | 消費 API | 共通部品 | 主要素 |
|---|---|---|---|---|---|
| **S10** ヒアリングウィザード | `/sheets/new` | member | `POST /api/v1/sheets` | `StepWizard` (packages/ui) | 上位4大工程を7画面に分割 + 完了パネル |
| **S11** シート一覧 | `/sheets` | member | `GET /api/v1/sheets` | `DataTable` | 6 列 / モバイルはカード |
| **S12** シート詳細 | `/sheets/[id]` | member | `GET /api/v1/sheets/:id`、admin: `PATCH`・`POST :id/regenerate`、screenshots / handoff-tokens | `MarkdownView` | 生成本文 + snapshot 全項目 + 引き渡し + 添付 |

### S10: 7 画面の割り当て (FormData 30 項目 / 2026-08-12 シート作成 UX 刷新)

上位仕様の4大工程 (基本情報 → 業務詳細 → 要件 → 確認) は維持する。入力負荷を下げるため実画面を次の7画面へ分割する (旧 8 画面の「整理・まとめ」「確認」を「整理・確認」へ統合)。

| 画面 | 項目 | 検証 |
|---|---|---|
| 1 基本情報 | `taskName, company, applicant, domain` | step 単位 validation (必須) |
| 2 現状 | `issue, trueProblem, tools, hours, people, salary` | `hours`/`people`/`salary` は数値範囲検査。`trueProblem` は任意 |
| 3 用途プロファイル | `usagePurpose, expertise, role, context, motivation, sharingIntent, constraintTags, shareTarget, informationSources, knowledgeAssets` | 単一選択は `unknown` 初期値。`shareTarget`/`knowledgeAssets` 必須。`informationSources` のみ任意 (未回答=`null`、複数入力の回答済み 0 件=`[]`)。enum は既存値を壊さず加算可 |
| 4 よくある要望パターン | `requestPatterns` と条件付き `integrationTools*` / `automationDescription` / `existingDataSources*` | 親パターン未選択時は条件付き項目を送らない |
| 5 参考URL・添付 | `referenceUrls` (最大10) + 作成時添付ステージング (25MB・画像/動画/CSV/Excel) | URL 形式・件数上限。添付は送信後に順次 upload (一部失敗許容) |
| 6 要望 | `features, output, priority` | 必須 + enum (`priority` は urgent/high/medium/low/someday) |
| 7 整理・確認 | 全入力の再掲 + 時間削減の参考値 + 送信意思の最終確認 | **金額なし** (AD-6) |

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

## 9. AD-9: 新規 REST 資源は `packages/schemas` の zod 単一ソースへ登録し、認可単一ミドルウェア配下に置く

### 判断

sheets 系 5 エンドポイントの request/response 契約を `packages/schemas/hearing-intake/` に zod で定義し、`contract-registry.ts` の `contractSchemaNames` へ登録する。手書きの型定義・OpenAPI の二重管理を作らない (B1)。

### 登録する契約名

| 契約名 | 対応 |
|---|---|
| `HearingSheetFormInput` | ウィザードが送る必須 12 項目 + 任意 11 項目 (`salary` を含む)。旧 12 項目 client も受け付ける (AD-2) |
| `HearingSheetFormSnapshot` | `form_json` に保存する versioned 値オブジェクト (`salary` を含まない)。write は version 2、read は V1/無版を dual-read する (AD-2 / OPEN-2) |
| `HearingSheetEstimate` | estimate snapshot (AD-6) |
| `CreateSheetRequest` / `CreateSheetResponse` | `POST /sheets` |
| `SheetListItem` | `GET /sheets` の item DTO (AD-8 の S11) |
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
