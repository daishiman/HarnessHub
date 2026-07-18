---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p02.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: docs/backend-spec.md の Build/build_stage_events テーブル定義・工程操作 API・Build 状態機械に基づき Build エンティティのスキーマと S13 画面構成・工程操作 API 契約・PublishRequest 接続設計を確定する P02 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-build-pipeline-board/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:54:30Z
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P01"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-build-pipeline-board
file_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-BUILD-PIPELINE-BOARD-P02
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-build-pipeline-board
phase_ref: P02
priority: null
project_id: feature-package-feat-build-pipeline-board
pull_request_linkages: []
related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-build-pipeline-board/architecture-decision-record.md"]
source_lineage: {"imported_at": "2026-07-17T13:54:30Z", "origin_kind": "system-dev-planner", "source_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "source_path": ".dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "architecture"]
target_date: null
template_id: task
template_version: 1.0.0
title: アーキテクチャ設計 — Build スキーマ・S13 ボード構成・工程操作 API 契約・PublishRequest 接続設計
tracker_binding: beads
updated_at: 2026-07-17T13:54:30Z
purpose: feat-build-pipeline-board の P02 を実行する: アーキテクチャ設計 — Build スキーマ・S13 ボード構成・工程操作 API 契約・PublishRequest 接続設計
goal: P01 で確定した要件ベースラインに基づき、Build エンティティ (7 stage・risk・tenant_id/workspace_id スコープ列) のカラム定義、S13 パイプラインボードの画面構成 (ステージボード共通部品の消費点)、builds REST 資源の zod スキーマ契約と認可単一ミドルウェア配下の role×操作許可表、工程遷移 API (admin 限定 + 監査 event)、publish 工程の PublishRequest 接続契約を確定し、P03 レビューと P05 実装の入力となる設計文書を作成する。
scope_in: ["docs/features/feat-build-pipeline-board/architecture-decision-record.md"]
scope_out: ["ステージボード共通部品自体の設計・実装 (design system 共通部品。owner は feat-hub-foundation)", "publish 状態機械自体の再設計 (既存 I2/I3 を使用。goal-spec scope_out)", "工程の自動遷移ロジックの設計 (goal-spec scope_out。手動運用から開始)", "実装コードの作成 (本 task は設計確定のみ)"]
acceptance: ["architecture-decision-record.md に Build/build_stage_events カラム一覧、S13 画面構成表、工程操作 API 契約、PublishRequest 接続方式 (二重状態排除)、B9 共有認可表方針の明記が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# アーキテクチャ設計 — Build スキーマ・S13 ボード構成・工程操作 API 契約・PublishRequest 接続設計

> task projection (P02 / parent: feat-build-pipeline-board)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-02-architecture.md`

## 依存

- SYS-BUILD-PIPELINE-BOARD-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-BUILD-PIPELINE-BOARD-P02)
