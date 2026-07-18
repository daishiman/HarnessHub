---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p01.md", "confidence": 0.92}]
classification_confidence: 0.92
classification_reason: goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-metrics-tracking.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: []
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p01.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P01
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P01
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/requirements-baseline.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-01-requirements.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "requirements-baseline"]
target_date: null
template_id: task
template_version: 1.0.0
title: 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード) 要件ベースライン確定
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P01 を実行する: 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード) 要件ベースライン確定
goal: feat-metrics-tracking の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (MetricsEvent/MetricsRollup エンティティ・短命 token + 冪等キー ingest・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 ダッシュボード) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 6 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件が machine-verifiable な baseline 文書として固定される。
scope_in: ["docs/features/feat-metrics-tracking/requirements-baseline.md"]
scope_out: ["クライアント側での金額換算・自己申告 (goal-spec scope_out。SEC5 で禁止)", "外部 BI 連携 (goal-spec scope_out)", "S17 画面実装・role 管理・年収係数 PII ガード (owner=feat-user-org-admin。本 feature は rollup 供給までがスコープ)", "チャート共通部品自体の実装 (owner=hub-foundation。本 feature は消費のみ)", "試算エンジン owner の最終確定 (本 task は未解決事項の記録のみ。確定判断は P02 で行う)", "実装コードの作成 (本 task は要件確定のみ)"]
acceptance: ["docs/features/feat-metrics-tracking/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件が過不足なく転記されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード) 要件ベースライン確定

> task projection (P01 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-01-requirements.md`

## 依存

- なし (feature 内の先頭 phase)

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P01)
