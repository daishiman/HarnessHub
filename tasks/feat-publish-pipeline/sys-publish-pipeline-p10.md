---
graph_node_id: "SYS-PUBLISH-PIPELINE-P10"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-publish-pipeline"
domain: "quality"
tags: ["feat-publish-pipeline","macro-feature","quality","final-review"]
priority: null
start_date: null
target_date: null
iteration: null
title: "独立最終レビュー — quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断の独立確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:17:23Z"
updated_at: "2026-07-19T14:17:23Z"
status: "active"
depends_on: ["SYS-PUBLISH-PIPELINE-P09"]
related_nodes: ["feat-publish-pipeline","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
resource_scope: ["docs/features/feat-publish-pipeline/final-review-record.md"]
purpose: "feat-publish-pipeline の P10 を実行する: 独立最終レビュー — quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断の独立確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-publish-pipeline/final-review-record.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["final-review-record.md に quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断 3 件全ての最終確認結果 (問題なし) が記載されている","現行feature context sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41のscope_in/acceptance全件をP10責務として追跡し、未割当0件である","Normative closure: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。 Evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
parent_feature: "feat-publish-pipeline"
feature_package_id: "feature-package/feat-publish-pipeline"
phase_ref: "P10"
file_path: "tasks/feat-publish-pipeline/sys-publish-pipeline-p10.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:17:23Z","origin_kind":"system-dev-planner","source_digest":"fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b","source_path":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/task-specs/phase-10-final-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.86
classification_reason: "P03 の設計時レビューとは独立して、実装完了後の quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断を最終確認する P10 独立最終レビュータスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-publish-pipeline/sys-publish-pipeline-p10.md","confidence":0.86}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dfm.10","linked_at":"2026-07-18T16:04:27Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 独立最終レビュー — quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断の独立確認

> task projection (P10 / parent: feat-publish-pipeline)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b`
- task spec: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/task-specs/phase-10-final-review.md`
- package digest: `sha256:fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b`
- task spec SHA-256: `sha256:e772855e848e8b69039d45f88f33db8cee1ec2a00bc1b80f4645719bc3b6715d`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/dev-graph-registration-receipt.json`

## 依存

- `SYS-PUBLISH-PIPELINE-P09`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publish-pipeline` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
