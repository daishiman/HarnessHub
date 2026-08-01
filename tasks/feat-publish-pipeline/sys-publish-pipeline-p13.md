---
graph_node_id: "SYS-PUBLISH-PIPELINE-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-publish-pipeline"
domain: "operations"
tags: ["feat-publish-pipeline","macro-feature","operations","release-deploy"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リリース/デプロイ — apps/hub publish endpoint 本番デプロイと full smoke test"
owners: ["daishiman"]
created_at: "2026-07-30T12:25:36Z"
updated_at: "2026-07-30T12:25:36Z"
status: "active"
depends_on: ["SYS-PUBLISH-PIPELINE-P12"]
related_nodes: ["feat-publish-pipeline","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
resource_scope: ["apps/hub/package.json","apps/hub/scripts/smoke-production-publish.ts","apps/hub/tests/publish-pipeline/production-smoke-script.test.ts","architecture/harness-hub-backend.md","architecture/harness-hub-security.md","docs/backend-spec.md","docs/backend-spec-api-state.md","docs/features/feat-publish-pipeline/release-record.md"]
purpose: "feat-publish-pipeline の P13 を実行する: リリース/デプロイ — apps/hub publish endpoint 本番デプロイと full smoke test"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/api/v1/publish/","apps/hub/src/lib/publish/auth-principal.ts","docs/features/feat-publish-pipeline/release-record.md","packages/schemas/publish-pipeline/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["release-record.md に本番デプロイ完了記録と full smoke test 6 項目全ての pass 結果が記載されている","現行feature context sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41のscope_in/acceptance全件をP13責務として追跡し、未割当0件である","Normative closure: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。 Evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
parent_feature: "feat-publish-pipeline"
feature_package_id: "feature-package/feat-publish-pipeline"
phase_ref: "P13"
file_path: "tasks/feat-publish-pipeline/sys-publish-pipeline-p13.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-30T12:25:36Z","origin_kind":"system-dev-planner","source_digest":"845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d","source_path":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "apps/hub は cloudflare-workers/hub 上の実デプロイ単位であり、P13 は publish endpoint の本番デプロイと full smoke test を実施する release-deploy タスクとして literal に適用される"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-publish-pipeline/sys-publish-pipeline-p13.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---


# リリース/デプロイ — apps/hub publish endpoint 本番デプロイと full smoke test

> task projection (P13 / parent: feat-publish-pipeline)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d`
- task spec: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d`
- task spec SHA-256: `sha256:529deb95319875808b90bedbfe32614ca84c0d34a62c34c02a2922606ac4e027`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/dev-graph-registration-receipt.json`

## 依存

- `SYS-PUBLISH-PIPELINE-P12`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publish-pipeline` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
