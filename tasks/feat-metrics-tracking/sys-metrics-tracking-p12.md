---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p12.md", "confidence": 0.83}]
classification_confidence: 0.83
classification_reason: P11 の evidence bundle を踏まえ、ingest/rollup cron 運用・Turso 使用量監視・異常検知通知・S09/S16 の運用 runbook を作成する P12 ドキュメント/運用タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P11"]
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p12.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P12
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P12
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-metrics-tracking/runbook.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-12-documentation-operations.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "documentation", "operations"]
target_date: null
template_id: task
template_version: 1.0.0
title: ドキュメント/運用 — ingest/rollup cron 運用・Turso 使用量監視・異常検知通知・S09/S16 運用手順の runbook 作成
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P12 を実行する: ドキュメント/運用 — ingest/rollup cron 運用・Turso 使用量監視・異常検知通知・S09/S16 運用手順の runbook 作成
goal: Workers cron (日次事前集計・週次確定・Turso 使用量日次監視・実行回数異常検知) の運用手順、S09/S16 の運用 (障害時の rollup 再実行手順を含む) を runbook として文書化し、運用チームが参照できる状態にする。
scope_in: ["docs/features/feat-metrics-tracking/runbook.md"]
scope_out: ["cron 実装自体の変更 (P05 で完結済み、本 task は運用文書化のみ)", "保持期間導入の実施判断 (R4-reopen として別途扱う。本 task は再検討条件の記録のみ)"]
acceptance: ["runbook.md に cron 運用手順・監視閾値・異常検知対応・rollup 再実行手順が過不足なく記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# ドキュメント/運用 — ingest/rollup cron 運用・Turso 使用量監視・異常検知通知・S09/S16 運用手順の runbook 作成

> task projection (P12 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-12-documentation-operations.md`

## 依存

- SYS-METRICS-TRACKING-P11

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P12)
