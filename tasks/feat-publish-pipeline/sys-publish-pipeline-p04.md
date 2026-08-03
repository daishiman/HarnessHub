---
graph_node_id: "SYS-PUBLISH-PIPELINE-P04"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-publish-pipeline"
domain: "quality"
tags: ["feat-publish-pipeline","macro-feature","quality","test-design"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テストファースト設計 — 状態機械 property test・検査 pipeline 挙動同値テスト・直列化/監査テスト設計"
owners: ["daishiman"]
created_at: "2026-07-30T12:25:36Z"
updated_at: "2026-07-30T13:52:48.250425Z"
status: "active"
depends_on: ["SYS-PUBLISH-PIPELINE-P03"]
related_nodes: ["feat-publish-pipeline","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
resource_scope: ["apps/hub/tests/publish-pipeline/","apps/hub/src/app/api/v1/publish/","apps/hub/src/lib/publish/auth-principal.ts","docs/features/feat-publish-pipeline/test-design.md","packages/inspection/src/","packages/schemas/publish-pipeline/"]
purpose: "feat-publish-pipeline の P04 を実行する: テストファースト設計 — 状態機械 property test・検査 pipeline 挙動同値テスト・直列化/監査テスト設計"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/__tests__/publish-pipeline/","apps/hub/src/app/api/v1/publish/","apps/hub/src/lib/publish/auth-principal.ts","docs/features/feat-publish-pipeline/test-design.md","packages/inspection/src/__tests__/","packages/schemas/publish-pipeline/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-design.md に quality_constraints 9 件と acceptance 3 件全てに対応するテストケースが記載され、apps/hub/tests/publish-pipeline/ と packages/inspection/src/ に実行可能なテストが作成されている","現行feature context sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41のscope_in/acceptance全件をP04責務として追跡し、未割当0件である","Normative closure: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。 Evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
parent_feature: "feat-publish-pipeline"
feature_package_id: "feature-package/feat-publish-pipeline"
phase_ref: "P04"
file_path: "tasks/feat-publish-pipeline/sys-publish-pipeline-p04.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-30T12:25:36Z","origin_kind":"system-dev-planner","source_digest":"845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d","source_path":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/task-specs/phase-04-test-design.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "quality_constraints 9 件 (状態機械 property test・検査 pipeline 挙動同値・Green/Yellow/Red 判定・immutable Release/atomic rollback・R2 consumer・append-only 監査・REST zod/認可・TargetChannel 直列化・dual principal/CSRF 境界) をテストケースへ写像する P04 テストファースト設計タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-publish-pipeline/sys-publish-pipeline-p04.md","confidence":0.87}]
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

# テストファースト設計 — 状態機械 property test・検査 pipeline 挙動同値テスト・直列化/監査テスト設計

> task projection (P04 / parent: feat-publish-pipeline)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d`
- task spec: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/task-specs/phase-04-test-design.md`
- package digest: `sha256:845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d`
- task spec SHA-256: `sha256:ce1930ded8121ec605318046c5f6e5df0cf0df60d48dbc9f993a482ea0596d36`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/dev-graph-registration-receipt.json`

## 依存

- `SYS-PUBLISH-PIPELINE-P03`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publish-pipeline` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
