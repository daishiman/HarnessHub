---
graph_node_id: "SYS-STAGE0-DISTRIBUTION-GATE-P01"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-stage0-distribution-gate"
domain: "documentation"
tags: ["feat-stage0-distribution-gate","macro-feature","documentation","requirements-baseline"]
priority: null
start_date: null
target_date: null
iteration: null
title: "配布経路検証 (H7) 要件ベースライン確定 — URL 型 marketplace / npm source / Bootstrap Installer 2 経路以上実機検証・Windows E2E・decision record 登録"
owners: ["daishiman"]
created_at: "2026-07-19T14:19:08Z"
updated_at: "2026-07-24T08:49:05.298462Z"
status: "done"
depends_on: []
related_nodes: ["feat-stage0-distribution-gate","arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/requirements-baseline.md"]
purpose: "feat-stage0-distribution-gate の P01 を実行する: 配布経路検証 (H7) 要件ベースライン確定 — URL 型 marketplace / npm source / Bootstrap Installer 2 経路以上実機検証・Windows E2E・decision record 登録"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-stage0-distribution-gate/requirements-baseline.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-stage0-distribution-gate/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件が過不足なく転記されている","現行feature context sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0aのscope_in/acceptance全件をP01責務として追跡し、未割当0件である","Normative closure: P07は『P13で登録予定』をpass根拠にできない。採用経路decisionがC01単一writerへ登録され、writer receiptのstatus=applied、decision id/digest、spec-state after digestが確認されるまでP07/P10/P13とfeature完了をfail-closedにする。Stage1のPublisherとThin Dual Catalog双方のparent feature depends_onへ本featureを登録し、Beads edge parityまで確認する。 Evidence: 2経路実機記録、Windows/macOS E2E、C01 writer receipt、decision exact lookup、Publisher/Dual Catalog feature dependency、Beads edge parityを必須とする。"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: "feat-stage0-distribution-gate"
feature_package_id: "feature-package/feat-stage0-distribution-gate"
phase_ref: "P01"
file_path: "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p01.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:19:08Z","origin_kind":"system-dev-planner","source_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","source_path":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/task-specs/phase-01-requirements.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.9
classification_reason: "goal-spec (goal-spec.json) と features/feat-stage0-distribution-gate.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p01.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-j71.1","linked_at":"2026-07-18T16:05:14Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":true,"head_branch":"devgraph/SYS-STAGE0-DISTRIBUTION-GATE-P01","linked_at":"2026-07-24T08:42:20.266647Z","merge_commit_sha":"2ec0d78157b466b4af6b2693fcfc6864520160ad","merged_at":"2026-07-20T12:46:06Z","pr_number":3,"repo":"daishiman/HarnessHub","state":"merged","url":"https://github.com/daishiman/HarnessHub/pull/3"}]
execution_contexts: [{"base_branch":"main","branch":"devgraph/SYS-STAGE0-DISTRIBUTION-GATE-P01","head_sha":"5f313162029df3fdc3a51df00e25d9c57e7402e1","last_seen_at":"2026-07-24T08:37:05.416641Z","lease_acquired_at":"2026-07-20T11:48:38.892319Z","released_at":"2026-07-24T08:37:05.416641Z","state":"released","worktree_id":"wt_eed96293f3fd512f"}]
completion_evidence: {"completed_at":"2026-07-20T12:46:06Z","evidence_refs":["https://github.com/daishiman/HarnessHub/pull/3"],"policy":"linked_pr_merged_all","reconciled_at":"2026-07-24T08:42:20.267239Z","source":"github_pr_merge","status":"done"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 配布経路検証 (H7) 要件ベースライン確定 — URL 型 marketplace / npm source / Bootstrap Installer 2 経路以上実機検証・Windows E2E・decision record 登録

> task projection (P01 / parent: feat-stage0-distribution-gate)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b`
- task spec: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/task-specs/phase-01-requirements.md`
- package digest: `sha256:30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b`
- task spec SHA-256: `sha256:c09366ae9ac6faa02512ceffeee5849546272ea45f7d5a9c86709e6b10474e8e`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/dev-graph-registration-receipt.json`

## 依存

- feature内依存なし。P01の場合はparent featureのmacro entry gateを実行時に評価する。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-stage0-distribution-gate` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
