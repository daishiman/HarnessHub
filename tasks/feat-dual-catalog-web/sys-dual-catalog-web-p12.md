---
graph_node_id: "SYS-DUAL-CATALOG-WEB-P12"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-dual-catalog-web"
domain: "documentation"
tags: ["feat-dual-catalog-web","macro-feature","documentation","runbook"]
priority: null
start_date: null
target_date: null
iteration: null
title: "文書化・runbook・引き継ぎ — カタログ利用者/管理者向け手順・marketplace.json形式文書・障害時縮退runbook・更新通知導線の文書化"
owners: ["daishiman"]
created_at: "2026-07-19T14:13:14Z"
updated_at: "2026-07-19T14:13:14Z"
status: "active"
depends_on: ["SYS-DUAL-CATALOG-WEB-P11"]
related_nodes: ["feat-dual-catalog-web"]
resource_scope: ["docs/features/feat-dual-catalog-web/runbook.md"]
purpose: "feat-dual-catalog-web の P12 を実行する: 文書化・runbook・引き継ぎ — カタログ利用者/管理者向け手順・marketplace.json形式文書・障害時縮退runbook・更新通知導線の文書化"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-dual-catalog-web/runbook.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["runbook.md にカタログ利用者/管理者向け操作手順・marketplace.json形式仕様・Hub障害時§6.1縮退runbook・plugin更新通知導線運用の4項目全てが記載されている","現行feature context sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3のscope_in/acceptance全件をP12責務として追跡し、未割当0件である"]
architecture_refs: []
parent_feature: "feat-dual-catalog-web"
feature_package_id: "feature-package/feat-dual-catalog-web"
phase_ref: "P12"
file_path: "tasks/feat-dual-catalog-web/sys-dual-catalog-web-p12.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:13:14Z","origin_kind":"system-dev-planner","source_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","source_path":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/task-specs/phase-12-documentation-operations.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.82
classification_reason: "利用者/管理者向けカタログ操作手順、marketplace.json形式の文書化、Hub障害時の§6.1縮退運用runbook、plugin更新通知導線の運用手順を確立するP12文書化タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dual-catalog-web/sys-dual-catalog-web-p12.md","confidence":0.82}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dhy.12","linked_at":"2026-07-19T14:13:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 文書化・runbook・引き継ぎ — カタログ利用者/管理者向け手順・marketplace.json形式文書・障害時縮退runbook・更新通知導線の文書化

> task projection (P12 / parent: feat-dual-catalog-web)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817`
- task spec: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/task-specs/phase-12-documentation-operations.md`
- package digest: `sha256:7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817`
- task spec SHA-256: `sha256:a12a2f7123dfb131ef3a28c59b81a538866e927e439a2150fe781ecc970a0343`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/dev-graph-registration-receipt.json`

## 依存

- `SYS-DUAL-CATALOG-WEB-P11`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-dual-catalog-web` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
