---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p05.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: P03 承認済み設計と P04 テストスタブに基づき S14 実装・feedbacks スキーマ・feedback API・AI キュー連携・通知/publish 接続を実装する P05 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P04"]
domain: frontend
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P05
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P05
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["apps/hub/src/app/(dashboard)/feedback/", "apps/hub/src/features/feedback-loop/", "packages/schemas/feedback-loop/", "packages/db/schema/feedback-loop/"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "implementation"]
target_date: null
template_id: task
template_version: 1.0.0
title: 実装 — S14 一覧+フォーム・feedbacks スキーマ・feedback API・AI キュー連携・通知/publish 接続の実装
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P05 を実行する: 実装 — S14 一覧+フォーム・feedbacks スキーマ・feedback API・AI キュー連携・通知/publish 接続の実装
goal: P03 承認済み設計と P04 テストスタブに基づき、S14 (一覧 + Web フォーム、design system 共通部品の消費)・feedbacks スキーマ・feedback REST API (`POST/GET /api/v1/feedback`, `GET/PATCH /api/v1/feedback/:id`)・AiJob(`feedback_response`) の submission/writeback 連携・resolved 通知の NotificationDispatcher 消費・修正版 publish の既存 PublishRequest 接続を実装する。
scope_in: ["apps/hub/src/app/(dashboard)/feedback/", "apps/hub/src/features/feedback-loop/", "packages/schemas/feedback-loop/", "packages/db/schema/feedback-loop/"]
scope_out: ["PublishRequest 状態機械自体の実装・変更 (owner=feat-publish-pipeline。既存 I2/I3 を使用。goal-spec scope_out)", "自動マージロジックの実装 (goal-spec scope_out)", "AI 実行バックエンド (解析・修正案生成の実処理) の実装 (Claude Code 側の実行主体であり本 feature は AiJob キューの submission/writeback 連携のみ実装する)", "Markdown 共通レンダラ・design system 共通部品自体の実装 (owner=feat-hub-foundation)", "NotificationDispatcher 共通層自体の実装 (owner=feat-hub-foundation。呼び出しのみ実装する)", "AiJob キュー共通層の汎用化 (既存 ai_jobs テーブル・kind enum を消費するのみ)"]
acceptance: ["P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログが得られている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# 実装 — S14 一覧+フォーム・feedbacks スキーマ・feedback API・AI キュー連携・通知/publish 接続の実装

> task projection (P05 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-05-implementation.md`

## 依存

- SYS-FEEDBACK-LOOP-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P05)
