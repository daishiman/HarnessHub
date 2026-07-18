---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p05.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P02/P04 で確定した設計とテストスタブに基づき MetricsEvent/MetricsRollup スキーマ・API・cron・試算エンジン・S09/S16 画面を実装する P05 実装タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P04"]
domain: backend
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P05
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P05
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["apps/hub/src/app/(dashboard)/metrics/", "apps/hub/src/features/metrics-tracking/", "packages/schemas/metrics-tracking/", "packages/db/schema/metrics-tracking/", "packages/estimation/"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "implementation"]
target_date: null
template_id: task
template_version: 1.0.0
title: 実装 — MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面の実装
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P05 を実行する: 実装 — MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面の実装
goal: P02 の architecture decision と P04 のテストスタブに基づき、MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面を実装し、P04 のテストが通る状態にする。
scope_in: ["apps/hub/src/app/(dashboard)/metrics/", "apps/hub/src/features/metrics-tracking/", "packages/schemas/metrics-tracking/", "packages/db/schema/metrics-tracking/", "packages/estimation/"]
scope_out: ["クライアント側での金額換算・自己申告実装 (SEC5 で禁止)", "外部 BI 連携実装", "S17 画面実装 (owner=feat-user-org-admin)", "チャート共通部品自体の実装 (owner=hub-foundation、本 task は消費のみ)", "`tenant_coefficients` テーブルの新規実装 (owner=feat-user-org-admin、本 task は読取 consume のみ)", "テストの実行と結果記録 (P06 で行う)"]
acceptance: ["P04 で作成したテストスタブが実装コードに対して解決可能な状態 (import 解決・型整合) になっている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# 実装 — MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面の実装

> task projection (P05 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-05-implementation.md`

## 依存

- SYS-METRICS-TRACKING-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P05)
