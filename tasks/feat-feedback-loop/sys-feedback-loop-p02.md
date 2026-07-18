---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p02.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: docs/backend-spec.md の feedbacks/ai_jobs/notifications テーブル定義・feedback API・Feedback/AiJob 状態機械に基づき Feedback エンティティのスキーマと S14 画面構成・feedback API 契約・AI キュー連携・通知/publish 接続設計を確定する P02 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P01"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P02
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P02
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/architecture-decision-record.md"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "architecture"]
target_date: null
template_id: task
template_version: 1.0.0
title: アーキテクチャ設計 — Feedback スキーマ・S14 画面構成・feedback/AI キュー API 契約・通知/publish 接続設計
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P02 を実行する: アーキテクチャ設計 — Feedback スキーマ・S14 画面構成・feedback/AI キュー API 契約・通知/publish 接続設計
goal: P01 の要件ベースラインに基づき、Feedback エンティティのスキーマ (tenant_id/workspace_id スコープ列を含む)、S14 (一覧 + Web フォーム) の画面構成、`POST/GET /api/v1/feedback`・`GET/PATCH /api/v1/feedback/:id` の API 契約、AiJob(`feedback_response`) の submission/writeback 連携方式、resolved 通知の NotificationDispatcher 消費方式、修正版 publish の既存 PublishRequest 接続方式を確定する。
scope_in: ["docs/features/feat-feedback-loop/architecture-decision-record.md"]
scope_out: ["PublishRequest 状態機械自体の変更 (owner=feat-publish-pipeline。既存 I2/I3 の接続方式のみ設計する)", "自動マージロジックの設計 (goal-spec scope_out)", "NotificationDispatcher 共通層自体の設計 (owner=feat-hub-foundation。消費方式のみ設計する)", "ai_jobs テーブル・AiJob キュー共通層自体のスキーマ変更設計 (既存スキーマの消費方式のみ設計する)", "Markdown 共通レンダラ自体の設計 (owner=feat-hub-foundation。sanitize 済み HTML の消費方式のみ設計する)"]
acceptance: ["architecture-decision-record.md に feedbacks カラム一覧、S14 画面構成表、feedback API 契約 (4 endpoint)、AiJob(feedback_response) 連携方式、NotificationDispatcher 消費方式、PublishRequest 接続方式 (二重状態排除)、B1 zod スキーマ単一ソース方針の明記が記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# アーキテクチャ設計 — Feedback スキーマ・S14 画面構成・feedback/AI キュー API 契約・通知/publish 接続設計

> task projection (P02 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-02-architecture.md`

## 依存

- SYS-FEEDBACK-LOOP-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P02)
