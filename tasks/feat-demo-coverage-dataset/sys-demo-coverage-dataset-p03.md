---
graph_node_id: "SYS-DEMO-COVERAGE-DATASET-P03"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-demo-coverage-dataset"
domain: "quality"
tags: ["feat-demo-coverage-dataset","macro-feature","testing-qa","seed","coverage","design-review"]
priority: null
start_date: null
target_date: null
iteration: null
title: "独立設計レビュー — 対応表網羅性・冪等性設計・ローカル専用ガードの妥当性確認"
owners: ["daishiman"]
created_at: "2026-08-14T13:38:08Z"
updated_at: "2026-08-14T23:22:51.142750Z"
status: "done"
depends_on: ["SYS-DEMO-COVERAGE-DATASET-P02"]
related_nodes: ["feat-demo-coverage-dataset","arch-harness-hub-data","arch-harness-hub-testing-qa"]
resource_scope: ["docs/features/feat-demo-coverage-dataset/design-review-notes.md"]
purpose: "feat-demo-coverage-dataset の P03 を実行する: 独立設計レビュー — 対応表網羅性・冪等性設計・ローカル専用ガードの妥当性確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-demo-coverage-dataset/design-review-notes.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["design-review-notes.md に承認可否と、28 route×5状態対応表の未カバー 0 件方針・enum 全値網羅方式・冪等性実現方式・ローカル専用ガード非緩和の 4 論点への適合確認結果が明記されている"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-testing-qa"]
parent_feature: "feat-demo-coverage-dataset"
feature_package_id: "feature-package/feat-demo-coverage-dataset"
phase_ref: "P03"
file_path: "tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p03.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-14T13:38:08Z","origin_kind":"system-dev-planner","source_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","source_path":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-03-design-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.86
classification_reason: "P02 で確定した route×状態対応表・enum 網羅方式・冪等性実現方式・ローカル専用ガード維持方針を、設計担当から独立した視点でレビューする P03 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p03.md","confidence":0.86}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6kc4","linked_at":"2026-08-14T15:00:23Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-14T23:22:39Z","evidence_refs":["docs/features/feat-demo-coverage-dataset/design-review-notes.md","docs/features/feat-demo-coverage-dataset/architecture-decision-record.md","tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p03.md"],"policy":"manual","reconciled_at":"2026-08-15T00:05:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T13:10:00Z","missing_sections":[],"status":"complete"}
---

# 独立設計レビュー — 対応表網羅性・冪等性設計・ローカル専用ガードの妥当性確認

> task projection (P03 / parent: feat-demo-coverage-dataset)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-03-design-review.md`
- package digest: `sha256:a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec SHA-256: `sha256:095e3a23621cc3e4a24b35b3ada2908933b0c01b75be49a31919fa710b867ee4`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/dev-graph-registration-receipt.json`

## 依存

- `SYS-DEMO-COVERAGE-DATASET-P02` の完了を前提とする。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` を使い、current pointer から現行世代を再解決する。
- completion: Beads issue の close と default-branch reconciliation を満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
