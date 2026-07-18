---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p09.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P06 テスト結果と P08 migration 結果を踏まえ CI 品質ゲート (axe/tenant 分離/認可/AI キュー lease/監査記録) の充足を確認する P09 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P08"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p09.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P09
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P09
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/quality-assurance-report.md"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-09-quality-assurance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "quality-assurance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 品質保証 — CI 品質ゲート (axe/tenant 分離/認可/AI キュー lease/監査) の確認
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P09 を実行する: 品質保証 — CI 品質ゲート (axe/tenant 分離/認可/AI キュー lease/監査) の確認
goal: P06 テスト結果と P08 migration 結果を踏まえ、CI 品質ゲート (axe アクセシビリティ検証、feedbacks テーブルの tenant 分離、feedback API の認可単一ミドルウェア適合、AiJob(`feedback_response`) の lease 失効/attempt 上限処理、feedback.status_change/ai_job.complete 監査 event 記録) の充足を確認する。
scope_in: ["docs/features/feat-feedback-loop/quality-assurance-report.md"]
scope_out: ["未達品質ゲートの原因修正 (原因 task への差し戻しのみ行う。本 task は確認のみ)", "axe/lint ツール自体の設定変更 (feat-hub-foundation の共通 CI 設定を使用する)"]
acceptance: ["quality-assurance-report.md に axe/tenant 分離/認可/AI キュー lease/監査の 5 種の確認結果が記録されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# 品質保証 — CI 品質ゲート (axe/tenant 分離/認可/AI キュー lease/監査) の確認

> task projection (P09 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-09-quality-assurance.md`

## 依存

- SYS-FEEDBACK-LOOP-P08

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P09)
