---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p08.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P05 で packages/db/schema/feedback-loop/ に追加した feedbacks テーブル定義から migration ファイルを生成し既存スキーマ (ai_jobs/notifications/publish_requests 含む) への後方互換性を確認する P08 タスク (feature-execution-package-contract.md により P08 は常設される)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P07"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P08
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P08
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-feedback-loop/refactoring-migration-note.md", "packages/db/schema/feedback-loop/"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "migration"]
target_date: null
template_id: task
template_version: 1.0.0
title: リファクタリング/マイグレーション — feedbacks テーブルマイグレーション生成と後方互換性確認
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P08 を実行する: リファクタリング/マイグレーション — feedbacks テーブルマイグレーション生成と後方互換性確認
goal: P05 で packages/db/schema/feedback-loop/ に追加した feedbacks テーブル定義から migration ファイルを生成し、既存スキーマ (特に ai_jobs.kind の `feedback_response` 値、notifications テーブル、projects テーブルへの `project_id` 参照) への後方互換性 (破壊的変更がないこと) を確認する。
scope_in: ["docs/features/feat-feedback-loop/refactoring-migration-note.md", "packages/db/schema/feedback-loop/"]
scope_out: ["既存テーブル (feedback-loop 以外、特に ai_jobs/notifications/publish_requests 本体) のスキーマ変更", "本番環境への migration 適用 (P13 のリリース task で扱う)"]
acceptance: ["refactoring-migration-note.md に migration ファイル生成結果と後方互換性確認 (破壊的変更なし、ai_job_id は新規 FK のみ) の記録がある"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# リファクタリング/マイグレーション — feedbacks テーブルマイグレーション生成と後方互換性確認

> task projection (P08 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-FEEDBACK-LOOP-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P08)
