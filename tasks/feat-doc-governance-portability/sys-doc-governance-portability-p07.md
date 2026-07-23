---
graph_node_id: "SYS-DOC-GOVERNANCE-PORTABILITY-P07"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-doc-governance-portability"
domain: "quality"
tags: ["feat-doc-governance-portability","macro-feature","doc-governance","quality"]
priority: null
start_date: null
target_date: null
iteration: null
title: "受入判定 — 4 acceptance の突合と未達の差し戻し"
owners: ["daishiman"]
created_at: "2026-07-22T02:31:19Z"
updated_at: "2026-07-22T02:47:44Z"
status: "active"
depends_on: ["SYS-DOC-GOVERNANCE-PORTABILITY-P06"]
related_nodes: ["feat-doc-governance-portability","arch-harness-hub-dev-workflow"]
resource_scope: ["docs/features/feat-doc-governance-portability/acceptance-report.md"]
purpose: "feat-doc-governance-portability の P07 を実行する: 受入判定 — 4 acceptance の突合と未達の差し戻し"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-doc-governance-portability/acceptance-report.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["acceptance-report.md に feature acceptance 4 件それぞれの充足判定 (根拠 evidence の path 付き) が記録されている","P08 完了後に再判定が必要な項目 (allowlist baseline 遡及付与の完了確認) が明示され、未達項目の差し戻し先 phase が記録されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: "feat-doc-governance-portability"
feature_package_id: "feature-package/feat-doc-governance-portability"
phase_ref: "P07"
file_path: "tasks/feat-doc-governance-portability/sys-doc-governance-portability-p07.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-22T02:31:19Z","origin_kind":"system-dev-planner","source_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","source_path":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-07-acceptance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "qa-070 のドキュメント統治・移植性境界 3 検査のうち P07 責務 (受入判定 — 4 acceptance の突合と未達の差し戻し) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-doc-governance-portability/sys-doc-governance-portability-p07.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ik0.7","linked_at":"2026-07-22T02:47:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-22T09:35:00Z","missing_sections":[],"status":"complete"}
---

# 受入判定 — 4 acceptance の突合と未達の差し戻し

> task projection (P07 / parent: feat-doc-governance-portability)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-07-acceptance.md`
- package digest: `sha256:d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec SHA-256: `sha256:e9fa0c7249dd22b46d7380e31e0e64ccedbe192fc28f5deeb8f30ed295e1ef79`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/dev-graph-registration-receipt.json`

## 依存

- 直前 phase (SYS-DOC-GOVERNANCE-PORTABILITY-P06) の完了に依存する (直列 DAG)。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
