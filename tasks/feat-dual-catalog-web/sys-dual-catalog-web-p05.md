---
graph_node_id: "SYS-DUAL-CATALOG-WEB-P05"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-dual-catalog-web"
domain: "frontend"
tags: ["feat-dual-catalog-web","macro-feature","frontend","implementation"]
priority: null
start_date: null
target_date: null
iteration: null
title: "実装 — S01/S02/S03/S04画面実装・marketplace.json出力パイプライン・配布経路連携・axe CI組込・CWVバンドル最適化・ポーリング実装"
owners: ["daishiman"]
created_at: "2026-07-19T14:13:14Z"
updated_at: "2026-07-19T14:13:14Z"
status: "active"
depends_on: ["SYS-DUAL-CATALOG-WEB-P04"]
related_nodes: ["feat-dual-catalog-web","arch-harness-hub-frontend","arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/app/(workspace)/catalog/","apps/hub/src/components/catalog/","apps/hub/src/lib/catalog/","apps/hub/src/app/marketplace.json/route.ts","packages/schemas/dual-catalog-web/",".github/workflows/hub-web-quality-gate.yml","docs/features/feat-dual-catalog-web/implementation-notes.md"]
purpose: "feat-dual-catalog-web の P05 を実行する: 実装 — S01/S02/S03/S04画面実装・marketplace.json出力パイプライン・配布経路連携・axe CI組込・CWVバンドル最適化・ポーリング実装"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/(workspace)/catalog/","apps/hub/src/components/catalog/","apps/hub/src/lib/catalog/","apps/hub/src/app/marketplace.json/route.ts","packages/schemas/dual-catalog-web/",".github/workflows/hub-web-quality-gate.yml","docs/features/feat-dual-catalog-web/implementation-notes.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["apps/hub/src/app/(workspace)/catalog/, apps/hub/src/components/catalog/, apps/hub/src/lib/catalog/, apps/hub/src/app/marketplace.json/route.ts, packages/schemas/dual-catalog-web/, .github/workflows/hub-web-quality-gate.yml が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っている","現行feature context sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3のscope_in/acceptance全件をP05責務として追跡し、未割当0件である"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: "feat-dual-catalog-web"
feature_package_id: "feature-package/feat-dual-catalog-web"
phase_ref: "P05"
file_path: "tasks/feat-dual-catalog-web/sys-dual-catalog-web-p05.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:13:14Z","origin_kind":"system-dev-planner","source_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","source_path":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/task-specs/phase-05-implementation.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.86
classification_reason: "S01(一覧)/S02(詳細・導入)/S03(公開状態ポーリング表示)/S04(Workspace設定・Release履歴読取)の画面実装、marketplace.json出力パイプライン、採用配布経路連携、axe CI組込、CWVバンドル最適化、ポーリング(2s→backoff)実装を行うP05実装タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dual-catalog-web/sys-dual-catalog-web-p05.md","confidence":0.86}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dhy.5","linked_at":"2026-07-19T14:13:28Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 実装 — S01/S02/S03/S04画面実装・marketplace.json出力パイプライン・配布経路連携・axe CI組込・CWVバンドル最適化・ポーリング実装

> task projection (P05 / parent: feat-dual-catalog-web)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817`
- task spec: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/task-specs/phase-05-implementation.md`
- package digest: `sha256:7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817`
- task spec SHA-256: `sha256:601b2bed1816f97b2570244876a672d941ab84d54aff936ca06d3adce0cbeecd`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/dev-graph-registration-receipt.json`

## 依存

- `SYS-DUAL-CATALOG-WEB-P04`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-dual-catalog-web` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
