# System task overlay: アーキテクチャ設計 — Feedback スキーマ・S14 画面構成・feedback/AI キュー API 契約・通知/publish 接続設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "architecture"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P02
- classification: confidence=0.9, reason="docs/backend-spec.md の feedbacks/ai_jobs/notifications テーブル定義・feedback API・Feedback/AiJob 状態機械に基づき Feedback エンティティのスキーマと S14 画面構成・feedback API 契約・AI キュー連携・通知/publish 接続設計を確定する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 の要件ベースラインに基づき、Feedback エンティティのスキーマ (tenant_id/workspace_id スコープ列を含む)、S14 (一覧 + Web フォーム) の画面構成、`POST/GET /api/v1/feedback`・`GET/PATCH /api/v1/feedback/:id` の API 契約、AiJob(`feedback_response`) の submission/writeback 連携方式、resolved 通知の NotificationDispatcher 消費方式、修正版 publish の既存 PublishRequest 接続方式を確定する。

## 背景

feedbacks テーブルは CLI (`claude harness feedback`, Bearer=harness) と S14 Web フォーム (session=manual) の 2 経路とも同一テーブル・同一 AI キューへ格納する (B6, docs/backend-spec.md §2.3, §4.7)。source (harness/manual) は principal 種別から自動導出し、経路差を理由に別資源へ分岐させない。status は open→in_progress→resolved の状態機械で管理し、`PATCH /api/v1/feedback/:id` による status 変更は workspace-admin 限定で `feedback.status_change` を監査 event に記録する (§3.8, §5.4)。AI 対応は D5 確定の pull 型 AiJob キュー (kind=`feedback_response`) で処理し、pull/書戻しの実行主体は workspace-admin (自テナント) または provider-admin (全テナント、越境監査必須) の Device Flow token 保有者に限定する (SEC8, §4.11, §5.5)。`POST /api/v1/ai-jobs/:id/complete` の結果書戻しで `feedbacks.ai_response` を更新し起票者へ通知する。resolved 通知はアプリ内通知 (notifications テーブル) を正本とし Resend メール (D6) を補助チャネルとして NotificationDispatcher 共通層 (owner=feat-hub-foundation) 経由で届ける (SEC9)。フィードバック本文の Markdown は design system の共通レンダラの sanitize 済み HTML のみ描画する (SEC7, qa-021, qa-022)。修正版 publish は既存 PublishRequest 状態機械 (I2/I3、owner=feat-publish-pipeline) へ接続し新たな状態機械を作らず、修正案 (ai_response) は人の確認を経てから publish する (自動マージ不採用)。feedback の REST 資源群は B1 の方針に従い zod スキーマ単一ソースへ追加し、認可単一ミドルウェア (deny-by-default) 配下の role×操作許可表に従う (feedback 起票/閲覧は member 以上、status 変更は workspace-admin 以上; §3.3, qa-023)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p01 の requirements-baseline.md が作成済みであること。かつ goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + design: S14 (一覧 + Web フォーム) の画面構成・状態表示 (status バッジ、ai_response 表示) を、design system の共通部品 (Markdown レンダラ・ステータスバッジ) を消費する前提で設計する
- Backend: applicable + design: feedback REST ハンドラ (GET/POST/PATCH) と AiJob(`feedback_response`) submission/writeback 連携ロジックを設計する
- API: applicable + contract: feedback の zod スキーマの置き場 (packages/schemas/feedback-loop/) と形状、認可単一ミドルウェア配下への登録方式を確定する
- Data: applicable + design: feedbacks テーブルのカラム定義 (id, tenant_id, workspace_id, code, project_id, type, priority, source, body, status, ai_response, ai_job_id, created_by) と tenant_id/workspace_id スコープ列の強制注入方式を設計する。ai_jobs/notifications テーブルは既存スキーマを変更せず消費のみとする
- Infrastructure: N/A: feat-hub-foundation の既存デプロイ単位を使用し、追加インフラを新設しない
- Security: applicable + change: two-route-single-resource-b6・status-transition-audit-sec6・ai-pull-queue-device-flow-sec8・markdown-sanitize-sec7・tenant-scope-d4・rest-zod-single-source-authz-mw-b1-sec2 の 6 件のセキュリティ設計を確定する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 8 件を満たす設計であることを architecture-decision-record.md に明記する
- Documentation: applicable + change: docs/features/feat-feedback-loop/architecture-decision-record.md を新規作成する
- Operations: N/A: AI キュー運用・通知運用手順の具体化は P09/P12 で行う。本 task は設計確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend (D4/D5/D6/qa-021(S14)/qa-022/qa-023(B1)/qa-025(SEC2/SEC6/SEC7/SEC8/SEC9)/I2/I3 を含む)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker)
- Compatibility/migration/backfill: feedbacks は新規テーブルのため既存テーブルへの破壊的変更を伴わない。ai_jobs.kind は既に `feedback_response` を含む前提で設計し (docs/backend-spec.md §2.3)、ai_jobs テーブル自体のスキーマ変更は行わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/architecture-decision-record.md (feedbacks カラム一覧、S14 画面構成表、feedback API 契約、AiJob(`feedback_response`) 連携方式、NotificationDispatcher 消費方式、PublishRequest 接続方式、認可表方針の明記)
- Consumed artifacts: docs/features/feat-feedback-loop/requirements-baseline.md, docs/backend-spec.md, system-spec/database.md, system-spec/security.md, system-spec/ui-ux.md, system-spec/frontend.md, architecture/harness-hub-frontend.md, architecture/harness-hub-backend.md
- Write scope/touches: docs/features/feat-feedback-loop/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p01 完了後に着手する。resource_scope (docs/features/feat-feedback-loop/architecture-decision-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- PublishRequest 状態機械自体の変更 (owner=feat-publish-pipeline。既存 I2/I3 の接続方式のみ設計する)
- 自動マージロジックの設計 (goal-spec scope_out)
- NotificationDispatcher 共通層自体の設計 (owner=feat-hub-foundation。消費方式のみ設計する)
- ai_jobs テーブル・AiJob キュー共通層自体のスキーマ変更設計 (既存スキーマの消費方式のみ設計する)
- Markdown 共通レンダラ自体の設計 (owner=feat-hub-foundation。sanitize 済み HTML の消費方式のみ設計する)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: architecture-decision-record.md に feedbacks カラム一覧、S14 画面構成表、feedback API 契約 (4 endpoint)、AiJob(`feedback_response`) 連携方式、NotificationDispatcher 消費方式、PublishRequest 接続方式 (二重状態排除)、B1 zod スキーマ単一ソース方針の明記が記載されている

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: P03 レビューで設計案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替設計を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-feedback-loop.context.json` (`sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3`)
- Phase responsibility: 現行 architecture_refs と全 scope を実装境界・deploy unit・owner に割り当てる。
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

This section is normative for P02 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-feedback-loop.context.json; docs/backend-spec.md §2.3/§4.7/§4.11; system-spec/backend.md qa-048→qa-059
- Effective phase contract: feedbacks は priority=high|medium|low を必須列/入力/DTO/migrationへ含める。AI queue pull は workspace-adminが自テナント、provider-adminが全テナント（越境はprovider.cross_tenant_access監査）を処理できる。provider-admin専用という旧記述は無効。POST feedback のsession/Bearer二経路、kind=feedback_response、status遷移、通知、既存PublishRequest接続を同じ資源で実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/feedback/`
- `packages/db/schema/feedback-loop/`
- `packages/schemas/feedback-loop/`
- Mandatory evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/database.md (qa-032), system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8/SEC9), system-spec/ui-ux.md (qa-021 S14), system-spec/frontend.md (qa-022)
- Detailed authoritative source: docs/backend-spec.md (§2.1 テナント分離規約, §2.3 feedbacks/ai_jobs/notifications テーブル定義, §3.3 認可マトリクス, §3.8 監査対象, §4.7 feedback API, §4.10 notifications API, §4.11 ai-jobs API, §5.4 Feedback 状態機械, §5.5 AiJob 状態機械), docs/screen-inventory.md (S14)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p01
