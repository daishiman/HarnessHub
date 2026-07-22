---
graph_node_id: "SYS-STAGE0-DISTRIBUTION-GATE-P04"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-stage0-distribution-gate"
domain: "quality"
tags: ["feat-stage0-distribution-gate","macro-feature","quality","test-design"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テストファースト設計 — quality_constraints 8 件・acceptance 3 件に対応する実機検証ケースの設計"
owners: ["daishiman"]
created_at: "2026-07-19T14:19:08Z"
updated_at: "2026-07-20T22:46:30Z"
status: "closed"
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P03"]
related_nodes: ["feat-stage0-distribution-gate","arch-harness-hub-infrastructure"]
resource_scope: [".dev-graph/cache/stage0-decision-registration-receipt.json",".dev-graph/cache/stage0-decision-registration-request.json",".dev-graph/cache/stage0-stage1-gate-receipt.json","docs/features/feat-stage0-distribution-gate/test-design.md"]
purpose: "feat-stage0-distribution-gate の P04 を実行する: テストファースト設計 — quality_constraints 8 件・acceptance 3 件に対応する実機検証ケースの設計"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: [".dev-graph/cache/stage0-decision-registration-receipt.json",".dev-graph/cache/stage0-decision-registration-request.json",".dev-graph/cache/stage0-stage1-gate-receipt.json","docs/features/feat-stage0-distribution-gate/test-design.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-design.md に quality_constraints 8 件と acceptance 3 件全てに対応する実機検証ケース (macOS/Windows 別チェックリストを含む) が記載されている","現行feature context sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0aのscope_in/acceptance全件をP04責務として追跡し、未割当0件である","Normative closure: P07は『P13で登録予定』をpass根拠にできない。採用経路decisionがC01単一writerへ登録され、writer receiptのstatus=applied、decision id/digest、spec-state after digestが確認されるまでP07/P10/P13とfeature完了をfail-closedにする。Stage1のPublisherとThin Dual Catalog双方のparent feature depends_onへ本featureを登録し、Beads edge parityまで確認する。 Evidence: 2経路実機記録、Windows/macOS E2E、C01 writer receipt、decision exact lookup、Publisher/Dual Catalog feature dependency、Beads edge parityを必須とする。"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: "feat-stage0-distribution-gate"
feature_package_id: "feature-package/feat-stage0-distribution-gate"
phase_ref: "P04"
file_path: "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p04.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:19:08Z","origin_kind":"system-dev-planner","source_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","source_path":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/task-specs/phase-04-test-design.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "quality_constraints 8 件 (stage0-two-path-distribution-technical-gate-h7-qa003・stage0-technical-gate-h3-h6-h7-stage1-entry-condition-i9・author-environment-macos-windows-linux-out-of-scope-qa001・npm-source-official-support-changelog-recheck-claude-code-plugins・cost-zero-verification-within-free-tier-c2・solo-operator-ai-assisted-verification-c1・h7-unresolved-blocks-stage1-fail-closed-gate・adopted-path-decision-record-registration-spec-state-decisions) と acceptance 3 件を実機検証ケースへ写像する P04 テストファースト設計タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p04.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-j71.4","linked_at":"2026-07-18T16:05:18Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: [{"base_branch":"main","branch":"devgraph/SYS-STAGE0-DISTRIBUTION-GATE-P04","head_sha":"2ce4f473211d5afe5e41c610ecd2a22c32d1d436","last_seen_at":"2026-07-20T22:44:01.277341Z","lease_acquired_at":"2026-07-20T22:43:59.721888Z","released_at":null,"state":"claimed","worktree_id":"wt_eed96293f3fd512f"}]
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# テストファースト設計 — quality_constraints 8 件・acceptance 3 件に対応する実機検証ケースの設計

> task projection (P04 / parent: feat-stage0-distribution-gate)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b`
- task spec: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/task-specs/phase-04-test-design.md`
- package digest: `sha256:30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b`
- task spec SHA-256: `sha256:c6e2c9ee304b21b29bdbe7098c10da107bdbca4c5f2f177117744a0d26bbbdc1`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/dev-graph-registration-receipt.json`

## 依存

- `SYS-STAGE0-DISTRIBUTION-GATE-P03`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-stage0-distribution-gate` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
