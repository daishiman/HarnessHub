---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p08.md", "confidence": 0.83}]
classification_confidence: 0.83
classification_reason: P05 で実装した metrics_events/metrics_rollups スキーマに対する DB マイグレーション生成と、実装確定後の重複コード整理を行う P08 リファクタリング/マイグレーションタスク (required-node、N/A 許容)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P07"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P08
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P08
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-metrics-tracking/refactoring-migration-note.md", "packages/db/schema/metrics-tracking/"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "refactoring-migration"]
target_date: null
template_id: task
template_version: 1.0.0
title: リファクタリング/マイグレーション — metrics_events/metrics_rollups テーブルマイグレーション生成と後方互換性確認
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P08 を実行する: リファクタリング/マイグレーション — metrics_events/metrics_rollups テーブルマイグレーション生成と後方互換性確認
goal: P05 で実装した metrics_events/metrics_rollups の Drizzle スキーマに対する DB マイグレーションファイルを生成し、既存スキーマとの後方互換性 (新規テーブル追加のみで既存テーブルへの破壊的変更がないこと) を確認する。あわせて P07 受入完了後に判明した重複コードや設計との軽微な乖離があれば整理する。
scope_in: ["docs/features/feat-metrics-tracking/refactoring-migration-note.md", "packages/db/schema/metrics-tracking/"]
scope_out: ["共有スキーマファイル (feat-domain-model-db 管轄) への変更", "tenant_coefficients テーブルのマイグレーション (owner=feat-user-org-admin)", "新規機能の追加 (本 task はマイグレーション生成と軽微な整理のみ)"]
acceptance: ["refactoring-migration-note.md にマイグレーション内容と後方互換性確認結果 (既存テーブルへの破壊的変更なし) が記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# リファクタリング/マイグレーション — metrics_events/metrics_rollups テーブルマイグレーション生成と後方互換性確認

> task projection (P08 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-METRICS-TRACKING-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P08)
