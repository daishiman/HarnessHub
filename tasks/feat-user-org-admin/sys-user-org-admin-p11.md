---
graph_node_id: "SYS-USER-ORG-ADMIN-P11"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-user-org-admin"
domain: "quality"
tags: ["feat-user-org-admin","studio-extension","security","evidence"]
priority: null
start_date: null
target_date: null
iteration: null
title: "エビデンス収集 — acceptance根拠・監査ログ・分離テスト結果の証跡集約"
owners: ["daishiman"]
created_at: "2026-07-19T14:20:53Z"
updated_at: "2026-07-19T14:20:53Z"
status: "active"
depends_on: ["SYS-USER-ORG-ADMIN-P10"]
related_nodes: ["feat-user-org-admin","arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/evidence/"]
purpose: "feat-user-org-admin の P11 を実行する: エビデンス収集 — acceptance根拠・監査ログ・分離テスト結果の証跡集約"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-user-org-admin/evidence/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-user-org-admin/evidence/index.md にP06/P07/P09/P10の一次証跡への参照が明記されている","現行feature context sha256:4271086e4eacd8a7327ab3fc9b9e080b2d024ac66858b2a4965d0afbda33a265のscope_in/acceptance全件をP11責務として追跡し、未割当0件である","/legal role matrix、axe結果、PII非露出をevidence bundleへ含める。","Normative closure: 現行 quality_constraints は legal-static-page-all-users を含む9件である。P01で9 IDをexact-set転記し、P04/P06は/legalの全role access・非ログイン方針・静的内容・axe=0・salary/PII非露出を検証する。P07/P09/P10/P11は第3 acceptanceと第9制約を同じevidence IDで追跡し、P05で実装、P12で内容更新owner、P13でroute smokeを確認する。 Evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
parent_feature: "feat-user-org-admin"
feature_package_id: "feature-package/feat-user-org-admin"
phase_ref: "P11"
file_path: "tasks/feat-user-org-admin/sys-user-org-admin-p11.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:20:53Z","origin_kind":"system-dev-planner","source_digest":"2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14","source_path":".dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/task-specs/phase-11-evidence.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.86
classification_reason: "P06〜P10の実行結果・判定記録を再現可能な証跡として収集・保存するP11タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-user-org-admin/sys-user-org-admin-p11.md","confidence":0.86}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xwt.11","linked_at":"2026-07-18T01:47:03Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# エビデンス収集 — acceptance根拠・監査ログ・分離テスト結果の証跡集約

> task projection (P11 / parent: feat-user-org-admin)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14`
- task spec: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/task-specs/phase-11-evidence.md`
- package digest: `sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14`
- task spec SHA-256: `sha256:b727b517ad127f74f5f469ce56cba911c253bc063be2ed21e71f4cfbf63addcf`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/dev-graph-registration-receipt.json`

## 依存

- `SYS-USER-ORG-ADMIN-P10`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-user-org-admin` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
