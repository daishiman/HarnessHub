---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p05.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: P03 承認済み設計と P04 テストスタブに基づき S13 実装・Build スキーマ・工程操作 API・PublishRequest 接続・監査 event を実装する P05 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-build-pipeline-board/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:54:30Z
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P04"]
domain: frontend
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-build-pipeline-board
file_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-BUILD-PIPELINE-BOARD-P05
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-build-pipeline-board
phase_ref: P05
priority: null
project_id: feature-package-feat-build-pipeline-board
pull_request_linkages: []
related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/app/(dashboard)/builds/", "apps/hub/src/features/build-pipeline-board/", "packages/schemas/build-pipeline-board/", "packages/db/schema/build-pipeline/"]
source_lineage: {"imported_at": "2026-07-17T13:54:30Z", "origin_kind": "system-dev-planner", "source_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "source_path": ".dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "implementation"]
target_date: null
template_id: task
template_version: 1.0.0
title: 実装 — S13 パイプラインボード・Build スキーマ・工程操作 API・PublishRequest 接続・監査 event の実装
tracker_binding: beads
updated_at: 2026-07-17T13:54:30Z
purpose: feat-build-pipeline-board の P05 を実行する: 実装 — S13 パイプラインボード・Build スキーマ・工程操作 API・PublishRequest 接続・監査 event の実装
goal: P03 承認済み設計と P04 テストスタブに基づき、S13 パイプラインボード (ステージボード共通部品の消費)・Build/build_stage_events スキーマ・builds REST API (閲覧/起票/更新/工程遷移)・publish 工程の PublishRequest 接続・build.stage_change 監査 event を実装する。
scope_in: ["apps/hub/src/app/(dashboard)/builds/", "apps/hub/src/features/build-pipeline-board/", "packages/schemas/build-pipeline-board/", "packages/db/schema/build-pipeline/"]
scope_out: ["ステージボード共通部品自体の実装 (owner=feat-hub-foundation)", "publish 状態機械自体の実装・変更 (既存 I2/I3 を使用。goal-spec scope_out)", "工程の自動遷移ロジックの実装 (goal-spec scope_out)", "AI 下書きキュー・ヒアリング intake の実装 (feat-hearing-intake の scope)"]
acceptance: ["P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログが得られている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# 実装 — S13 パイプラインボード・Build スキーマ・工程操作 API・PublishRequest 接続・監査 event の実装

> task projection (P05 / parent: feat-build-pipeline-board)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-05-implementation.md`

## 依存

- SYS-BUILD-PIPELINE-BOARD-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-BUILD-PIPELINE-BOARD-P05)
