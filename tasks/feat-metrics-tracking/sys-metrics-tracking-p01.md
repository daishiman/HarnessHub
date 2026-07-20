---
graph_node_id: "SYS-METRICS-TRACKING-P01"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-metrics-tracking"
domain: "documentation"
tags: ["feat-metrics-tracking","studio-extension","metrics-tracking","requirements-baseline"]
priority: null
start_date: null
target_date: null
iteration: null
title: "効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード) 要件ベースライン確定"
owners: ["daishiman"]
created_at: "2026-07-19T14:16:35Z"
updated_at: "2026-07-19T14:16:35Z"
status: "active"
depends_on: []
related_nodes: ["feat-metrics-tracking","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/requirements-baseline.md"]
purpose: "feat-metrics-tracking の P01 を実行する: 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード) 要件ベースライン確定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-metrics-tracking/requirements-baseline.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-metrics-tracking/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件が過不足なく転記されている","現行feature context sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759のscope_in/acceptance全件をP01責務として追跡し、未割当0件である","Normative closure: packages/estimation のpackage boundary/public contractは feat-hub-foundation が単一ownerとして確立し、metricsはformula/rollupというdomain logicを提供・消費する。共通package ownerをmetricsへ上書きしない。consumerはmetricsだけではなく hearingのsheetEstimateも含む。metricsEstimate/sheetEstimateは同じ純関数primitivesを参照し、クライアント金額計算を禁止する。 Evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-frontend"]
parent_feature: "feat-metrics-tracking"
feature_package_id: "feature-package/feat-metrics-tracking"
phase_ref: "P01"
file_path: "tasks/feat-metrics-tracking/sys-metrics-tracking-p01.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:16:35Z","origin_kind":"system-dev-planner","source_digest":"03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256","source_path":".dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256/task-specs/phase-01-requirements.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "goal-spec (goal-spec.json) と features/feat-metrics-tracking.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-metrics-tracking/sys-metrics-tracking-p01.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-lm7.1","linked_at":"2026-07-18T01:46:14Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード) 要件ベースライン確定

> task projection (P01 / parent: feat-metrics-tracking)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256`
- task spec: `.dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256/task-specs/phase-01-requirements.md`
- package digest: `sha256:03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256`
- task spec SHA-256: `sha256:94d24227120b368ac08d5f1c6bee9873f653c8620cc29a8b4a62c4106b20b3ad`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-metrics-tracking/03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256/dev-graph-registration-receipt.json`

## 依存

- feature内依存なし。P01の場合はparent featureのmacro entry gateを実行時に評価する。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
