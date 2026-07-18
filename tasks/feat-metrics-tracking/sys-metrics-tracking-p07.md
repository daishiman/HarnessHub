---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p07.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: P06 で green 化したテスト結果を基に goal-spec acceptance 3 件の充足を確認する P07 受入タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P06"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p07.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P07
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P07
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/acceptance-record.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-07-acceptance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "acceptance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 受入 — goal-spec acceptance 3 項目の確認
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P07 を実行する: 受入 — goal-spec acceptance 3 項目の確認
goal: goal-spec の acceptance 3 件 (ingest 短命 token + 冪等キーで重複計上しない、金額換算がサーバ側のみで行われる、S09/S16 が rollup 由来のデータで描画され CWV good を維持する) が P05/P06 の成果物によって満たされていることを確認し、受入判定を記録する。
scope_in: ["docs/features/feat-metrics-tracking/acceptance-record.md"]
scope_out: ["実装コードの修正 (acceptance 不充足時の修正は P05 への差し戻しで行う)", "リファクタリング・マイグレーション作業 (P08 で行う)"]
acceptance: ["acceptance-record.md に goal-spec acceptance 3 件全ての確認結果 (pass) と証跡が記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# 受入 — goal-spec acceptance 3 項目の確認

> task projection (P07 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-07-acceptance.md`

## 依存

- SYS-METRICS-TRACKING-P06

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P07)
