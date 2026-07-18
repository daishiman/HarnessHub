---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p01.md", "confidence": 0.92}]
classification_confidence: 0.92
classification_reason: goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-feedback-loop.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: []
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p01.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P01
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P01
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/requirements-baseline.md"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-01-requirements.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "requirements-baseline"]
target_date: null
template_id: task
template_version: 1.0.0
title: 改善要望フィードバックループ要件ベースライン確定
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P01 を実行する: 改善要望フィードバックループ要件ベースライン確定
goal: feat-feedback-loop の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (Feedback エンティティ・CLI+S14 の 2 経路受付・D5 pull 型 AI キュー対応・publish 接続・通知) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件が machine-verifiable な baseline 文書として固定される。
scope_in: ["docs/features/feat-feedback-loop/requirements-baseline.md"]
scope_out: ["publish 状態機械の再実装 (goal-spec scope_out。既存 I2/I3 を feat-publish-pipeline から使う)", "自動マージ (goal-spec scope_out。修正案は人の確認を経て publish)", "NotificationDispatcher 共通層自体の実装 (owner=feat-hub-foundation。本 feature は消費のみ)", "Markdown 共通レンダラ・design system 共通部品自体の実装 (owner=feat-hub-foundation)", "AiJob キュー共通層の汎用化 (既存 ai_jobs テーブル・kind enum を消費するのみ)", "実装コードの作成 (本 task は要件確定のみ)"]
acceptance: ["docs/features/feat-feedback-loop/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件が過不足なく転記されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# 改善要望フィードバックループ要件ベースライン確定

> task projection (P01 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-01-requirements.md`

## 依存

- なし (feature 内の先頭 phase)

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P01)
