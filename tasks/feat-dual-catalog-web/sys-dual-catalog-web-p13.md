---
graph_node_id: "SYS-DUAL-CATALOG-WEB-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-dual-catalog-web"
domain: "operations"
tags: ["feat-dual-catalog-web","macro-feature","operations","release-deploy"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リリース/デプロイ — Cloudflare Workers(wrangler)へのロールアウト・rollback手順・Stage 1完了判定"
owners: ["daishiman"]
created_at: "2026-07-19T14:13:14Z"
updated_at: "2026-07-19T14:13:14Z"
status: "active"
depends_on: ["SYS-DUAL-CATALOG-WEB-P12"]
related_nodes: ["feat-dual-catalog-web"]
resource_scope: ["docs/features/feat-dual-catalog-web/release-record.md"]
purpose: "feat-dual-catalog-web の P13 を実行する: リリース/デプロイ — Cloudflare Workers(wrangler)へのロールアウト・rollback手順・Stage 1完了判定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-dual-catalog-web/release-record.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["release-record.md に本番デプロイ完了記録とsmoke test (catalog一覧表示・詳細表示・publish状況ポーリング・marketplace.json配信・axe/CWVゲート通過を含む) 全項目のpass結果が記載されている","現行feature context sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3のscope_in/acceptance全件をP13責務として追跡し、未割当0件である"]
architecture_refs: []
parent_feature: "feat-dual-catalog-web"
feature_package_id: "feature-package/feat-dual-catalog-web"
phase_ref: "P13"
file_path: "tasks/feat-dual-catalog-web/sys-dual-catalog-web-p13.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:13:14Z","origin_kind":"system-dev-planner","source_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","source_path":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.84
classification_reason: "apps/hub の catalog UI・marketplace.json出力をwranglerでCloudflare Workersへロールアウトし、rollback手順とStage 1完了条件(U5: 2社同時稼働)を判定するP13リリースタスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dual-catalog-web/sys-dual-catalog-web-p13.md","confidence":0.84}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dhy.13","linked_at":"2026-07-19T14:13:46Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リリース/デプロイ — Cloudflare Workers(wrangler)へのロールアウト・rollback手順・Stage 1完了判定

> task projection (P13 / parent: feat-dual-catalog-web)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817`
- task spec: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817`
- task spec SHA-256: `sha256:17c55886367d230c3424c4bda72aa7adb4e7b53efb604157e5d14f6cfe988bcb`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/dev-graph-registration-receipt.json`

## 依存

- `SYS-DUAL-CATALOG-WEB-P12`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-dual-catalog-web` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
