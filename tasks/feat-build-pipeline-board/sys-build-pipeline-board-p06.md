---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p06.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: P04 のテストスタブ (工程遷移 admin 限定/監査記録/PublishRequest 整合/tenant 分離/B9 共有認可表) を P05 実装に対して実行し結果を記録する P06 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-build-pipeline-board/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:54:30Z
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P05"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-build-pipeline-board
file_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p06.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-BUILD-PIPELINE-BOARD-P06
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-build-pipeline-board
phase_ref: P06
priority: null
project_id: feature-package-feat-build-pipeline-board
pull_request_linkages: []
related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-build-pipeline-board/test-run-report.md"]
source_lineage: {"imported_at": "2026-07-17T13:54:30Z", "origin_kind": "system-dev-planner", "source_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "source_path": ".dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-06-test-run.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "test-run"]
target_date: null
template_id: task
template_version: 1.0.0
title: テスト実行 — 単体/結合/工程遷移認可/PublishRequest 整合/tenant 分離テストの実行と結果記録
tracker_binding: beads
updated_at: 2026-07-17T13:54:30Z
purpose: feat-build-pipeline-board の P06 を実行する: テスト実行 — 単体/結合/工程遷移認可/PublishRequest 整合/tenant 分離テストの実行と結果記録
goal: P04 で定義した 5 テストカテゴリ (工程遷移 admin 限定・監査記録・PublishRequest 整合・tenant 分離・B9 共有認可表) を P05 実装に対して実行し、結果を test-run-report.md に記録する。
scope_in: ["docs/features/feat-build-pipeline-board/test-run-report.md"]
scope_out: ["実装コードの修正 (fail が生じた場合は P05 へ差し戻す)", "publish 状態機械自体の再テスト (既存 I2/I3 のテストスイートを流用参照するのみ)"]
acceptance: ["test-run-report.md に P04 定義の 5 テストカテゴリ全件の pass/fail 結果が記録されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# テスト実行 — 単体/結合/工程遷移認可/PublishRequest 整合/tenant 分離テストの実行と結果記録

> task projection (P06 / parent: feat-build-pipeline-board)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-06-test-run.md`

## 依存

- SYS-BUILD-PIPELINE-BOARD-P05

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-BUILD-PIPELINE-BOARD-P06)
