---
graph_node_id: "SYS-USER-ORG-ADMIN-P04"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-user-org-admin"
domain: "quality"
tags: ["feat-user-org-admin","studio-extension","security","test-design"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テスト設計 — salary非露出分離テスト・監査記録テスト・axe a11yテストの設計"
owners: ["daishiman"]
created_at: "2026-07-19T14:20:53Z"
updated_at: "2026-07-19T14:20:53Z"
status: "active"
depends_on: ["SYS-USER-ORG-ADMIN-P03"]
related_nodes: ["feat-user-org-admin","arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
resource_scope: ["apps/hub/src/app/legal/","apps/hub/src/app/legal/__tests__/","apps/hub/src/features/user-org-admin/__tests__/","docs/features/feat-user-org-admin/test-design.md"]
purpose: "feat-user-org-admin の P04 を実行する: テスト設計 — salary非露出分離テスト・監査記録テスト・axe a11yテストの設計"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/legal/","apps/hub/src/app/legal/__tests__/","apps/hub/src/features/user-org-admin/__tests__/","docs/features/feat-user-org-admin/test-design.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-user-org-admin/test-design.md に goal-spec acceptance 3件それぞれのtest種別と合否基準が明記されている","現行feature context sha256:4271086e4eacd8a7327ab3fc9b9e080b2d024ac66858b2a4965d0afbda33a265のscope_in/acceptance全件をP04責務として追跡し、未割当0件である","/legal の全role access、非ログイン方針、静的内容、axe 0、salary非露出をテストへ含める。","Normative closure: 現行 quality_constraints は legal-static-page-all-users を含む9件である。P01で9 IDをexact-set転記し、P04/P06は/legalの全role access・非ログイン方針・静的内容・axe=0・salary/PII非露出を検証する。P07/P09/P10/P11は第3 acceptanceと第9制約を同じevidence IDで追跡し、P05で実装、P12で内容更新owner、P13でroute smokeを確認する。 Evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
parent_feature: "feat-user-org-admin"
feature_package_id: "feature-package/feat-user-org-admin"
phase_ref: "P04"
file_path: "tasks/feat-user-org-admin/sys-user-org-admin-p04.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:20:53Z","origin_kind":"system-dev-planner","source_digest":"2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14","source_path":".dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/task-specs/phase-04-test-design.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.88
classification_reason: "承認済み設計を根拠に P05 実装前の salary 非露出・監査記録・axe a11y の test-first 受入契約を定義する P04 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-user-org-admin/sys-user-org-admin-p04.md","confidence":0.88}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xwt.4","linked_at":"2026-07-18T01:46:54Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# テスト設計 — salary非露出分離テスト・監査記録テスト・axe a11yテストの設計

> task projection (P04 / parent: feat-user-org-admin)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14`
- task spec: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/task-specs/phase-04-test-design.md`
- package digest: `sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14`
- task spec SHA-256: `sha256:539d5c1d53e8270af34ff9e54dbb540644aea4eae1b4b5d51c9bda5d3ba011fa`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-user-org-admin/2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14/dev-graph-registration-receipt.json`

## 依存

- `SYS-USER-ORG-ADMIN-P03`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
