# System task overlay: テストファースト設計 — 2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離のテストスタブ作成

## Machine-readable registration fields

- feature_package_id: feature-package/feat-feedback-loop (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "test-design"]
- related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-feedback-loop
- phase_ref: P04
- classification: confidence=0.88, reason="P03 で承認された設計に基づき P05 実装の受入契約となるテストスタブを作成する P04 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-feedback-loop/sys-feedback-loop-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P03 で承認された設計に基づき、P05 実装が満たすべき受入契約としてテストスタブを作成する。2 経路 (CLI Bearer=harness / Web session=manual) の単一資源正規化、status 遷移の workspace-admin 限定+監査記録、AI 対応 pull キューの provider-admin 限定、resolved 通知のアプリ内正本+Resend 補助、Markdown sanitize、feedbacks テーブルの tenant 分離、PublishRequest 接続の非重複、認可単一ミドルウェア適合の 8 テストカテゴリの合否基準を定義する。

## 背景

P02/P03 で確定・承認された設計を実装前に検証可能な形にするため、テストファーストで受入契約を先に定義する。テストカテゴリは goal-spec の quality_constraints 8 件 (feedback-two-route-single-resource-b6-i12, feedback-status-transition-audit-sec6, ai-response-pull-queue-d5-sec8, resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9, feedback-markdown-sanitize-sec7, feedback-entity-tenant-scope-d4, feedback-fix-publish-existing-pipeline-no-automerge, feedback-rest-zod-single-source-authz-mw-b1-sec2) と 1 対 1 で対応させ、P06 のテスト実行・P10 の最終レビューがこれらを直接参照できるようにする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-feedback-loop, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: sys-feedback-loop-p03 の design-review-notes.md で承認判定が記録されていること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3 に一致し、features/feat-feedback-loop.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + test-design: S14 一覧/フォームの表示・送信テストスタブ (Markdown sanitize 済み HTML のみ描画されることを含む) を作成する
- Backend: applicable + test-design: feedback REST ハンドラの status 遷移・監査 event 記録・AiJob 連携テストスタブを作成する
- API: applicable + test-design: feedback zod スキーマの単一ソース検証・認可単一ミドルウェア適合テストスタブを作成する
- Data: applicable + test-design: feedbacks テーブルの tenant_id/workspace_id 分離テストスタブを作成する
- Infrastructure: N/A: 追加インフラのテストは不要
- Security: applicable + test-design: AI キュー pull/書戻しの provider-admin Device Flow 限定・status 変更 workspace-admin 限定のテストスタブを作成する
- Quality: applicable + change: test-design.md に 8 テストカテゴリの合否基準を記載する
- Documentation: applicable + change: docs/features/feat-feedback-loop/test-design.md を新規作成する
- Operations: N/A: 運用テストは P09 で扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はテストスタブ作成のみで実変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-feedback-loop/test-design.md, apps/hub/src/features/feedback-loop/__tests__/ (テストスタブ)
- Consumed artifacts: docs/features/feat-feedback-loop/architecture-decision-record.md, docs/features/feat-feedback-loop/design-review-notes.md, system-spec/security.md, system-spec/database.md
- Write scope/touches: docs/features/feat-feedback-loop/test-design.md, apps/hub/src/features/feedback-loop/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-feedback-loop-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-feedback-loop-p04 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-feedback-loop-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-feedback-loop-p03 完了後に着手する。write_scope 内の各 path が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- publish 状態機械のテスト実装 (owner=feat-publish-pipeline。接続点のみテストする)
- NotificationDispatcher 共通層自体のテスト実装 (owner=feat-hub-foundation。呼び出し契約のみテストする)
- Markdown 共通レンダラ自体のテスト実装 (owner=feat-hub-foundation。sanitize 済み HTML 描画のみテストする)
- 実装コード本体の作成 (P05 の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: test-design.md に two-route-single-resource・status-transition-workspace-admin-audit・ai-pull-queue-provider-admin-device-flow・resolved-notification-inapp-resend・markdown-sanitize-render・feedback-entity-tenant-scope-isolation・publish-connect-no-automerge・rest-zod-authz-mw の 8 テストカテゴリの合否基準が明記されている

## Rollout and rollback

- Rollout: test-design.md とテストスタブを作成し、P05 実装へ引き継ぐ
- Rollback trigger and steps: 合否基準が P02/P03 設計と矛盾する場合、矛盾箇所を記録し sys-feedback-loop-p02 または sys-feedback-loop-p03 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6/SEC7/SEC8/SEC9), system-spec/database.md (qa-032)
- Detailed authoritative source: docs/backend-spec.md (§3.3 認可マトリクス, §3.8 監査対象, §4.7 feedback API, §4.11 ai-jobs API, §5.4/§5.5 状態機械)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-feedback-loop
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-feedback-loop-p03
