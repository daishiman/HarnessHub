---
graph_node_id: "SYS-AUTH-TENANCY-P12"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-auth-tenancy"
domain: "documentation"
tags: ["feat-auth-tenancy","macro-feature","security","documentation","operations"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ドキュメント/運用 — 緊急失効・Device Flow token 監視・OIDC provider 追加の runbook 作成"
owners: ["daishiman"]
created_at: "2026-07-19T14:10:09Z"
updated_at: "2026-07-19T14:10:09Z"
status: "active"
depends_on: ["SYS-AUTH-TENANCY-P11"]
related_nodes: ["feat-auth-tenancy","arch-harness-hub-security","arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-auth-tenancy/runbook.md"]
purpose: "feat-auth-tenancy の P12 を実行する: ドキュメント/運用 — 緊急失効・Device Flow token 監視・OIDC provider 追加の runbook 作成"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-auth-tenancy/runbook.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["runbook.md に session 緊急失効・Device Flow token 棚卸し/失効・OIDC provider 登録 (新規テナント/Dev tenant)・row-level-scope revisit 条件監視の 5 手順が過不足なく記載されている","現行feature context sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5のscope_in/acceptance全件をP12責務として追跡し、未割当0件である","Normative closure: 本 package が所有するのは Hub 側 Device Authorization Flow（code/approve/token、短命 access token、refresh rotation/reuse detection、本人・管理者失効）である。OS 資格情報保存は feat-publisher-plugin が所有する consumer 実装であり、auth package は保存 API を実装したと偽らず、token response/rotation/revocation の公開 contract と downstream evidence key を提供する。Device Flow acceptance は Hub E2E（承認→発行→rotation→失効）で判定し、macOS Keychain/Windows Credential Manager は publisher package の E2E evidence を相互参照する。循環依存は作らない。 Evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: "feat-auth-tenancy"
feature_package_id: "feature-package/feat-auth-tenancy"
phase_ref: "P12"
file_path: "tasks/feat-auth-tenancy/sys-auth-tenancy-p12.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:10:09Z","origin_kind":"system-dev-planner","source_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","source_path":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/task-specs/phase-12-documentation-operations.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.83
classification_reason: "P11 の evidence bundle を踏まえ、session 緊急失効・Device Flow token 棚卸し/失効・OIDC provider 登録・row-level-scope revisit 条件監視の運用 runbook を作成する P12 ドキュメント/運用タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-auth-tenancy/sys-auth-tenancy-p12.md","confidence":0.83}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-15h.12","linked_at":"2026-07-18T01:42:02Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# ドキュメント/運用 — 緊急失効・Device Flow token 監視・OIDC provider 追加の runbook 作成

> task projection (P12 / parent: feat-auth-tenancy)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- task spec: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/task-specs/phase-12-documentation-operations.md`
- package digest: `sha256:98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- task spec SHA-256: `sha256:d003d14803530375540f881ccd187233bcb83ac6efec529c0be5d74048a02858`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/dev-graph-registration-receipt.json`

## 依存

- `SYS-AUTH-TENANCY-P11`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
