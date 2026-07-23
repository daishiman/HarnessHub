---
graph_node_id: "SYS-DOC-GOVERNANCE-PORTABILITY-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-doc-governance-portability"
domain: "operations"
tags: ["feat-doc-governance-portability","macro-feature","doc-governance","operations"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リリース — main 反映と 3 検査の CI fail-closed 実効性の実証"
owners: ["daishiman"]
created_at: "2026-07-22T02:31:19Z"
updated_at: "2026-07-22T02:47:44Z"
status: "active"
depends_on: ["SYS-DOC-GOVERNANCE-PORTABILITY-P12"]
related_nodes: ["feat-doc-governance-portability","arch-harness-hub-dev-workflow"]
resource_scope: ["eval-log/dev-graph/doc-governance-portability/release-receipt.json"]
purpose: "feat-doc-governance-portability の P13 を実行する: リリース — main 反映と 3 検査の CI fail-closed 実効性の実証"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["eval-log/dev-graph/doc-governance-portability/release-receipt.json"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["全成果物の PR が main へ merge され、release-receipt.json に PR 番号・merge commit・CI 結果が記録されている","governance-check.yml 上で 3 検査が fail-closed で実効していることが CI run の実測 (悪性 diff を投入した検証 run の exit code) で確認されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: "feat-doc-governance-portability"
feature_package_id: "feature-package/feat-doc-governance-portability"
phase_ref: "P13"
file_path: "tasks/feat-doc-governance-portability/sys-doc-governance-portability-p13.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-22T02:31:19Z","origin_kind":"system-dev-planner","source_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","source_path":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "qa-070 のドキュメント統治・移植性境界 3 検査のうち P13 責務 (リリース — main 反映と 3 検査の CI fail-closed 実効性の実証) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-doc-governance-portability/sys-doc-governance-portability-p13.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ik0.13","linked_at":"2026-07-22T02:47:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-22T09:35:00Z","missing_sections":[],"status":"complete"}
---

# リリース — main 反映と 3 検査の CI fail-closed 実効性の実証

> task projection (P13 / parent: feat-doc-governance-portability)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec SHA-256: `sha256:3656620a14e87b970a577f2b800663f97961504a3e384b5ea9fdef72728d66ef`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/dev-graph-registration-receipt.json`

## 依存

- 直前 phase (SYS-DOC-GOVERNANCE-PORTABILITY-P12) の完了に依存する (直列 DAG)。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
