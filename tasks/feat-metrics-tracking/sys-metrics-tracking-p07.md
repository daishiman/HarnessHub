---
graph_node_id: "SYS-METRICS-TRACKING-P07"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-metrics-tracking"
domain: "quality"
tags: ["feat-metrics-tracking","studio-extension","metrics-tracking","acceptance"]
priority: null
start_date: null
target_date: null
iteration: null
title: "受入 — goal-spec acceptance 3 項目の確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:16:35Z"
updated_at: "2026-07-19T14:16:35Z"
status: "active"
depends_on: ["SYS-METRICS-TRACKING-P06"]
related_nodes: ["feat-metrics-tracking","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/acceptance-record.md"]
purpose: "feat-metrics-tracking の P07 を実行する: 受入 — goal-spec acceptance 3 項目の確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-metrics-tracking/acceptance-record.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["acceptance-record.md に goal-spec acceptance 3 件全ての確認結果 (pass) と証跡が記載されている","現行feature context sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759のscope_in/acceptance全件をP07責務として追跡し、未割当0件である"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-frontend"]
parent_feature: "feat-metrics-tracking"
feature_package_id: "feature-package/feat-metrics-tracking"
phase_ref: "P07"
file_path: "tasks/feat-metrics-tracking/sys-metrics-tracking-p07.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:16:35Z","origin_kind":"system-dev-planner","source_digest":"03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256","source_path":".dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256/task-specs/phase-07-acceptance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "P06 で green 化したテスト結果を基に goal-spec acceptance 3 件の充足を確認する P07 受入タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-metrics-tracking/sys-metrics-tracking-p07.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-lm7.7","linked_at":"2026-07-18T01:46:21Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 受入 — goal-spec acceptance 3 項目の確認

> task projection (P07 / parent: feat-metrics-tracking)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256`
- task spec: `.dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256/task-specs/phase-07-acceptance.md`
- package digest: `sha256:03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256`
- task spec SHA-256: `sha256:fc74a8ab0e840dc41eac4a36ff16b88d8256c16d374c7de0f55eb35d97339dff`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256/dev-graph-registration-receipt.json`

## 依存

- `SYS-METRICS-TRACKING-P06`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-metrics-tracking` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
