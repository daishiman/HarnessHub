---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p09.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P06 テスト結果と P08 migration 結果を踏まえ CI 品質ゲート (axe/tenant 分離/工程操作認可/PublishRequest 整合) の充足を確認する P09 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-build-pipeline-board/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:54:30Z
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P08"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-build-pipeline-board
file_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p09.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-BUILD-PIPELINE-BOARD-P09
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-build-pipeline-board
phase_ref: P09
priority: null
project_id: feature-package-feat-build-pipeline-board
pull_request_linkages: []
related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-build-pipeline-board/quality-assurance-report.md"]
source_lineage: {"imported_at": "2026-07-17T13:54:30Z", "origin_kind": "system-dev-planner", "source_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "source_path": ".dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-09-quality-assurance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "quality-assurance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 品質保証 — CI 品質ゲート (axe/tenant 分離/工程操作認可/PublishRequest 整合) の確認
tracker_binding: beads
updated_at: 2026-07-17T13:54:30Z
purpose: feat-build-pipeline-board の P09 を実行する: 品質保証 — CI 品質ゲート (axe/tenant 分離/工程操作認可/PublishRequest 整合) の確認
goal: P06 テスト結果と P08 migration 結果を踏まえ、CI 品質ゲート (axe アクセシビリティ違反 0・tenant 分離・工程操作 admin 限定認可・PublishRequest 整合) の充足を確認し、quality-assurance-report.md に記録する。
scope_in: ["docs/features/feat-build-pipeline-board/quality-assurance-report.md"]
scope_out: ["実装コードの修正 (未達の品質ゲートがある場合は原因 task へ差し戻す)", "ステージボード共通部品自体の axe 修正 (owner=feat-hub-foundation。本 task は消費側ページの検証のみ)"]
acceptance: ["quality-assurance-report.md に axe/tenant 分離/工程操作認可/PublishRequest 整合の 4 種の確認結果が記録されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# 品質保証 — CI 品質ゲート (axe/tenant 分離/工程操作認可/PublishRequest 整合) の確認

> task projection (P09 / parent: feat-build-pipeline-board)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-09-quality-assurance.md`

## 依存

- SYS-BUILD-PIPELINE-BOARD-P08

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-BUILD-PIPELINE-BOARD-P09)
