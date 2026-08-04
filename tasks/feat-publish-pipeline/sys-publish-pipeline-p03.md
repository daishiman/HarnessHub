---
graph_node_id: "SYS-PUBLISH-PIPELINE-P03"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-publish-pipeline"
domain: "quality"
tags: ["feat-publish-pipeline","macro-feature","quality","design-review"]
priority: null
start_date: null
target_date: null
iteration: null
title: "独立設計レビュー — スキーマ owner 境界・状態機械設計・検査 pipeline 設計の妥当性確認"
owners: ["daishiman"]
created_at: "2026-07-30T12:25:36Z"
updated_at: "2026-08-04T03:38:21.799250Z"
status: "active"
depends_on: ["SYS-PUBLISH-PIPELINE-P02"]
related_nodes: ["feat-publish-pipeline","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
resource_scope: ["docs/features/feat-publish-pipeline/design-review-notes.md"]
purpose: "feat-publish-pipeline の P03 を実行する: 独立設計レビュー — スキーマ owner 境界・状態機械設計・検査 pipeline 設計の妥当性確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-publish-pipeline/design-review-notes.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["design-review-notes.md に 3 系統の cross-feature 境界判断根拠の検証結果と、状態機械・検査 pipeline・単一認可ミドルウェア消費・TargetChannel 直列化の各設計の妥当性確認結果が記載されている","現行feature context sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41のscope_in/acceptance全件をP03責務として追跡し、未割当0件である","Normative closure: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。 Evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
parent_feature: "feat-publish-pipeline"
feature_package_id: "feature-package/feat-publish-pipeline"
phase_ref: "P03"
file_path: "tasks/feat-publish-pipeline/sys-publish-pipeline-p03.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-30T12:25:36Z","origin_kind":"system-dev-planner","source_digest":"845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d","source_path":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/task-specs/phase-03-design-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.88
classification_reason: "P02 の architecture decision (スキーマ owner 境界・単一認可ミドルウェア owner・検査 pipeline owner・状態機械実装方式) を P02 実行者から独立した視点で検証する P03 レビュータスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-publish-pipeline/sys-publish-pipeline-p03.md","confidence":0.88}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-krc7.3","linked_at":"2026-08-04T03:13:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 独立設計レビュー — スキーマ owner 境界・状態機械設計・検査 pipeline 設計の妥当性確認

> task projection (P03 / parent: feat-publish-pipeline)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d`
- task spec: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/task-specs/phase-03-design-review.md`
- package digest: `sha256:845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d`
- task spec SHA-256: `sha256:07d1ac6ad6f3dce7711bf1fe55e441772eabc2d81c28fcbbc4dd8f09c87debd1`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/dev-graph-registration-receipt.json`

## 依存

- `SYS-PUBLISH-PIPELINE-P02`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publish-pipeline` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
