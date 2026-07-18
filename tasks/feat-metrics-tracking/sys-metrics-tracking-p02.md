---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p02.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: MetricsEvent/MetricsRollup のスキーマ・API 契約・cron 設計に加え、試算エンジン実装 owner の食い違い (docs/shared-layers.md §2 vs 本 feature scope_in) を解消する P02 architecture decision タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P01"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P02
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P02
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/architecture-decision-record.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "architecture-decision"]
target_date: null
template_id: task
template_version: 1.0.0
title: アーキテクチャ設計 — MetricsEvent/MetricsRollup スキーマ・ingest/rollup/summary API 契約・試算エンジン owner 確定・S09/S16 画面構成設計
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P02 を実行する: アーキテクチャ設計 — MetricsEvent/MetricsRollup スキーマ・ingest/rollup/summary API 契約・試算エンジン owner 確定・S09/S16 画面構成設計
goal: MetricsEvent/MetricsRollup のスキーマ・ingest/summary/rollups API 契約・Workers cron 週次 rollup・S09/S16 画面構成を設計するとともに、P01 で記録した試算エンジン実装 owner の未解決事項 (estimation-engine-single-pure-function-owner-unresolved) を本 task の architecture decision として確定する。
scope_in: ["docs/features/feat-metrics-tracking/architecture-decision-record.md"]
scope_out: ["docs/shared-layers.md 自体の書き換え実行 (本 feature package の write_scope 外。決定記録のみ行い、実際の反映は follow-up として dev-graph へ差し戻す)", "`tenant_coefficients` テーブルの新規作成 (owner=feat-user-org-admin。本 feature は読取 consume のみ)", "チャート共通部品自体の実装 (owner=hub-foundation)", "S17 画面設計 (owner=feat-user-org-admin)", "実装コードの作成 (本 task は設計のみ、実装は P05)"]
acceptance: ["architecture-decision-record.md に試算エンジン owner 確定の判断基準・影響範囲・訂正先が明記され、metrics_events/metrics_rollups カラム一覧・API 契約 3 件・cron 段構成・S09/S16 画面構成表が記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# アーキテクチャ設計 — MetricsEvent/MetricsRollup スキーマ・ingest/rollup/summary API 契約・試算エンジン owner 確定・S09/S16 画面構成設計

> task projection (P02 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-02-architecture.md`

## 依存

- SYS-METRICS-TRACKING-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P02)
