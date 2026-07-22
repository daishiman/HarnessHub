---
graph_node_id: "SYS-DOC-GOVERNANCE-PORTABILITY-P01"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-doc-governance-portability"
domain: "documentation"
tags: ["feat-doc-governance-portability","macro-feature","doc-governance","documentation"]
priority: null
start_date: null
target_date: null
iteration: null
title: "要件ベースライン確定 — qa-070 ドキュメント規約 2 件・3 検査スコープの baseline 文書化"
owners: ["daishiman"]
created_at: "2026-07-22T02:31:19Z"
updated_at: "2026-07-22T02:47:44Z"
status: "active"
depends_on: []
related_nodes: ["feat-doc-governance-portability","arch-harness-hub-dev-workflow"]
resource_scope: ["docs/features/feat-doc-governance-portability/requirements-baseline.md"]
purpose: "feat-doc-governance-portability の P01 を実行する: 要件ベースライン確定 — qa-070 ドキュメント規約 2 件・3 検査スコープの baseline 文書化"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-doc-governance-portability/requirements-baseline.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["requirements-baseline.md に goal-spec.json の purpose/goal/scope_in 3 件/scope_out 4 件/acceptance 4 件/quality_constraints 4 件 (id 単位) が逐語一致で転記されている","3 検査スコープ ((1) 300 行 fail-closed lint と 6 文書 allowlist ratchet、(2) 仕組みファイルの hard-coded ナレッジ参照検査、(3) 移植チャネルの mechanism-only 既定/knowledge opt-in 検査) がそれぞれ scope_in の対応項目に紐付けて記載されている","出典として system-spec/dev-workflow.md の qa-070 (appr-008 承認) が参照のみで引用され、条文本文が requirements-baseline.md へ複製されていない","P02 で確定すべき据置事項 (3 検査の入出力契約・allowlist schema・hard-coded 参照検出の false-positive 除外基準・CI 配線先) が明記されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: "feat-doc-governance-portability"
feature_package_id: "feature-package/feat-doc-governance-portability"
phase_ref: "P01"
file_path: "tasks/feat-doc-governance-portability/sys-doc-governance-portability-p01.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-22T02:31:19Z","origin_kind":"system-dev-planner","source_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","source_path":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-01-requirements.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "qa-070 のドキュメント統治・移植性境界 3 検査のうち P01 責務 (要件ベースライン確定 — qa-070 ドキュメント規約 2 件・3 検査スコープの baseline 文書化) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-doc-governance-portability/sys-doc-governance-portability-p01.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ik0.1","linked_at":"2026-07-22T02:47:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-22T09:35:00Z","missing_sections":[],"status":"complete"}
---

# 要件ベースライン確定 — qa-070 ドキュメント規約 2 件・3 検査スコープの baseline 文書化

> task projection (P01 / parent: feat-doc-governance-portability)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-01-requirements.md`
- package digest: `sha256:d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec SHA-256: `sha256:b93d05ebfd98f9c547278cfbd15dab6b7d3c1e2bae5bc232c372303952ccb923`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/dev-graph-registration-receipt.json`

## 依存

- feature内依存なし。P01の場合はparent featureのmacro entry gateを実行時に評価する。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
