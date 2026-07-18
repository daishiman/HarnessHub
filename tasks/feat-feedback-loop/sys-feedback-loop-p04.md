---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p04.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P03 で承認された設計に基づき P05 実装の受入契約となるテストスタブを作成する P04 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P03"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p04.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P04
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P04
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/test-design.md", "apps/hub/src/features/feedback-loop/__tests__/"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-04-test-design.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "test-design"]
target_date: null
template_id: task
template_version: 1.0.0
title: テストファースト設計 — 2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離のテストスタブ作成
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P04 を実行する: テストファースト設計 — 2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離のテストスタブ作成
goal: P03 で承認された設計に基づき、P05 実装が満たすべき受入契約としてテストスタブを作成する。2 経路 (CLI Bearer=harness / Web session=manual) の単一資源正規化、status 遷移の workspace-admin 限定+監査記録、AI 対応 pull キューの provider-admin 限定、resolved 通知のアプリ内正本+Resend 補助、Markdown sanitize、feedbacks テーブルの tenant 分離、PublishRequest 接続の非重複、認可単一ミドルウェア適合の 8 テストカテゴリの合否基準を定義する。
scope_in: ["docs/features/feat-feedback-loop/test-design.md", "apps/hub/src/features/feedback-loop/__tests__/"]
scope_out: ["publish 状態機械のテスト実装 (owner=feat-publish-pipeline。接続点のみテストする)", "NotificationDispatcher 共通層自体のテスト実装 (owner=feat-hub-foundation。呼び出し契約のみテストする)", "Markdown 共通レンダラ自体のテスト実装 (owner=feat-hub-foundation。sanitize 済み HTML 描画のみテストする)", "実装コード本体の作成 (P05 の scope)"]
acceptance: ["test-design.md に two-route-single-resource・status-transition-workspace-admin-audit・ai-pull-queue-provider-admin-device-flow・resolved-notification-inapp-resend・markdown-sanitize-render・feedback-entity-tenant-scope-isolation・publish-connect-no-automerge・rest-zod-authz-mw の 8 テストカテゴリの合否基準が明記されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# テストファースト設計 — 2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離のテストスタブ作成

> task projection (P04 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-04-test-design.md`

## 依存

- SYS-FEEDBACK-LOOP-P03

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P04)
