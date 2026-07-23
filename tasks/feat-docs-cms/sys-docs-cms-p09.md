---
graph_node_id: "SYS-DOCS-CMS-P09"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-docs-cms"
domain: "quality"
tags: ["feat-docs-cms","studio-extension","docs-cms","quality-assurance"]
priority: null
start_date: null
target_date: null
iteration: null
title: "品質保証 — CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:11:41Z"
updated_at: "2026-07-19T14:11:41Z"
status: "active"
depends_on: ["SYS-DOCS-CMS-P08"]
related_nodes: ["feat-docs-cms","arch-harness-hub-frontend","arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/app/api/v1/docs/","apps/hub/src/features/docs-cms/ai-job-adapter/","docs/features/feat-docs-cms/quality-assurance-report.md","packages/schemas/docs-cms/"]
purpose: "feat-docs-cms の P09 を実行する: 品質保証 — CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/api/v1/docs/","apps/hub/src/features/docs-cms/ai-job-adapter/","docs/features/feat-docs-cms/quality-assurance-report.md","packages/schemas/docs-cms/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["quality-assurance-report.md に axe/tenant 分離/AI キュー認可/XSS sanitize の 4 種の確認結果が記録されている","現行feature context sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34のscope_in/acceptance全件をP09責務として追跡し、未割当0件である","Normative closure: B7 の5資源（GET /api/v1/docs、GET /api/v1/docs/:id、POST /api/v1/docs、PATCH /api/v1/docs/:id、POST /api/v1/docs/:id/draft）を route handler と zod single source で実装する。draft は共通 ai_jobs へ kind=doc_draft で投入し、共通 pull/complete 経路から documents へ結果を書き戻す consumer adapter を実装する。AiJob 共通層を複製せず、未解決として先送りもしない。 Evidence: 5 endpoint の role/tenant tests、doc_draft enqueue/complete round-trip、共通 queue consumer contract、XSS sanitize、監査 event を同一 evidence chain で追跡する。"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: "feat-docs-cms"
feature_package_id: "feature-package/feat-docs-cms"
phase_ref: "P09"
file_path: "tasks/feat-docs-cms/sys-docs-cms-p09.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:11:41Z","origin_kind":"system-dev-planner","source_digest":"a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85","source_path":".dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/task-specs/phase-09-quality-assurance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P06 テスト結果と P08 migration 結果を踏まえ CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の充足を確認する P09 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-docs-cms/sys-docs-cms-p09.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9wb.9","linked_at":"2026-07-18T01:43:10Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 品質保証 — CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の確認

> task projection (P09 / parent: feat-docs-cms)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
- task spec: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/task-specs/phase-09-quality-assurance.md`
- package digest: `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
- task spec SHA-256: `sha256:5f79dcaac8030f701565938e3482435c9bb94983e525411de8c258991e4d7da2`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-docs-cms/a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85/dev-graph-registration-receipt.json`

## 依存

- `SYS-DOCS-CMS-P08`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-docs-cms` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
