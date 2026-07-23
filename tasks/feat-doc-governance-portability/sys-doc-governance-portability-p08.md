---
graph_node_id: "SYS-DOC-GOVERNANCE-PORTABILITY-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-doc-governance-portability"
domain: "operations"
tags: ["feat-doc-governance-portability","macro-feature","doc-governance","operations"]
priority: null
start_date: null
target_date: null
iteration: null
title: "移行 — 既存超過 6 文書の allowlist baseline 遡及付与 (冪等・縮小のみ許す ratchet 初期化)"
owners: ["daishiman"]
created_at: "2026-07-22T02:31:19Z"
updated_at: "2026-07-22T02:47:44Z"
status: "active"
depends_on: ["SYS-DOC-GOVERNANCE-PORTABILITY-P07"]
related_nodes: ["feat-doc-governance-portability","arch-harness-hub-dev-workflow","issue-doc-granularity-remediation-20260722"]
resource_scope: ["scripts/doc-line-limit-allowlist.json","eval-log/dev-graph/doc-governance-portability/migration-receipt.json"]
purpose: "feat-doc-governance-portability の P08 を実行する: 移行 — 既存超過 6 文書の allowlist baseline 遡及付与 (冪等・縮小のみ許す ratchet 初期化)"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["scripts/doc-line-limit-allowlist.json","eval-log/dev-graph/doc-governance-portability/migration-receipt.json"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["scripts/doc-line-limit-allowlist.json に既存超過 6 文書 (docs/security-spec.md=910・docs/backend-spec.md=434・docs/features/feat-hub-foundation/design-review-notes.md=366・docs/features/feat-dev-pipeline-improvement/design.md=365・docs/features/feat-stage0-distribution-gate/design-review-notes.md=320・docs/features/feat-hub-foundation/final-review-notes.md=303) の baseline_line_count が遡及付与され、lint-doc-line-limit.py が exit 0 になる","6 文書自体の分割は実施せず、baseline 付与のみに限定されている (分割実施は issue-doc-granularity-remediation-20260722 / HarnessHub-3d8 側の責務)","migration-receipt.json に付与内容 (path・baseline_line_count・実測行数との一致確認) が記録され、再実行しても差分 0 (冪等) である","6 文書 (既存 confirmed 文書) の sha256 が付与前後で不変である"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: "feat-doc-governance-portability"
feature_package_id: "feature-package/feat-doc-governance-portability"
phase_ref: "P08"
file_path: "tasks/feat-doc-governance-portability/sys-doc-governance-portability-p08.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-22T02:31:19Z","origin_kind":"system-dev-planner","source_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","source_path":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "qa-070 のドキュメント統治・移植性境界 3 検査のうち P08 責務 (移行 — 既存超過 6 文書の allowlist baseline 遡及付与) を実行する task。6 文書自体の分割は issue-doc-granularity-remediation-20260722 (HarnessHub-3d8) 側の責務でありスコープ外"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-doc-governance-portability/sys-doc-governance-portability-p08.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ik0.8","linked_at":"2026-07-22T02:47:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-22T09:35:00Z","missing_sections":[],"status":"complete"}
---

# 移行 — 既存超過 6 文書の allowlist baseline 遡及付与 (冪等・縮小のみ許す ratchet 初期化)

> task projection (P08 / parent: feat-doc-governance-portability)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-08-refactoring-migration.md`
- package digest: `sha256:d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec SHA-256: `sha256:71922a7ba196230f41918e8945b35b4efb8c7edec402d63cb74ae4ff58e332d0`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/dev-graph-registration-receipt.json`

## 依存

- 直前 phase (SYS-DOC-GOVERNANCE-PORTABILITY-P07) の完了に依存する (直列 DAG)。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
