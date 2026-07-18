---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p06.md", "confidence": 0.86}]
classification_confidence: 0.86
classification_reason: P05 の実装に対して P04 のテストスタブを実行し quality_constraints 8 件の充足状況を機械的に確認する P06 テスト実行タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P05"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p06.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P06
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P06
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/test-run-results.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-06-test-run.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "test-run"]
target_date: null
template_id: task
template_version: 1.0.0
title: テスト実行 — ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算テストの実行と結果記録
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P06 を実行する: テスト実行 — ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算テストの実行と結果記録
goal: P05 の実装に対して P04 で作成したテストスタブ (ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算・S17 契約・異常検知 cron) を実行し、全て green であることを確認して結果を記録する。
scope_in: ["docs/features/feat-metrics-tracking/test-run-results.md"]
scope_out: ["実装コードの修正 (テスト失敗時の修正は P05 への差し戻しで行い、本 task 自体はコード修正を行わない)", "goal-spec acceptance 3 件の最終受入判定 (P07 で行う)"]
acceptance: ["test-run-results.md に quality_constraints 8 件全ての pass 結果が記録されている (fail が残る場合は差し戻し理由が明記されている)"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# テスト実行 — ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算テストの実行と結果記録

> task projection (P06 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-06-test-run.md`

## 依存

- SYS-METRICS-TRACKING-P05

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P06)
