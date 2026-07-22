---
graph_node_id: "SYS-AUTH-TENANCY-P07"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-auth-tenancy"
domain: "quality"
tags: ["feat-auth-tenancy","macro-feature","security","acceptance"]
priority: null
start_date: null
target_date: null
iteration: null
title: "受入 — goal-spec acceptance 3 項目の確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:10:09Z"
updated_at: "2026-07-19T14:10:09Z"
status: "active"
depends_on: ["SYS-AUTH-TENANCY-P06"]
related_nodes: ["feat-auth-tenancy","arch-harness-hub-security","arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-auth-tenancy/acceptance-record.md"]
purpose: "feat-auth-tenancy の P07 を実行する: 受入 — goal-spec acceptance 3 項目の確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-auth-tenancy/acceptance-record.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["acceptance-record.md に goal-spec acceptance 3 件全ての確認結果 (pass) と証跡が記載されている","現行feature context sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5のscope_in/acceptance全件をP07責務として追跡し、未割当0件である","Normative closure: 本 package が所有するのは Hub 側 Device Authorization Flow（code/approve/token、短命 access token、refresh rotation/reuse detection、本人・管理者失効）である。OS 資格情報保存は feat-publisher-plugin が所有する consumer 実装であり、auth package は保存 API を実装したと偽らず、token response/rotation/revocation の公開 contract と downstream evidence key を提供する。Device Flow acceptance は Hub E2E（承認→発行→rotation→失効）で判定し、macOS Keychain/Windows Credential Manager は publisher package の E2E evidence を相互参照する。循環依存は作らない。 Evidence: P04/P06 は server-side Device Flow と downstream token contract を別 test ID に分け、P10/P11 は auth 自身の証跡と publisher consumer evidence reference を混同せず記録する。"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: "feat-auth-tenancy"
feature_package_id: "feature-package/feat-auth-tenancy"
phase_ref: "P07"
file_path: "tasks/feat-auth-tenancy/sys-auth-tenancy-p07.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:10:09Z","origin_kind":"system-dev-planner","source_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","source_path":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/task-specs/phase-07-acceptance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "P06 で green 化したテスト結果を基に goal-spec acceptance 3 件の充足を確認する P07 受入タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-auth-tenancy/sys-auth-tenancy-p07.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-15h.7","linked_at":"2026-07-18T01:41:57Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 受入 — goal-spec acceptance 3 項目の確認

> task projection (P07 / parent: feat-auth-tenancy)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- task spec: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/task-specs/phase-07-acceptance.md`
- package digest: `sha256:98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- task spec SHA-256: `sha256:7f1eb503e524cf92bb059e7af9acc6043066c0aa5aef19291d01f6768d3445a5`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/dev-graph-registration-receipt.json`

## 依存

- `SYS-AUTH-TENANCY-P06`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-auth-tenancy` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
