---
graph_node_id: "SYS-DOCS-CMS-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-docs-cms"
domain: "data"
tags: ["feat-docs-cms","studio-extension","docs-cms","migration"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リファクタリング/マイグレーション — Doc テーブルマイグレーション生成と後方互換性確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:11:41Z"
updated_at: "2026-07-19T14:11:41Z"
status: "active"
depends_on: ["SYS-DOCS-CMS-P07"]
related_nodes: ["feat-docs-cms","arch-harness-hub-frontend","arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/refactoring-migration-note.md","packages/db/schema/docs-cms/"]
purpose: "feat-docs-cms の P08 を実行する: リファクタリング/マイグレーション — Doc テーブルマイグレーション生成と後方互換性確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-docs-cms/refactoring-migration-note.md","packages/db/schema/docs-cms/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["refactoring-migration-note.md に migration ファイル生成結果と後方互換性確認 (破壊的変更なし) の記録がある","現行feature context sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34のscope_in/acceptance全件をP08責務として追跡し、未割当0件である"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: "feat-docs-cms"
feature_package_id: "feature-package/feat-docs-cms"
phase_ref: "P08"
file_path: "tasks/feat-docs-cms/sys-docs-cms-p08.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:11:41Z","origin_kind":"system-dev-planner","source_digest":"a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85","source_path":".dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P05 で追加した Doc スキーマ定義から migration ファイルを生成し既存スキーマへの後方互換性を確認する P08 タスク (feature-execution-package-contract.md により P08 は N/A 判定時も常設される)"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-docs-cms/sys-docs-cms-p08.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9wb.8","linked_at":"2026-07-18T01:43:09Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リファクタリング/マイグレーション — Doc テーブルマイグレーション生成と後方互換性確認

> task projection (P08 / parent: feat-docs-cms)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
- task spec: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/task-specs/phase-08-refactoring-migration.md`
- package digest: `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
- task spec SHA-256: `sha256:ae06e0c3b8d05309bde98e57a7a9d8250317db57e2250c27478ffac6e44ed8cf`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/dev-graph-registration-receipt.json`

## 依存

- `SYS-DOCS-CMS-P07`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
