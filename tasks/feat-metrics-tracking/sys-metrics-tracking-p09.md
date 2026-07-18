---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p09.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P08 のマイグレーション適用後、CI 品質ゲート (tenant 分離 CI 必須・認可マトリクス・bundle 予算・監査 event・cron 動作) を最終確認する P09 品質保証タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P08"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p09.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P09
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P09
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/quality-assurance-report.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-09-quality-assurance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "quality-assurance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 品質保証 — CI 品質ゲート (tenant 分離・認可・bundle 予算・監査・cron) の確認
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P09 を実行する: 品質保証 — CI 品質ゲート (tenant 分離・認可・bundle 予算・監査・cron) の確認
goal: P08 完了後の実装全体に対して CI 品質ゲート (tenant 分離テスト必須実行・dim=user 認可マトリクス・bundle 3MiB 予算・tenant_coefficients 変更監査 event・Workers cron 動作) を確認し、リリース判定前の品質基準を満たしていることを記録する。
scope_in: ["docs/features/feat-metrics-tracking/quality-assurance-report.md"]
scope_out: ["実装コードの修正 (品質ゲート不合格時の修正は P05 への差し戻しで行う)", "最終独立レビュー自体 (P10 で行う)"]
acceptance: ["quality-assurance-report.md に CI 品質ゲート (tenant 分離・認可マトリクス・bundle 予算・監査 event・cron) の全項目 pass が記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# 品質保証 — CI 品質ゲート (tenant 分離・認可・bundle 予算・監査・cron) の確認

> task projection (P09 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-09-quality-assurance.md`

## 依存

- SYS-METRICS-TRACKING-P08

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P09)
