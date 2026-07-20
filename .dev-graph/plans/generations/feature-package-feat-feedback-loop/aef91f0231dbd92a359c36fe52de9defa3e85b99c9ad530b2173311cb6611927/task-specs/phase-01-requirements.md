# System task overlay: 改善要望フィードバックループ要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "requirements-baseline"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P01
- classification: confidence=0.92, reason="goal-spec (goal-spec.json) と features/feat-feedback-loop.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-feedback-loop の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (Feedback エンティティ・CLI+S14 の 2 経路受付・D5 pull 型 AI キュー対応・publish 接続・通知) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Studio mockup 反映により、改善要望フィードバックループは CLI (`claude harness feedback`) と S14 Web フォームの 2 経路受付 → D5 pull 型 AI キュー (kind=`feedback_response`) での解析・修正案生成 → 修正版 publish (既存 PublishRequest パイプライン接続) → update 通知 (D6) まで閉じる feature として確定した (features/feat-feedback-loop.md, confirmation_status=confirmed; system-spec/00-requirements-definition.md I12)。2 経路の受付は同一 feedbacks テーブル・同一キューへ正規化し B6 として扱う (docs/backend-spec.md §2.3, §4.7)。status 遷移 (open→in_progress→resolved) のうち status 変更は workspace-admin 限定とし SEC6 で新規確定した監査対象 `feedback.status_change` を記録する (docs/backend-spec.md §3.8, §5.4)。AI 対応は SEC8 の Device Flow token 保有者（workspace-admin=自テナント / provider-admin=全テナント、越境監査必須）の pull 型キューで処理し secret を payload に含めない (docs/backend-spec.md §4.11, §5.5)。対応済み通知はアプリ内通知を正本とし Resend メール (D6) を補助チャネルとして NotificationDispatcher 共通層経由で送信する (owner=feat-hub-foundation、本 feature は消費のみ; docs/backend-spec.md §4.10)。フィードバック本文の Markdown は共通レンダラの sanitize を消費するのみで独自実装は行わない (SEC7)。修正版 publish は既存 PublishRequest 状態機械 (I2/I3、owner=feat-publish-pipeline) へ接続し新たな状態機械を作らず自動マージも行わない (feature scope_out)。Feedback エンティティは Studio 拡張の新規テーブルであり D4 に従い tenant_id/workspace_id スコープ列を必須とする (docs/backend-spec.md §2.1, §2.3)。本 task は、実装に入る前にこれらの確定要件を再解釈や欠落なく baseline 化し、後続タスクの手戻りを防ぐ。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行depends_onを都度評価し、task edgeへ複製しない。

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物 (S14 一覧+フォーム) を変更しない。frontend 要件の具体化は P02 設計・P05 実装で行う
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (feedback REST 資源・AiJob 連携) を変更しない
- API: N/A: API 契約の置き場と形状の確定は P02 の workstream 設計で行う。本 task は要件記述のみ
- Data: N/A: Feedback エンティティ (tenant_id/workspace_id スコープ列) のカラム定義詳細設計は P02 で行う。本 task は要件記述のみ
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: feedback-two-route-single-resource-b6-i12・feedback-status-transition-audit-sec6・ai-response-pull-queue-d5-sec8・feedback-markdown-sanitize-sec7・feedback-entity-tenant-scope-d4・feedback-rest-zod-single-source-authz-mw-b1-sec2 の 6 件のセキュリティ関連 quality_constraints を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 8 件を machine-verifiable な受入基準として requirements-baseline.md に固定する
- Documentation: applicable + change: docs/features/feat-feedback-loop/requirements-baseline.md を新規作成する
- Operations: N/A: AI キュー運用・通知運用の具体化は P09/P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-frontend (features/feat-feedback-loop.md architecture_refs の正本参照。D4/D5/D6/I12/qa-021(S14)/qa-022/qa-025(SEC2/SEC6/SEC7/SEC8/SEC9) を含む)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで、Feedback エンティティへの実変更を伴わない (実変更は P05/P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件の確定転記と qa-021(S14)/qa-022/qa-025(SEC2/SEC6/SEC7/SEC8/SEC9)/D4/D5/D6/I12/J5 の紐付けを含む)
- Consumed artifacts: goal-spec.json, features/feat-feedback-loop.md, features/feat-feedback-loop.context.json, system-spec/ui-ux.md, system-spec/frontend.md, system-spec/security.md, docs/backend-spec.md, docs/user-journeys.md, docs/screen-inventory.md
- Write scope/touches: docs/features/feat-feedback-loop/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-feedback-loop/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- publish 状態機械の再実装 (goal-spec scope_out。既存 I2/I3 を feat-publish-pipeline から使う)
- 自動マージ (goal-spec scope_out。修正案は人の確認を経て publish)
- NotificationDispatcher 共通層自体の実装 (owner=feat-hub-foundation。本 feature は消費のみ)
- Markdown 共通レンダラ・design system 共通部品自体の実装 (owner=feat-hub-foundation)
- AiJob キュー共通層の汎用化 (既存 ai_jobs テーブル・kind enum を消費するのみ)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-feedback-loop/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件 (feedback-two-route-single-resource-b6-i12, feedback-status-transition-audit-sec6, ai-response-pull-queue-d5-sec8, resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9, feedback-markdown-sanitize-sec7, feedback-entity-tenant-scope-d4, feedback-fix-publish-existing-pipeline-no-automerge, feedback-rest-zod-single-source-authz-mw-b1-sec2) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-feedback-loop.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-feedback-loop.context.json` (`sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance を要件ベースラインへ全件固定する。
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

This section is normative for P01 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-feedback-loop.context.json; docs/backend-spec.md §2.3/§4.7/§4.11; system-spec/backend.md qa-048→qa-059
- Effective phase contract: feedbacks は priority=high|medium|low を必須列/入力/DTO/migrationへ含める。AI queue pull は workspace-adminが自テナント、provider-adminが全テナント（越境はprovider.cross_tenant_access監査）を処理できる。provider-admin専用という旧記述は無効。POST feedback のsession/Bearer二経路、kind=feedback_response、status遷移、通知、既存PublishRequest接続を同じ資源で実装する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/feedback/`
- `packages/db/schema/feedback-loop/`
- `packages/schemas/feedback-loop/`
- Mandatory evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I12, D4, D5, D6), system-spec/ui-ux.md (qa-021 S14), system-spec/frontend.md (qa-022), system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8/SEC9)
- Detailed authoritative source: docs/backend-spec.md (§2.1 テナント分離規約, §2.3 feedbacks/ai_jobs/notifications テーブル定義, §3.3 認可マトリクス, §3.8 監査対象, §4.7 feedback API, §4.10 notifications API, §4.11 ai-jobs API, §5.4 Feedback 状態機械, §5.5 AiJob 状態機械), docs/screen-inventory.md (S14), docs/user-journeys.md (J5)
- Architecture: arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
