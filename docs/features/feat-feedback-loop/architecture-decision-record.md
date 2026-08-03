---
status: draft
layer: feature-design
task: SYS-FEEDBACK-LOOP-P02
parent_feature: feat-feedback-loop
feature_package_id: feature-package/feat-feedback-loop
source: docs/features/feat-feedback-loop/requirements-baseline.md
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-frontend]
---

# feat-feedback-loop アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 (アーキテクチャ設計) の成果物。[requirements-baseline.md](./requirements-baseline.md) の acceptance 3 件・quality_constraints 8 件を満たす設計を確定し、P03 (独立設計レビュー) へ引き継ぐ。本文書は新規実装を追加しない — 既存 `docs/backend-spec.md` / `docs/backend-spec-api-state.md` / `system-spec/*` に既に確定済みのスキーマ・API・状態機械を feat-feedback-loop の実装単位として再構成し、接続方式を明記するのみ。

## 1. Feedback エンティティのスキーマ

`feedbacks` テーブルは新規作成 (既存テーブルへの破壊的変更なし)。

| 列 | 型/値域 | 制約・備考 |
|---|---|---|
| `id` | TEXT (ULID) | PK。qa-031 の ID 形式方針に従う |
| `tenant_id` | TEXT | 必須。D4 row-level scope。リポジトリ層で WHERE 句へ強制注入 |
| `workspace_id` | TEXT | 必須。同上 |
| `code` | TEXT (`FR-xxx`) | `display_code_counters` (kind=`FR`) から採番 |
| `project_id` | TEXT | 対象 Project への参照 |
| `type` | ENUM (`improvement/review/bug`) | mock の「改善要望/レビュー依頼/バグ報告」に対応 |
| `priority` | ENUM (`high/medium/low`) | |
| `source` | ENUM (`harness/manual`) | principal 種別 (Bearer=harness / session=manual) から**自動導出**。クライアント申告値を受理しない (B6) |
| `body` | TEXT (Markdown, raw 保存) | `documents.body_md` と同水準で raw 保存し、レンダリング時にのみ共通レンダラで sanitize する (SEC7)。sanitize 済み HTML を保存しない。本 feature では独自 Markdown 処理を実装しない |
| `status` | ENUM (`open/in_progress/resolved`) | §3 の状態機械 |
| `ai_response` | TEXT (Markdown, nullable) | AiJob(`feedback_response`) 書戻しで更新 |
| `ai_job_id` | TEXT (nullable, FK→ai_jobs.id) | |
| `created_by` | TEXT (FK→users.id) | |

`ai_jobs` / `notifications` は既存スキーマを変更せず消費のみ (§4, §5 参照)。

## 2. S14 画面構成 (一覧 + Web フォーム)

`docs/screen-inventory.md` S14 (改善要望・レビュー, member 以上, feat-feedback-loop) を次の 2 ビューへ分解する。配置は既存 `apps/hub/src/features/hearing-intake/` に倣い `apps/hub/src/features/feedback-loop/` を新設する想定 (実装配置の確定は P05)。

| ビュー | 内容 | 消費する共通部品 |
|---|---|---|
| 一覧 | status/type/project フィルタ付き Feedback 一覧。status バッジ (open/in_progress/resolved) | design system の共通ステータスバッジ部品 |
| 詳細+フォーム | 新規起票フォーム (type/priority/project_id/body) と、既存 Feedback の詳細 (body の sanitize 済みレンダリング + `ai_response` の読み取り専用表示) | 共通 Markdown レンダラ (qa-021/qa-022 準拠、sanitize は共通レンダラ側の責務) |

CLI 経路 (`claude harness feedback`) は同じ `POST /api/v1/feedback` を Bearer=harness で呼ぶのみで、S14 側に固有の分岐を持たない (B6: 経路差を理由に別資源へ分岐させない)。

## 3. Feedback 状態機械

```text
open (未対応) → in_progress (対応中) → resolved (対応済み)
```

`PATCH /api/v1/feedback/:id` (workspace-admin 限定) が唯一の遷移経路。遷移ごとに監査 event `feedback.status_change` を記録する (SEC6, `docs/backend-spec.md` §3.8)。

## 4. feedback API 契約 (4 endpoint)

`docs/backend-spec-api-state.md` §4.7 を feat-feedback-loop の実装対象として確定する。

| Method Path | 認証/最小 role | 概要 |
|---|---|---|
| `POST /api/v1/feedback` | session=`manual` / Bearer=`harness` | `project_id, type, priority, body` を受理。`source` は principal から導出 |
| `GET /api/v1/feedback` | member | 一覧 (filter: status/type/project, cursor pagination) |
| `GET /api/v1/feedback/:id` | member | 詳細 (`ai_response` 含む) |
| `PATCH /api/v1/feedback/:id` | workspace-admin | status 遷移。監査 event |

zod スキーマは `packages/schemas/feedback-loop/` に新設し (`packages/schemas/hearing-intake/` と同じ index.ts 再エクスポート構成に倣う)、B1 方針 (zod 単一ソース → CI で `openapi.json` 生成) に従う。4 endpoint はいずれも既存の認可単一ミドルウェア (deny-by-default, `docs/backend-spec.md` §3.3 の role×操作許可表) 配下に登録し、feature 固有の認可分岐コードを持たない。

実装配置は既存 App Router 規約 (`apps/hub/src/app/api/v1/sheets/route.ts` 等) に倣い `apps/hub/src/app/api/v1/feedback/route.ts` + `apps/hub/src/app/api/v1/feedback/[id]/route.ts` を想定する (確定配置は P05)。

## 5. AiJob(`feedback_response`) 連携方式

- Submission: `POST /api/v1/feedback` 受理時 (またはその直後のトランザクション内) に `ai_jobs` へ `kind=feedback_response, ref_type=feedback, ref_id=<feedback.id>` を enqueue する。feature 側は `apps/hub/src/shared/aijob` の `EnqueueAiJobInput` 契約 (tenantId/workspaceId/kind/payload/idempotencyKey) をそのまま消費し、AiJob キュー共通層自体のスキーマ変更は行わない。
- Pull: `POST /api/v1/ai-jobs/pull` は kind に依存しない role ベースの単一判定 (§8 の「feature 固有の認可分岐コードを持たない」方針) であり、feedback_response だけを provider-admin 限定にする実装は既存の汎用 pull エンドポイントへ feature 固有の分岐を追加することになり、B1/SEC2 の単一ミドルウェア方針と矛盾する。したがって本 ADR は既存の汎用権限モデル (`docs/backend-spec-api-state.md` §4.11、qa-048 改訂: workspace-admin は自テナント限定・provider-admin は cross-tenant で監査付き) をそのまま feedback_response にも適用する設計を採用する。
  - **P03 への申し送り**: requirements-baseline.md §5 `ai-response-pull-queue-d5-sec8` は「provider-admin の Device Flow token 保有者への限定」と記述しており、qa-048 改訂前の権限モデルを転記したまま更新されていない可能性が高い。baseline 自身の rollback 規約 (「転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す」) に従い、本 ADR は baseline の文言を書き換えず、goal-spec 再確認 (baseline §5 該当行の qa-048 反映) を P03 の承認条件として要求する。
- Writeback: `POST /api/v1/ai-jobs/:id/complete` の結果書戻しで `feedbacks.ai_response` を更新し、`ref_type=feedback` の分岐で起票者へ通知 enqueue まで一連のトランザクションとする。`feedback_response` はさらに、job の `completed` 化・`ai_response` 書戻し・`feedback_id` 一意の Build 作成を同一 transaction で確定する。Build 作成に失敗した場合は job を completed のまま残さず rollback し、AI worker が安全に再試行できる。`sheet_generation` 用の既存 writeback 分岐 (`apps/hub/src/app/api/v1/ai-jobs/[id]/complete/route.ts`) に `feedback` 分岐を追加する形で実装し、新たな complete エンドポイントは作らない。

## 6. NotificationDispatcher 消費方式

resolved 通知および AiJob 書戻し通知は `apps/hub/src/shared/notification` の `NotificationDispatcher.dispatch(message, channels)` をそのまま呼び出す。feature 側は `NotificationMessage` (`tenantId/workspaceId/recipientSubject/kind/subject/body/idempotencyKey`) を組み立てるだけで、Resend API を feature 実装から直接呼ばない (SEC9)。`channels` は常に `in_app` を含み (アプリ内通知は正本であり opt-out させない)、`email` は宛先ユーザーの `user_settings.notify_feedback` が真の場合のみ加える (既存 `user_settings` の opt-in 列をそのまま尊重し、feature 側で独自の通知設定を新設しない)。メール不達・opt-out 時もアプリ内通知は独立して届く。PII (feedback body) をメール本文へ含めず、通知文面は件名 + リンクのみとする。

## 7. PublishRequest 接続方式 (二重状態排除) — P10 差し戻しによる再設計 (2026-08-03)

> **P10 最終独立レビューでの発覚事項**: `builds` テーブルはリポジトリ全体のどのスキーマにも存在せず、`hearing-intake` 側の `sheet_generation`(§4.11 の P2 ゲート相当)でも未実装であることを確認した。`docs/backend-spec-api-state.md` §4.11/§5.3 が定める Build 7 工程状態機械・`POST/GET /api/v1/builds` エンドポイント群は、feat-feedback-loop 固有の欠落ではなく **システム全体で未着手** の機能であり、本 ADR 旧 §7 の「owner=feat-publish-pipeline の既存ヘルパーを消費するのみ」という前提 (接続先が既に存在する想定) が成立していなかった。
>
> ユーザー判断: feat-feedback-loop のスコープ内で、Build 7 工程ボード (`GET/POST /api/v1/builds` 等の CRUD API・pipeline board UI) はフル実装せず対象外とし、**quality_constraint 7 の充足に必要な最小範囲** — `builds` テーブルの新規作成と、AiJob(`feedback_response`) 完了時の `builds` 行の冪等作成 + `PublishRequest` への接続点 — のみを実装する。Build の 7 工程 UI・手動 `POST /api/v1/builds` エンドポイント・`hearing-intake` 側 (`sheet_generation`) の Build 化は本 feature のスコープ外のまま据え置く (別 feature/task で扱う)。

修正版の publish は既存 `PublishRequest` 状態機械 (`docs/backend-spec-api-state.md` §5.1、`docs/backend-spec.md` §5.1) へそのまま接続する。新しい状態機械は作らない。

- **`builds` テーブルを新規作成する** (`docs/backend-spec-api-state.md` §5.3 準拠の最小列): `id`(PK) / `tenant_id` / `workspace_id` / `type`(`hearing|improvement|review|bug`) / `stage`(`hearing|requirements|design|build|test|review|publish`) / `sheet_id`(nullable, 将来の hearing-intake 接続用に列だけ確保しこの task では書き込まない) / `feedback_id`(nullable, `feedback_id` に一意制約) / `publish_request_id`(nullable, FK 相当) / `created_at` / `updated_at`。CRUD API・7 工程遷移 UI は実装しない (対象外)。
- `POST /api/v1/ai-jobs/:id/complete` (`kind=feedback_response`) の書戻し時、`feedback_id` 一意で `builds` 行を冪等作成する (`type=improvement/review` は `stage=design` 起点、`type=bug` は `stage=test` 起点。`docs/backend-spec-api-state.md` §4.11/§5.3 の既存規約をそのまま適用)。既存行があれば新規作成せずそのまま返す (冪等)。job 完了・応答書戻し・Build 作成の 3 操作は同じ DB transaction に含め、部分成功を残さない。
- `ai_response` (AI 提案) は自動 publish せず、workspace-admin 以上の人手確認を経て既存の publish 導線 (`POST /api/v1/publish` → `PublishRequest` 状態機械) から `Published` へ進める (scope_out: 自動マージ不採用)。本 task では `builds` 行と `publish_request_id` を後から紐付けられるよう列を用意するに留め、`publish` 遷移の実際の接続 UI/API は既存 `apps/hub/src/lib/publish/` 側の責務 (owner=feat-publish-pipeline) のまま変更しない。
- feat-feedback-loop の実装が新設するのは「AiJob 完了 → `builds` 行の冪等作成」の接続点のみであり、`PublishRequest` の状態遷移ロジック自体・`builds` の CRUD API・pipeline board UI は本 task のスコープ外 (owner=feat-publish-pipeline / 別 task で `hearing-intake` 分と合わせて実装)。

## 8. 認可 (B1 zod スキーマ単一ソース方針)

`docs/backend-spec.md` §3.3 の role×操作許可表を feat-feedback-loop の正本とする。

| リソース | member | owner | workspace-admin | provider-admin |
|---|---|---|---|---|
| feedback 起票/閲覧 | ✓ | ✓ | ✓ | ✓ |
| feedback status 変更 | — | — | ✓ | ✓ |

zod スキーマは `packages/schemas/feedback-loop/` を単一ソースとし、認可判定は既存の単一ミドルウェア (deny-by-default) に role×resource エントリを追加するのみで、feature 固有の認可コードパスを新設しない (B1, SEC2)。

## 9. quality_constraints 充足マッピング

| quality_constraint (requirements-baseline.md §5) | 本 ADR での充足箇所 |
|---|---|
| feedback-two-route-single-resource-b6-i12 | §2 (CLI/Web 共通 `POST /api/v1/feedback`)、§4 |
| feedback-status-transition-audit-sec6 | §3、§4 (`PATCH` は workspace-admin + 監査 event) |
| ai-response-pull-queue-d5-sec8 | §5 (既存の汎用 pull 権限モデル (qa-048) を採用。baseline 文言の goal-spec 再確認を P03 承認条件とする) |
| resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9 | §6 |
| feedback-markdown-sanitize-sec7 | §1 (`body` 列)、§2 (共通レンダラ消費のみ) |
| feedback-entity-tenant-scope-d4 | §1 (`tenant_id`/`workspace_id` 必須 + 強制注入) |
| feedback-fix-publish-existing-pipeline-no-automerge | §7 (P10 差し戻し後再設計: `builds` テーブル新規作成 + AiJob 完了時の冪等作成のみを feat-feedback-loop スコープとする) |
| feedback-rest-zod-single-source-authz-mw-b1-sec2 | §4、§8 |

acceptance 3 件 (requirements-baseline.md §4) は §2 (経路正規化)・§3+§4+§5 (pull 型処理 + status 遷移監査)・§6 (通知) で満たされる設計とした。

## 10. スコープ外 (P02 では設計しない)

- `PublishRequest` 状態機械自体の変更 (owner=feat-publish-pipeline)
- 自動マージロジック (goal-spec scope_out)
- `NotificationDispatcher` 共通層自体の設計 (owner=feat-hub-foundation)
- `ai_jobs` テーブル・AiJob キュー共通層自体のスキーマ変更
- Markdown 共通レンダラ自体の設計 (owner=feat-hub-foundation)

## 11. P03 への申し送り事項

- P03 独立設計レビュー (design-review-notes.md) で「§8 の feature 固有認可分岐禁止と、feedback_response のみ provider-admin 限定にする baseline 記述が両立しない」との指摘を受け、§5 を既存の汎用 pull 権限モデル (qa-048: workspace-admin 自テナント限定 + provider-admin cross-tenant) を採用する設計へ修正した (2026-08-03)。
- requirements-baseline.md §5 `ai-response-pull-queue-d5-sec8` の「provider-admin 限定」という文言は qa-048 (2026-07-18) 改訂前の記述を転記したままである可能性が高い。baseline 自身は書き換えず、goal-spec 側での qa-048 反映確認を今後の governance タスクとして起票すること。
- resolved 通知の email channel は `user_settings.notify_feedback` opt-in を尊重する設計へ修正した (§6)。

## 12. P10 差し戻しによる P05 への申し送り事項 (2026-08-03)

- P05 は §7 の再設計に従い `packages/db/schema/` へ `builds` テーブルを新規追加し (schema barrel/migration 生成)、`apps/hub/src/app/api/v1/ai-jobs/[id]/complete/route.ts` の `feedback_response` 分岐へ、job 完了・応答書戻しと同じ DB transaction 内で `builds` 行を冪等作成する処理 (`feedback_id` 一意) を追加すること。
- `apps/hub/src/__tests__/feedback-loop/publish-connect-no-automerge.test.ts` の `FL-PUB-101/102` (現状は否定命題のみの静的検査) を、実際に `builds` 行が作成されること・二重作成されないこと (冪等性) を検証する実行テストへ格上げすること。
- `builds` の CRUD API (`GET/POST /api/v1/builds`)・7 工程遷移 UI・`hearing-intake` (`sheet_generation`) 側の Build 化は本 task のスコープ外。実装しないこと。
