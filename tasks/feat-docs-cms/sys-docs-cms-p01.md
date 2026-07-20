---
graph_node_id: "SYS-DOCS-CMS-P01"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-docs-cms"
domain: "documentation"
tags: ["feat-docs-cms","studio-extension","docs-cms","requirements-baseline"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ドキュメント CMS 要件ベースライン確定"
owners: ["daishiman"]
created_at: "2026-07-19T14:11:41Z"
updated_at: "2026-07-19T14:11:41Z"
status: "active"
depends_on: []
related_nodes: ["feat-docs-cms","arch-harness-hub-frontend","arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/requirements-baseline.md"]
purpose: "feat-docs-cms の P01 を実行する: ドキュメント CMS 要件ベースライン確定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-docs-cms/requirements-baseline.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-docs-cms/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件が過不足なく転記されている","現行feature context sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34のscope_in/acceptance全件をP01責務として追跡し、未割当0件である"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: "feat-docs-cms"
feature_package_id: "feature-package/feat-docs-cms"
phase_ref: "P01"
file_path: "tasks/feat-docs-cms/sys-docs-cms-p01.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:11:41Z","origin_kind":"system-dev-planner","source_digest":"a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85","source_path":".dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/task-specs/phase-01-requirements.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "goal-spec (goal-spec.json) と features/feat-docs-cms.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-docs-cms/sys-docs-cms-p01.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9wb.1","linked_at":"2026-07-18T01:43:01Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# ドキュメント CMS 要件ベースライン確定

> task projection (P01 / parent: feat-docs-cms)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
- task spec: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/task-specs/phase-01-requirements.md`
- package digest: `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
- task spec SHA-256: `sha256:d5b34fc3450858f91760cb2f8595c19da6b1ff060eb443db174de42dd7115594`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/dev-graph-registration-receipt.json`

## 依存

- feature内依存なし。P01の場合はparent featureのmacro entry gateを実行時に評価する。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
