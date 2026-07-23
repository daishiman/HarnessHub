---
graph_node_id: "SYS-PUBLISH-PIPELINE-P09"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-publish-pipeline"
domain: "security"
tags: ["feat-publish-pipeline","macro-feature","security","quality-assurance"]
priority: null
start_date: null
target_date: null
iteration: null
title: "品質・セキュリティ・運用保証 — レート制限・Idempotency-Key・tenant 分離・secret scan CI ゲート確立"
owners: ["daishiman"]
created_at: "2026-07-19T14:17:23Z"
updated_at: "2026-07-19T14:17:23Z"
status: "active"
depends_on: ["SYS-PUBLISH-PIPELINE-P08"]
related_nodes: ["feat-publish-pipeline","arch-harness-hub-backend","arch-harness-hub-security"]
resource_scope: ["apps/hub/scripts/","apps/hub/src/app/api/v1/publish/","apps/hub/src/lib/publish/auth-principal.ts","docs/features/feat-publish-pipeline/quality-assurance-report.md","packages/schemas/publish-pipeline/"]
purpose: "feat-publish-pipeline の P09 を実行する: 品質・セキュリティ・運用保証 — レート制限・Idempotency-Key・tenant 分離・secret scan CI ゲート確立"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/scripts/","apps/hub/src/app/api/v1/publish/","apps/hub/src/lib/publish/auth-principal.ts","docs/features/feat-publish-pipeline/quality-assurance-report.md","packages/schemas/publish-pipeline/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["quality-assurance-report.md にレート制限 (10 回/分)・Idempotency-Key (TTL 24 時間、payload 不一致時 422)・tenant 分離・secret scan CI ゲート・monotonic authz マトリクス参照確認の全結果が記載されている","現行feature context sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41のscope_in/acceptance全件をP09責務として追跡し、未割当0件である","Normative closure: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。 Evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-security"]
parent_feature: "feat-publish-pipeline"
feature_package_id: "feature-package/feat-publish-pipeline"
phase_ref: "P09"
file_path: "tasks/feat-publish-pipeline/sys-publish-pipeline-p09.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:17:23Z","origin_kind":"system-dev-planner","source_digest":"fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b","source_path":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/task-specs/phase-09-quality-assurance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "qa-037 のレート制限・Idempotency-Key TTL・tenant 分離・secret scan の非機能要件を機械的に保証する P09 品質保証タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-publish-pipeline/sys-publish-pipeline-p09.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dfm.9","linked_at":"2026-07-18T16:04:25Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 品質・セキュリティ・運用保証 — レート制限・Idempotency-Key・tenant 分離・secret scan CI ゲート確立

> task projection (P09 / parent: feat-publish-pipeline)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b`
- task spec: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/task-specs/phase-09-quality-assurance.md`
- package digest: `sha256:fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b`
- task spec SHA-256: `sha256:2145124af0a78791bdcb1a031b2963fa9cd28a012ffcf4aac2b4bb595e391cf4`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/dev-graph-registration-receipt.json`

## 依存

- `SYS-PUBLISH-PIPELINE-P08`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publish-pipeline` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
