---
graph_node_id: "SYS-DUAL-CATALOG-WEB-P09"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-dual-catalog-web"
domain: "security"
tags: ["feat-dual-catalog-web","macro-feature","security","quality-assurance"]
priority: null
start_date: null
target_date: null
iteration: null
title: "品質・セキュリティ・運用保証 — テナント分離(deny-by-default)・§6.1縮退設計運用確認・SLOダッシュボード・WCAG/CWV最終確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:13:14Z"
updated_at: "2026-07-19T14:13:14Z"
status: "active"
depends_on: ["SYS-DUAL-CATALOG-WEB-P08"]
related_nodes: ["feat-dual-catalog-web","arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/lib/catalog/","docs/features/feat-dual-catalog-web/quality-assurance-report.md"]
purpose: "feat-dual-catalog-web の P09 を実行する: 品質・セキュリティ・運用保証 — テナント分離(deny-by-default)・§6.1縮退設計運用確認・SLOダッシュボード・WCAG/CWV最終確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/lib/catalog/","docs/features/feat-dual-catalog-web/quality-assurance-report.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["quality-assurance-report.md にテナント分離(deny-by-default)確認結果・§6.1縮退設計の運用確認結果・SLOダッシュボードへのCWV反映確認・WCAG 2.2 AA/axe/CWV最終確認の4項目全てが記載されている","現行feature context sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3のscope_in/acceptance全件をP09責務として追跡し、未割当0件である"]
architecture_refs: ["arch-harness-hub-backend"]
parent_feature: "feat-dual-catalog-web"
feature_package_id: "feature-package/feat-dual-catalog-web"
phase_ref: "P09"
file_path: "tasks/feat-dual-catalog-web/sys-dual-catalog-web-p09.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:13:14Z","origin_kind":"system-dev-planner","source_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","source_path":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/task-specs/phase-09-quality-assurance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "テナント分離(deny-by-default)がcatalog閲覧・install descriptor消費経路に一貫適用されていること、§6.1縮退設計(Hub停止中もSkill/WebApp動作継続)の運用確認、SLOダッシュボード反映、WCAG 2.2 AA/CWV goodの最終確認を行うP09品質保証タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dual-catalog-web/sys-dual-catalog-web-p09.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dhy.9","linked_at":"2026-07-19T14:13:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 品質・セキュリティ・運用保証 — テナント分離(deny-by-default)・§6.1縮退設計運用確認・SLOダッシュボード・WCAG/CWV最終確認

> task projection (P09 / parent: feat-dual-catalog-web)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817`
- task spec: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/task-specs/phase-09-quality-assurance.md`
- package digest: `sha256:7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817`
- task spec SHA-256: `sha256:26c39dbdeacac45c0d68e762a44a990690b878fb1a7490df3728cc1709611663`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/dev-graph-registration-receipt.json`

## 依存

- `SYS-DUAL-CATALOG-WEB-P08`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-dual-catalog-web` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
