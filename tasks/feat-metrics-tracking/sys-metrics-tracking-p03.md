---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p03.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P02 の architecture decision (試算エンジン owner 確定・スキーマ・API 契約) を P02 実行者から独立した視点で検証する P03 レビュータスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P02"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p03.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P03
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P03
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/design-review-notes.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-03-design-review.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "design-review"]
target_date: null
template_id: task
template_version: 1.0.0
title: 独立設計レビュー — MetricsEvent/MetricsRollup スキーマ・認可設計・試算エンジン owner 決定・S09/S16 rollup 読取専用設計の妥当性確認
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P03 を実行する: 独立設計レビュー — MetricsEvent/MetricsRollup スキーマ・認可設計・試算エンジン owner 決定・S09/S16 rollup 読取専用設計の妥当性確認
goal: P02 で確定した architecture decision (試算エンジン owner・metrics_events/metrics_rollups スキーマ・ingest/summary/rollups API 契約・S09/S16 rollup 読取専用設計) を、設計者から独立した視点でレビューし、判断根拠の妥当性と quality_constraints 8 件との整合性を確認する。
scope_in: ["docs/features/feat-metrics-tracking/design-review-notes.md"]
scope_out: ["architecture-decision-record.md 自体の書き換え (P02 の成果物を直接修正しない。指摘事項は design-review-notes.md に記録し、P02 への差し戻しは Rollback trigger 経由で行う)", "実装コードの作成 (本 task はレビューのみ)", "docs/shared-layers.md の書き換え (P02 と同様に本 feature package の write_scope 外)"]
acceptance: ["design-review-notes.md に試算エンジン owner 判断根拠の検証結果と quality_constraints 8 件との整合確認が記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# 独立設計レビュー — MetricsEvent/MetricsRollup スキーマ・認可設計・試算エンジン owner 決定・S09/S16 rollup 読取専用設計の妥当性確認

> task projection (P03 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-03-design-review.md`

## 依存

- SYS-METRICS-TRACKING-P02

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P03)
