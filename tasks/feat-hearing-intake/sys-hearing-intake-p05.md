---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p05.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: P03 承認済み設計と P04 テストスタブに基づき S10-S12 実装・受付番号採番・AI キュー API・Markdown sanitize を実装する P05 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P04"]
domain: frontend
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P05
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P05
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["apps/hub/src/app/(dashboard)/hearing-intake/", "apps/hub/src/app/(dashboard)/hearing-sheets/", "apps/hub/src/features/hearing-intake/", "packages/schemas/hearing-intake/", "packages/db/schema/hearing-intake/"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "implementation"]
target_date: null
template_id: task
template_version: 1.0.0
title: 実装 — S10 ウィザード/S11-S12 シート管理/受付番号採番/AI キュー API/Markdown sanitize の実装
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P05 を実行する: 実装 — S10 ウィザード/S11-S12 シート管理/受付番号採番/AI キュー API/Markdown sanitize の実装
goal: P02/P03 で確定・承認された設計と P04 のテストスタブに基づき、S10 (4 ステップウィザード)・S11/S12 (シート一覧/詳細)・受付番号採番・AI キュー (D5 pull 型) ジョブ投入/書戻し受領 API・Markdown sanitize 適用を実装し、P04 のテストスタブが green になる状態にする。
scope_in: ["apps/hub/src/app/(dashboard)/hearing-intake/", "apps/hub/src/app/(dashboard)/hearing-sheets/", "apps/hub/src/features/hearing-intake/", "packages/schemas/hearing-intake/", "packages/db/schema/hearing-intake/"]
scope_out: ["AI 実行基盤のサーバ側実装 (D5 で不採用。goal-spec scope_out)", "AiJob キュー共通層そのものの汎化実装 (feat-hub-foundation の scope。P02 の判断を継承)", "構築工程の進行管理 UI (feat-build-pipeline-board の scope)", "試算エンジン本体の実装 (feat-metrics-tracking の scope。本 feature は TenantCoefficient 係数の読取消費のみ実装する)", "認証方式・role 体系そのものの実装変更 (feat-auth-tenancy の scope)"]
acceptance: ["P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログが得られている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# 実装 — S10 ウィザード/S11-S12 シート管理/受付番号採番/AI キュー API/Markdown sanitize の実装

> task projection (P05 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-05-implementation.md`

## 依存

- SYS-HEARING-INTAKE-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P05)
