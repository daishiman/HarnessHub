# System task overlay: 最終独立レビュー — quality_constraints 6 件の充足判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-build-pipeline-board (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "final-review"]
- related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-build-pipeline-board
- phase_ref: P10
- classification: confidence=0.86, reason="P01-P09 の成果物を根拠に goal-spec の quality_constraints 6 件の充足を独立した視点で最終判定する P10 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01-P09 の成果物を根拠に、goal-spec の quality_constraints 6 件 (stage-transition-admin-audit-sec2-sec6-qa021, publish-stage-publishrequest-connect-no-dup-b4-i2-i3, build-entity-tenant-scope-d4-qa024, stage-board-shared-component-qa021-qa022, rest-zod-single-source-authz-mw-b1-qa023, approval-queue-authz-table-shared-b9-qa023) の充足を、実装担当から独立した視点で最終判定する。

## 背景

feature-execution-package-contract.md は品質保証 (P09) の後に独立した最終レビュー (P10) を必須工程と定めている。P03 の設計レビューは実装前の設計妥当性確認であるのに対し、P10 は実装・テスト・migration・品質保証まで完了した最終成果物が goal-spec の quality_constraints と一致していることを確認する最終ゲートである。特に publish-stage-publishrequest-connect-no-dup-b4-i2-i3 (二重状態を持たない) は実装結果と PublishRequest 状態機械の実際の連動結果に基づき判定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-build-pipeline-board, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: sys-build-pipeline-board-p09 の quality-assurance-report.md で axe/tenant 分離/工程操作認可/PublishRequest 整合の 4 種の確認結果が記録済みであること。かつ .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441 に一致し、features/feat-build-pipeline-board.md の confirmation_status が confirmed であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は最終レビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は最終レビューのみで backend 実装物を変更しない
- API: N/A: 本 task は最終レビューのみで API 契約を変更しない
- Data: N/A: 本 task は最終レビューのみでデータスキーマを変更しない
- Infrastructure: N/A
- Security: applicable + review: quality_constraints 6 件のうちセキュリティ関連 5 件 (工程操作 admin 監査・PublishRequest 二重状態排除・tenant 分離・zod 単一ソース認可 MW・B9 共有認可表) の充足を判定する
- Quality: applicable + change: final-review-notes.md に quality_constraints 6 件それぞれの充足判定と根拠成果物への参照を記載する
- Documentation: applicable + change: docs/features/feat-build-pipeline-board/final-review-notes.md を新規作成する
- Operations: N/A

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (本 task は最終レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は最終レビューのみで実 migration は伴わない

## 成果物

- Produced artifacts: docs/features/feat-build-pipeline-board/final-review-notes.md (quality_constraints 6 件の充足判定)
- Consumed artifacts: docs/features/feat-build-pipeline-board/requirements-baseline.md, docs/features/feat-build-pipeline-board/architecture-decision-record.md, docs/features/feat-build-pipeline-board/test-run-report.md, docs/features/feat-build-pipeline-board/acceptance-report.md, docs/features/feat-build-pipeline-board/refactoring-migration-note.md, docs/features/feat-build-pipeline-board/quality-assurance-report.md
- Write scope/touches: docs/features/feat-build-pipeline-board/final-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-build-pipeline-board-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-build-pipeline-board-p10 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-build-pipeline-board-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: sys-build-pipeline-board-p09 完了後に着手する。resource_scope (docs/features/feat-build-pipeline-board/final-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (未充足の場合は原因 task へ差し戻す)
- 新規 quality_constraints の追加 (goal-spec に定義された 6 件の充足判定のみを行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: final-review-notes.md に quality_constraints 6 件それぞれの充足判定と根拠成果物への参照が記載されていること

## Rollout and rollback

- Rollout: final-review-notes.md を作成し、全件充足を確認してから P11 エビデンス収集へ引き継ぐ
- Rollback trigger and steps: いずれかが未充足の場合、final-review-notes.md に未充足理由を記録し、該当する原因 task (P02/P05/P08 等) を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC2/SEC6), system-spec/database.md (qa-032), system-spec/ui-ux.md (qa-021 S13), system-spec/frontend.md (qa-022), system-spec/backend.md (qa-033)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §3.3, §3.8, §4.4, §5.3)
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-build-pipeline-board
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-build-pipeline-board-p09
