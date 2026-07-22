---
graph_node_id: "SYS-WORKSPACE-GOVERNANCE-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-workspace-governance"
domain: "data"
tags: ["feat-workspace-governance","macro-feature","data","refactoring-migration"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リファクタリング/マイグレーション — governance_policies新設テーブル・audit_events追加action(governance.policy_change)の既存基盤互換移行"
owners: ["daishiman"]
created_at: "2026-07-19T14:21:39Z"
updated_at: "2026-07-19T14:21:39Z"
status: "active"
depends_on: ["SYS-WORKSPACE-GOVERNANCE-P07"]
related_nodes: ["feat-workspace-governance","arch-harness-hub-security"]
resource_scope: ["packages/db/migrations/","docs/features/feat-workspace-governance/refactoring-migration-note.md"]
purpose: "feat-workspace-governance の P08 を実行する: リファクタリング/マイグレーション — governance_policies新設テーブル・audit_events追加action(governance.policy_change)の既存基盤互換移行"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["packages/db/migrations/","docs/features/feat-workspace-governance/refactoring-migration-note.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["refactoring-migration-note.md に governance_policiesテーブルのadditive migration適用手順と、既存audit_events hash chain(seq/prev_hash/event_hash)への governance.policy_change action追加が既存action記録契約を破壊しないことの確認結果が記載されている","現行feature context sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1のscope_in/acceptance全件をP08責務として追跡し、未割当0件である"]
architecture_refs: ["arch-harness-hub-security"]
parent_feature: "feat-workspace-governance"
feature_package_id: "feature-package/feat-workspace-governance"
phase_ref: "P08"
file_path: "tasks/feat-workspace-governance/sys-workspace-governance-p08.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:21:39Z","origin_kind":"system-dev-planner","source_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","source_path":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.83
classification_reason: "governance_policiesテナントスコープテーブルの新規additive migrationと、既存audit_eventsテーブル(feat-domain-model-db/feat-auth-tenancy所有のhash chain基盤を共有するinfrastructure)へgovernance.policy_change actionを追加するnon-destructive migrationを既存publish.approve/publish.reject/user.role_change actionの記録契約を壊さずに適用するP08マイグレーションタスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-workspace-governance/sys-workspace-governance-p08.md","confidence":0.83}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5l3.8","linked_at":"2026-07-19T14:22:01Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リファクタリング/マイグレーション — governance_policies新設テーブル・audit_events追加action(governance.policy_change)の既存基盤互換移行

> task projection (P08 / parent: feat-workspace-governance)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10`
- task spec: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/task-specs/phase-08-refactoring-migration.md`
- package digest: `sha256:b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10`
- task spec SHA-256: `sha256:053f815a107290eadd69dba6270b445e1098e21668c790e75755b4a604fda831`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/dev-graph-registration-receipt.json`

## 依存

- `SYS-WORKSPACE-GOVERNANCE-P07`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-workspace-governance` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
