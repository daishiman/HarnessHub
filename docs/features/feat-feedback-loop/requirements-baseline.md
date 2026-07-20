---
status: confirmed
layer: feature-design
task: SYS-FEEDBACK-LOOP-P01
parent_feature: feat-feedback-loop
feature_package_id: feature-package/feat-feedback-loop
source: .dev-graph/plans/feature-package-feat-feedback-loop/goal-spec.json
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-frontend]
---

# feat-feedback-loop 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

> **構築順オーバーレイ (baseline 外)**: **P3**。P2 の公開済み Project/Release を参照し、改善要望→レビュー→再公開を閉じる。正本: [system-design-overview.md](../../system-design-overview.md) §3 / [README.md](../README.md)。

## 1. 目的 (purpose)

利用者の改善要望/レビュー依頼/バグ報告を CLI + Web (S14) の 2 経路で受け付け (B6)、D5 pull 型 AI キューで解析・修正案生成し、修正版の publish → update 通知まで閉じる改善ループ (G5/I12, J5) を確立する

## 2. ゴール (goal)

フィードバックが status 遷移 (未対応→対応中→対応済み) で管理され、AI 対応結果 (aiResponse) が S14 に反映され、修正版が publish パイプライン経由で利用者へ届く状態

## 3. スコープ

### 3.1 scope_in

1. Feedback エンティティ (種別・経路・aiResponse・status)
2. CLI 受付 (claude harness feedback) + S14 Web フォームの 2 経路
3. AI キュー (D5) でのフィードバック解析・修正案生成
4. 修正版 publish (既存パイプライン) と update 通知 (D6) の接続
5. Markdown 共通部品の消費 (sanitize)

### 3.2 scope_out

1. publish パイプラインの変更
2. 自動マージ (修正案は人の確認を経て publish)

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. 2 経路の受付が同一 Feedback 資源に正規化される
2. AI 対応が pull 型で処理され status 遷移が監査記録される
3. 対応済み通知がアプリ内 (正本) + メール (D6) で届く

## 5. 品質制約 (quality_constraints — goal-spec 8 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| feedback-two-route-single-resource-b6-i12 | フィードバックは CLI (`claude harness feedback`, Bearer=harness) と S14 Web フォーム (session=manual) の 2 経路とも `POST /api/v1/feedback` を通じて同一 feedbacks テーブル・同一 AI キューへ格納される。source (harness/manual) は principal 種別から自動導出し、経路差を理由に別資源へ分岐させない (B6) | system-spec/00-requirements-definition.md I12 (フィードバックループ: CLI + Web フォームの 2 経路受付 → AI 対応 → 修正版 publish → update 通知); system-spec/spec-state.json qa-023 (B6: フィードバック受付は CLI + Web の 2 経路、status 遷移); system-spec/backend.md qa-033 (endpoint 一覧 §4.7: feedback は session=manual/Bearer=harness の 2 経路同一キュー = B6); docs/backend-spec.md §2.3 (`feedbacks` テーブル: CLI 発と Web フォームは同一テーブル・同一キュー)、§4.7 (`POST /api/v1/feedback`) |
| feedback-status-transition-audit-sec6 | Feedback の status は open (未対応) → in_progress (対応中) → resolved (対応済み) の状態機械で管理する。`PATCH /api/v1/feedback/:id` による status 遷移は workspace-admin 限定とし、SEC6 で Studio 反映時に新規確定した監査対象 (工程操作・係数変更・doc 編集・フィードバック status 変更・ユーザー管理操作) の一つとして `feedback.status_change` を監査 event に記録する | docs/backend-spec.md §5.4 (Feedback: open→in_progress→resolved)、§4.7 (`PATCH /api/v1/feedback/:id` は workspace-admin、監査 event)、§3.8 (監査対象 action に `feedback.status_change` を含む); system-spec/security.md qa-025 (SEC6 監査対象の追加); system-spec/backend.md qa-033 (状態機械 5 種に Feedback を含む) |
| ai-response-pull-queue-d5-sec8 | フィードバックの AI 対応は D5 確定の pull 型 AiJob キュー (kind=`feedback_response`) で処理する。pull/書戻しの実行主体は provider-admin の Device Flow token 保有者に限定し (qa-031)、job payload に secret を含めない (SEC8)。`POST /api/v1/ai-jobs/:id/complete` の結果書戻しで `feedbacks.ai_response` を更新し、起票者へ通知する | system-spec/00-requirements-definition.md D5 (AI 処理の実行主体: pull 型キュー、フィードバック自動対応を含む); docs/backend-spec.md §2.3 (`ai_jobs` テーブル: kind=`feedback_response`)、§4.7 (AI 対応は AiJob(`feedback_response`) 書戻しで `ai_response` 更新 + 起票者へ通知)、§4.11 (pull は provider-admin のみ・lease 10 分・attempt 3 で dead)、§5.5 (AiJob 状態機械); system-spec/security.md qa-025 (SEC8: AI キューの pull/書戻しは Device Flow token 保有者に限定、payload に secret を含めない); system-spec/backend.md qa-033 (B5/D5/qa-031) |
| resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9 | 対応済み (resolved) 通知はアプリ内通知 (notifications テーブル) を正本とし、Resend メール (D6) を補助チャネルとして届ける。メール不達でもアプリ内通知で情報が欠けない設計とし、送信は NotificationDispatcher 共通層を経由する (Resend API を feature 実装から直接呼ばない)。SEC9: Resend API key は環境 binding のみ、宛先はテナント内ユーザー限定、PII をメール本文に含めない | system-spec/00-requirements-definition.md D6 (メール通知の送信手段: resend-free。決定注記に『アプリ内通知を常に正本とし、メールは補助チャネル』); docs/backend-spec.md §2.3 (`notifications` テーブル: アプリ内通知が正本、メールは補助)、§4.10 (通知 B8/D6: NotificationDispatcher 純関数層でアプリ内 + Resend); system-spec/security.md qa-025 (SEC9: メール API key は環境 binding のみ、宛先はテナント内ユーザー限定、PII をメール本文に含めない); system-spec/spec-state.json qa-023 (B8 通知ディスパッチ: アプリ内通知を正本、メールは D6 確定の Resend Free) |
| feedback-markdown-sanitize-sec7 | フィードバック本文 (body) の Markdown は doc・シート本文と同様に design system の共通レンダラ (XSS sanitize) を消費するのみとし、独自の Markdown 処理を実装しない | system-spec/security.md qa-025 (SEC7 XSS: Markdown (doc/フィードバック/シート本文) は共通レンダラの sanitize で一括担保); system-spec/ui-ux.md qa-021 (共通部品の拡張: Markdown レンダラ + エディタ (XSS sanitize) を design system に組込む); system-spec/frontend.md qa-022 (Markdown は共通レンダラの sanitize 済み HTML のみ描画) |
| feedback-entity-tenant-scope-d4 | Feedback エンティティ (Studio 拡張の新規テーブル `feedbacks`) は D4 (row-level tenant scope: 単一 DB + tenant_id/workspace_id スコープ列 + アプリ層強制) に従い tenant_id/workspace_id スコープ列を必須とし、リポジトリ層で WHERE 句へ強制注入する。分離テストを CI 必須とする | system-spec/00-requirements-definition.md D4 (マルチテナント論理分離、row-level-scope 確定); system-spec/database.md qa-032 (documents.scope='common' を除く全テーブルに tenant_id 必須、D4 row-level scope); docs/backend-spec.md §2.1 (テナント分離規約)、§2.3 (`feedbacks` テーブル定義) |
| feedback-fix-publish-existing-pipeline-no-automerge | フィードバックへの修正版 publish は既存の PublishRequest 状態機械 (I2 static validation/secret scan/policy 判定、I3 immutable Release + TargetChannel 別 stable pointer による atomic な公開/更新/rollback) へ接続し、新たな状態機械を作らない。修正案 (ai_response) は人の確認を経てから publish するものとし、自動マージは行わない (feature scope_out) | system-spec/00-requirements-definition.md I2, I3; features/feat-feedback-loop.md scope_out (自動マージ不採用); docs/backend-spec.md §5.1 (PublishRequest 状態機械、§7.2 準拠) |
| feedback-rest-zod-single-source-authz-mw-b1-sec2 | feedback の REST 資源群 (`POST/GET /api/v1/feedback`, `GET/PATCH /api/v1/feedback/:id`) は B1 新規 REST 資源群の一部として zod スキーマ単一ソースへ追加し、全て認可単一ミドルウェア (deny-by-default) 配下の role×操作許可表に従う (feedback 起票/閲覧は member 以上、status 変更は workspace-admin 以上) | system-spec/spec-state.json qa-023 (B1: ヒアリング/シート/パイプライン/フィードバック/ドキュメント/ユーザー管理を含む新規 REST 資源群を zod スキーマ単一ソースへ追加し全て認可 MW 配下); system-spec/backend.md qa-033 (認可単一ミドルウェア deny-by-default の role×リソースマトリクス §3.3); docs/backend-spec.md §3.3 (認可マトリクス: feedback 起票/閲覧・status 変更の role 別許可)、§4.7; system-spec/security.md qa-025 (SEC2) |

## 6. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-feedback-loop/goal-spec.json` (promoted。feature_context_digest = sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 8 件 (§5) が過不足なく転記されていること
