---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p11.md", "confidence": 0.84}]
classification_confidence: 0.84
classification_reason: P01〜P10 の全成果物を証跡として一元集約し、リリース判断とドキュメント化 (P12/P13) に必要な evidence bundle を作成する P11 エビデンス収集タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P10"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p11.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P11
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P11
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/evidence-summary.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-11-evidence.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "evidence"]
target_date: null
template_id: task
template_version: 1.0.0
title: エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P11 を実行する: エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約
goal: P01〜P10 で作成された全成果物 (要件ベースライン・architecture decision・設計レビュー・テスト設計・実装・テスト結果・受入記録・マイグレーション記録・品質保証報告・最終レビュー記録) を証跡として一元集約し、evidence bundle を作成する。
scope_in: ["docs/features/feat-metrics-tracking/evidence-summary.md"]
scope_out: ["新規テスト・レビューの実施 (本 task は既存成果物の集約のみ)", "運用文書・リリース作業 (P12/P13 で行う)"]
acceptance: ["evidence-summary.md に P01〜P10 全 10 成果物への参照リンクと quality_constraints 8 件の最終充足サマリが記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約

> task projection (P11 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-11-evidence.md`

## 依存

- SYS-METRICS-TRACKING-P10

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P11)
