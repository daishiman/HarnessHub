---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p08.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P05 で追加した Build スキーマ定義から migration ファイルを生成し既存 publish_requests テーブルへの FK 参照を含めて後方互換性を確認する P08 タスク (feature-execution-package-contract.md により P08 は N/A 判定時も常設される)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-build-pipeline-board/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:54:30Z
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P07"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-build-pipeline-board
file_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-BUILD-PIPELINE-BOARD-P08
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-build-pipeline-board
phase_ref: P08
priority: null
project_id: feature-package-feat-build-pipeline-board
pull_request_linkages: []
related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-build-pipeline-board/refactoring-migration-note.md", "packages/db/schema/build-pipeline/"]
source_lineage: {"imported_at": "2026-07-17T13:54:30Z", "origin_kind": "system-dev-planner", "source_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "source_path": ".dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "migration"]
target_date: null
template_id: task
template_version: 1.0.0
title: リファクタリング/マイグレーション — Build テーブルマイグレーション生成と後方互換性確認
tracker_binding: beads
updated_at: 2026-07-17T13:54:30Z
purpose: feat-build-pipeline-board の P08 を実行する: リファクタリング/マイグレーション — Build テーブルマイグレーション生成と後方互換性確認
goal: P05 で packages/db/schema/build-pipeline/ に追加した Build/build_stage_events テーブル定義から migration ファイルを生成し、既存スキーマ (特に publish_request_id が参照する既存 publish_requests テーブル) への後方互換性 (破壊的変更がないこと) を確認する。
scope_in: ["docs/features/feat-build-pipeline-board/refactoring-migration-note.md", "packages/db/schema/build-pipeline/"]
scope_out: ["既存テーブル (build-pipeline 以外、特に publish_requests 本体) のスキーマ変更", "本番環境への migration 適用 (P13 のリリース task で扱う)"]
acceptance: ["refactoring-migration-note.md に migration ファイル生成結果と後方互換性確認 (破壊的変更なし、publish_request_id は新規 FK のみ) の記録がある"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# リファクタリング/マイグレーション — Build テーブルマイグレーション生成と後方互換性確認

> task projection (P08 / parent: feat-build-pipeline-board)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-BUILD-PIPELINE-BOARD-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-BUILD-PIPELINE-BOARD-P08)
