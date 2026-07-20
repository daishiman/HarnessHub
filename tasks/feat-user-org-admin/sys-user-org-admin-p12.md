---
graph_node_id: "SYS-USER-ORG-ADMIN-P12"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-user-org-admin"
domain: "documentation"
tags: ["feat-user-org-admin","studio-extension","security","documentation-operations"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化"
owners: ["daishiman"]
created_at: "2026-07-19T14:20:53Z"
updated_at: "2026-07-19T14:20:53Z"
status: "active"
depends_on: ["SYS-USER-ORG-ADMIN-P11"]
related_nodes: ["feat-user-org-admin","arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/runbook.md"]
purpose: "feat-user-org-admin の P12 を実行する: ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-user-org-admin/runbook.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-user-org-admin/runbook.md にPIIガード運用・監査ログ確認・通知ディスパッチ監視・障害対応・ロールバックの5手順が記載されている","現行feature context sha256:4271086e4eacd8a7327ab3fc9b9e080b2d024ac66858b2a4965d0afbda33a265のscope_in/acceptance全件をP12責務として追跡し、未割当0件である","規約・ポリシー更新ownerと /legal 内容更新手順をrunbook/handoverへ含める。","Normative closure: 現行 quality_constraints は legal-static-page-all-users を含む9件である。P01で9 IDをexact-set転記し、P04/P06は/legalの全role access・非ログイン方針・静的内容・axe=0・salary/PII非露出を検証する。P07/P09/P10/P11は第3 acceptanceと第9制約を同じevidence IDで追跡し、P05で実装、P12で内容更新owner、P13でroute smokeを確認する。 Evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
parent_feature: "feat-user-org-admin"
feature_package_id: "feature-package/feat-user-org-admin"
phase_ref: "P12"
file_path: "tasks/feat-user-org-admin/sys-user-org-admin-p12.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:20:53Z","origin_kind":"system-dev-planner","source_digest":"2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14","source_path":".dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/task-specs/phase-12-documentation-operations.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "P13の本番反映に先立ちS17/S18のPIIガード運用・通知ディスパッチ運用のrunbookを整備するP12タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-user-org-admin/sys-user-org-admin-p12.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xwt.12","linked_at":"2026-07-18T01:47:04Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化

> task projection (P12 / parent: feat-user-org-admin)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14`
- task spec: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/task-specs/phase-12-documentation-operations.md`
- package digest: `sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14`
- task spec SHA-256: `sha256:69816b0701f8f5718f574acf2e4c792a58d6af0f3e95f1550f513e063596ea61`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/dev-graph-registration-receipt.json`

## 依存

- `SYS-USER-ORG-ADMIN-P11`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
