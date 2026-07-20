# System task overlay: 実装 — S14 一覧+フォーム・feedbacks スキーマ・feedback API・AI キュー連携・通知/publish 接続の実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "implementation"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P05
- classification: confidence=0.9, reason="P03 承認済み設計と P04 テストスタブに基づき S14 実装・feedbacks スキーマ・feedback API・AI キュー連携・通知/publish 接続を実装する P05 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 承認済み設計と P04 テストスタブに基づき、S14 (一覧 + Web フォーム、design system 共通部品の消費)・feedbacks スキーマ・feedback REST API (`POST/GET /api/v1/feedback`, `GET/PATCH /api/v1/feedback/:id`)・AiJob(`feedback_response`) の submission/writeback 連携・resolved 通知の NotificationDispatcher 消費・修正版 publish の既存 PublishRequest 接続を実装する。

## 背景

P04 で確定した 8 テストカテゴリを green にすることが本 task の受入条件である。`POST /api/v1/feedback` は session=manual (S14 Web フォーム) と Bearer=harness (CLI `claude harness feedback`) の両方を受理し、source は principal 種別から自動導出して同一 feedbacks テーブル・同一キューへ格納する (B6, docs/backend-spec.md §4.7)。CLI クライアント本体 (`claude harness feedback` コマンド実装) は既存の Device Flow ベース Publisher/CLI 基盤 (docs/backend-spec.md §3.2) が提供する認証済み HTTP クライアントを利用して同一 endpoint を呼び出す想定であり、本 feature の write_scope には含めない (設計判断は「参照情報」節参照)。`PATCH /api/v1/feedback/:id` による status 遷移 (open→in_progress→resolved) は workspace-admin 限定とし、`feedback.status_change` 監査 event を記録する (SEC6, §3.8, §5.4)。AI 対応は AiJob(`feedback_response`) の pull/書戻しで処理し、pull/`POST /api/v1/ai-jobs/:id/complete` は workspace-admin (自テナント) または provider-admin (全テナント、越境監査必須) の Device Flow token 保有者に限定する (SEC8, §4.11)。書戻し結果で `feedbacks.ai_response` を更新し起票者へ通知する。resolved 通知は NotificationDispatcher 共通層 (owner=feat-hub-foundation) を経由してアプリ内通知を正本としResend メールを補助チャネルで送信する (D6, SEC9)。S14 は design system の Markdown レンダラ (sanitize 済み HTML) を消費するのみとする (SEC7)。修正版 publish は既存 PublishRequest フロー (owner=feat-publish-pipeline) へ接続し、修正案は人の確認を経てから publish する (自動マージ不採用)。feedback の zod スキーマは packages/schemas/feedback-loop/ の単一ソースへ実装し、認可単一ミドルウェア (deny-by-default) 配下に登録する (B1, qa-023)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p04 のテストスタブ (docs/features/feat-feedback-loop/test-design.md, apps/hub/src/features/feedback-loop/__tests__/) が作成済みであること。かつ goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S14 一覧 + Web フォーム画面 (apps/hub/src/app/(dashboard)/feedback/) を、design system の Markdown レンダラ・ステータスバッジ共通部品を消費して実装する
- Backend: applicable + change: feedback REST ハンドラ (GET/POST/PATCH) と AiJob(`feedback_response`) submission/writeback 連携ロジックを実装する
- API: applicable + contract: feedback の zod スキーマを packages/schemas/feedback-loop/ へ実装し、認可単一ミドルウェア配下へ登録する
- Data: applicable + migration: packages/db/schema/feedback-loop/ に feedbacks スキーマを実装する (ai_jobs/notifications は既存スキーマを変更せず消費のみ)
- Infrastructure: N/A: feat-hub-foundation の既存デプロイ単位を使用し、追加インフラを新設しない
- Security: applicable + change: status 変更 workspace-admin 限定認可・feedback.status_change 監査 event・AI キュー Device Flow 限定・tenant 分離・B1 zod スキーマ単一ソース+認可単一ミドルウェアを実装する
- Quality: applicable + change: P04 のテストスタブを green にする
- Documentation: N/A: 実装作業自体は docs/features 配下への文書化を伴わない (文書化は P12 で行う)
- Operations: N/A: 運用手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存デプロイ単位を使用する)
- Compatibility/migration/backfill: feedbacks は新規エンティティのため既存テーブルへの破壊的変更を伴わない。migration ファイルの生成・後方互換性確認は P08 で行う

## 成果物

- Produced artifacts: apps/hub/src/app/(dashboard)/feedback/ (S14 画面), apps/hub/src/features/feedback-loop/ (feature 実装: feedback REST ハンドラ、AiJob 連携、通知トリガー、PublishRequest 接続グルーコード), packages/schemas/feedback-loop/ (zod スキーマ), packages/db/schema/feedback-loop/ (feedbacks スキーマ定義), apps/hub/src/app/api/v1/feedback/, packages/db/schema/feedback-loop/, packages/schemas/feedback-loop/ (normative implementation artifacts)
- Consumed artifacts: docs/features/feat-feedback-loop/architecture-decision-record.md, docs/features/feat-feedback-loop/test-design.md, apps/hub/src/features/feedback-loop/__tests__/
- Write scope/touches: apps/hub/src/app/(dashboard)/feedback/, apps/hub/src/features/feedback-loop/, packages/schemas/feedback-loop/, packages/db/schema/feedback-loop/, apps/hub/src/app/api/v1/feedback/, packages/db/schema/feedback-loop/, packages/schemas/feedback-loop/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p04 完了後に着手する。write_scope 内の各 path が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- PublishRequest 状態機械自体の実装・変更 (owner=feat-publish-pipeline。既存 I2/I3 を使用。goal-spec scope_out)
- 自動マージロジックの実装 (goal-spec scope_out)
- AI 実行バックエンド (解析・修正案生成の実処理) の実装 (Claude Code 側の実行主体であり本 feature は AiJob キューの submission/writeback 連携のみ実装する)
- Markdown 共通レンダラ・design system 共通部品自体の実装 (owner=feat-hub-foundation)
- NotificationDispatcher 共通層自体の実装 (owner=feat-hub-foundation。呼び出しのみ実装する)
- AiJob キュー共通層の汎用化 (既存 ai_jobs テーブル・kind enum を消費するのみ)
- `claude harness feedback` CLI クライアント本体の実装 (既存 Device Flow Publisher/CLI 基盤を利用する前提であり、本 feature は同一 endpoint の受理ロジックのみ実装する)

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`, `pnpm --filter hub build`, `pnpm --filter hub test`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログが得られていること. Normative evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。

## Rollout and rollback

- Rollout: 実装完了後、build/test 成功ログを添えて P06 テスト実行へ引き継ぐ
- Rollback trigger and steps: build/test が失敗する場合、失敗箇所を write_scope 内の該当 path に限定して修正し、影響が設計 (P02/P03) に及ぶ場合は該当 task を再実行対象として差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-feedback-loop.context.json` (`sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
- Purpose: 利用者の改善要望/レビュー依頼/バグ報告を CLI + Web (S14) の 2 経路で受け付け (B6)、D5 pull 型 AI キューで解析・修正案生成し、修正版の publish → update 通知まで閉じる改善ループ (G5/I12, J5) を確立する
- Goal: フィードバックが status 遷移 (未対応→対応中→対応済み) で管理され、AI 対応結果 (aiResponse) が S14 に反映され、修正版が publish パイプライン経由で利用者へ届く状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Feedback エンティティ (種別・経路・aiResponse・status)
- CLI 受付 (claude harness feedback) + S14 Web フォームの 2 経路
- AI キュー (D5) でのフィードバック解析・修正案生成
- 修正版 publish (既存パイプライン) と update 通知 (D6) の接続
- Markdown 共通部品の消費 (sanitize)
- Scope out:
- publish パイプラインの変更
- 自動マージ (修正案は人の確認を経て publish)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 2 経路の受付が同一 Feedback 資源に正規化される
- AI 対応が pull 型で処理され status 遷移が監査記録される
- 対応済み通知がアプリ内 (正本) + メール (D6) で届く
- Architecture/source refs:
- architecture/harness-hub-backend.md
- architecture/harness-hub-frontend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P05 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-feedback-loop.context.json; docs/backend-spec.md §2.3/§4.7/§4.11; system-spec/backend.md qa-048→qa-059
- Effective phase contract: feedbacks は priority=high|medium|low を必須列/入力/DTO/migrationへ含める。AI queue pull は workspace-adminが自テナント、provider-adminが全テナント（越境はprovider.cross_tenant_access監査）を処理できる。provider-admin専用という旧記述は無効。POST feedback のsession/Bearer二経路、kind=feedback_response、status遷移、通知、既存PublishRequest接続を同じ資源で実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/feedback/`
- `packages/db/schema/feedback-loop/`
- `packages/schemas/feedback-loop/`
- Mandatory evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/frontend.md (qa-022), system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8/SEC9), system-spec/database.md (qa-032), system-spec/00-requirements-definition.md (D4/D5/D6)
- Detailed authoritative source: docs/backend-spec.md (§2.3 feedbacks/ai_jobs/notifications, §3.2 Device Flow, §3.3 認可マトリクス, §3.8 監査対象, §4.7 feedback API, §4.10 notifications API, §4.11 ai-jobs API, §5.4/§5.5 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p04
