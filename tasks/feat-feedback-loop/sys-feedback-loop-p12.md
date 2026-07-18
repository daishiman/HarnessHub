---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p12.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P11 のエビデンスを踏まえ S14 運用手順・AI キュー運用・監査/通知運用を runbook 化する P12 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P11"]
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p12.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P12
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P12
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/runbook.md"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-12-documentation-operations.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "documentation", "operations"]
target_date: null
template_id: task
template_version: 1.0.0
title: ドキュメント/運用 — S14 運用手順・AI キュー運用・監査/通知運用の runbook 作成
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P12 を実行する: ドキュメント/運用 — S14 運用手順・AI キュー運用・監査/通知運用の runbook 作成
goal: P11 のエビデンスを踏まえ、S14 (一覧+フォーム) の日常運用手順、AiJob(`feedback_response`) キューの運用手順 (lease 失効時の対応、attempt 3 で dead 到達時の admin 通知対応)、feedback.status_change/ai_job.complete 監査運用手順、resolved 通知 (アプリ内+Resend) の到達確認・トラブルシュート手順を runbook 化する。
scope_in: ["docs/features/feat-feedback-loop/runbook.md"]
scope_out: ["feat-publish-pipeline 側の運用手順自体の作成 (本 task は接続ポイントの明記のみ)", "NotificationDispatcher 共通層自体の運用手順の作成 (owner=feat-hub-foundation。消費側の確認手順のみ記載する)", "実装コードの変更"]
acceptance: ["runbook.md に S14 運用手順・AI キュー運用手順・監査運用手順・通知トラブルシュート手順の 4 項目が記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# ドキュメント/運用 — S14 運用手順・AI キュー運用・監査/通知運用の runbook 作成

> task projection (P12 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-12-documentation-operations.md`

## 依存

- SYS-FEEDBACK-LOOP-P11

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P12)
