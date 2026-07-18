---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p06.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: P04 のテストスタブ (2 経路正規化/status 遷移監査/AI pull キュー/通知/Markdown sanitize/tenant 分離/publish 接続/authz-mw の 8 カテゴリ) を P05 実装に対して実行し結果を記録する P06 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P05"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p06.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P06
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P06
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/test-run-report.md"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-06-test-run.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "test-run"]
target_date: null
template_id: task
template_version: 1.0.0
title: テスト実行 — 単体/結合/2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離テストの実行と結果記録
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P06 を実行する: テスト実行 — 単体/結合/2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離テストの実行と結果記録
goal: P04 で定義した 8 テストカテゴリ (2 経路単一資源正規化、status 遷移 workspace-admin 限定+監査、AI pull キュー provider-admin 限定、resolved 通知アプリ内+Resend、Markdown sanitize、feedbacks tenant 分離、PublishRequest 接続非重複、REST zod 単一ソース+認可単一ミドルウェア) を P05 実装に対して実行し、pass/fail 結果を記録する。
scope_in: ["docs/features/feat-feedback-loop/test-run-report.md"]
scope_out: ["新規テストケースの追加設計 (P04 の scope。本 task は既存テストの実行と記録のみ)", "実装コードの修正 (fail 判明時は sys-feedback-loop-p05 を再実行対象とする)"]
acceptance: ["test-run-report.md に P04 定義の 8 テストカテゴリ全件の pass/fail 結果が記録されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# テスト実行 — 単体/結合/2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離テストの実行と結果記録

> task projection (P06 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-06-test-run.md`

## 依存

- SYS-FEEDBACK-LOOP-P05

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P06)
