---
graph_node_id: "SYS-AUTH-TENANCY-P09"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-auth-tenancy"
domain: "quality"
tags: ["feat-auth-tenancy","macro-feature","security","quality-assurance"]
priority: null
start_date: null
target_date: null
iteration: null
title: "品質保証 — CI 品質ゲート (tenant 分離・adapter 境界隔離・dev provider 非存在・認可判定単一集約) の確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:10:09Z"
updated_at: "2026-07-19T14:10:09Z"
status: "active"
depends_on: ["SYS-AUTH-TENANCY-P08"]
related_nodes: ["feat-auth-tenancy","arch-harness-hub-security","arch-harness-hub-backend"]
resource_scope: ["apps/hub/scripts/","apps/hub/src/app/api/v1/device/","apps/hub/src/app/api/v1/token/","docs/features/feat-auth-tenancy/quality-assurance-report.md","packages/schemas/auth-tenancy/"]
purpose: "feat-auth-tenancy の P09 を実行する: 品質保証 — CI 品質ゲート (tenant 分離・adapter 境界隔離・dev provider 非存在・認可判定単一集約) の確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/scripts/","apps/hub/src/app/api/v1/device/","apps/hub/src/app/api/v1/token/","docs/features/feat-auth-tenancy/quality-assurance-report.md","packages/schemas/auth-tenancy/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["quality-assurance-report.md に CI 品質ゲート (テナント分離・adapter 境界隔離・認可判定単一集約・dev provider 非存在・secret scan) の全項目 pass が記載されている","現行feature context sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5のscope_in/acceptance全件をP09責務として追跡し、未割当0件である","Normative closure: 本 package が所有するのは Hub 側 Device Authorization Flow（code/approve/token、短命 access token、refresh rotation/reuse detection、本人・管理者失効）である。OS 資格情報保存は feat-publisher-plugin が所有する consumer 実装であり、auth package は保存 API を実装したと偽らず、token response/rotation/revocation の公開 contract と downstream evidence key を提供する。Device Flow acceptance は Hub E2E（承認→発行→rotation→失効）で判定し、macOS Keychain/Windows Credential Manager は publisher package の E2E evidence を相互参照する。循環依存は作らない。 Evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: "feat-auth-tenancy"
feature_package_id: "feature-package/feat-auth-tenancy"
phase_ref: "P09"
file_path: "tasks/feat-auth-tenancy/sys-auth-tenancy-p09.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:10:09Z","origin_kind":"system-dev-planner","source_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","source_path":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/task-specs/phase-09-quality-assurance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P08 の adapter 境界整理後、CI 品質ゲート (テナント分離 CI 必須・adapter 境界隔離検査・dev provider 非存在検査・認可判定単一集約検査・secret scan) を確認する P09 品質保証タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-auth-tenancy/sys-auth-tenancy-p09.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-15h.9","linked_at":"2026-07-18T01:41:59Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 品質保証 — CI 品質ゲート (tenant 分離・adapter 境界隔離・dev provider 非存在・認可判定単一集約) の確認

> task projection (P09 / parent: feat-auth-tenancy)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- task spec: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/task-specs/phase-09-quality-assurance.md`
- package digest: `sha256:98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- task spec SHA-256: `sha256:4a373649107a1d6d5e1c89a1fb2da11d225a71bb998cf80fcf7db5152b34bb7b`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/dev-graph-registration-receipt.json`

## 依存

- `SYS-AUTH-TENANCY-P08`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-auth-tenancy` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
