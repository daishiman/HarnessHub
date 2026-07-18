---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p04.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P03 で承認された設計に基づき P05 実装の受入契約となるテストスタブを作成する P04 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-build-pipeline-board/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:54:30Z
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P03"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-build-pipeline-board
file_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p04.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-BUILD-PIPELINE-BOARD-P04
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-build-pipeline-board
phase_ref: P04
priority: null
project_id: feature-package-feat-build-pipeline-board
pull_request_linkages: []
related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-build-pipeline-board/test-design.md", "apps/hub/src/features/build-pipeline-board/__tests__/"]
source_lineage: {"imported_at": "2026-07-17T13:54:30Z", "origin_kind": "system-dev-planner", "source_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "source_path": ".dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-04-test-design.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "test-design"]
target_date: null
template_id: task
template_version: 1.0.0
title: テストファースト設計 — 工程遷移 admin 限定/監査記録/PublishRequest 整合/tenant 分離のテストスタブ作成
tracker_binding: beads
updated_at: 2026-07-17T13:54:30Z
purpose: feat-build-pipeline-board の P04 を実行する: テストファースト設計 — 工程遷移 admin 限定/監査記録/PublishRequest 整合/tenant 分離のテストスタブ作成
goal: P03 で承認された設計に基づき、工程遷移 admin 限定・build.stage_change 監査記録・publish 工程と PublishRequest の整合 (二重状態排除)・Build エンティティの tenant 分離・B9 共有認可表の一貫性を検証する 5 テストカテゴリのテストスタブを作成し、P05 実装の受入契約とする。
scope_in: ["docs/features/feat-build-pipeline-board/test-design.md", "apps/hub/src/features/build-pipeline-board/__tests__/"]
scope_out: ["実装コード本体の作成 (P05 で行う)", "publish 状態機械自体のテスト再設計 (既存 I2/I3 のテストを流用参照するのみ)", "ステージボード共通部品自体のテスト (owner=feat-hub-foundation)"]
acceptance: ["test-design.md に stage-transition-admin-only・stage-change-audit-event・publish-stage-publishrequest-integrity・build-entity-tenant-scope-isolation・shared-authz-table-b9-consistency の 5 テストカテゴリの合否基準が明記されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# テストファースト設計 — 工程遷移 admin 限定/監査記録/PublishRequest 整合/tenant 分離のテストスタブ作成

> task projection (P04 / parent: feat-build-pipeline-board)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-04-test-design.md`

## 依存

- SYS-BUILD-PIPELINE-BOARD-P03

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-BUILD-PIPELINE-BOARD-P04)
