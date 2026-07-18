---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p05.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: P03 承認済み設計と P04 テストスタブに基づき S15 実装・Doc スキーマ・B7 API・AI 下書きキュー・監査 event を実装する P05 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P04"]
domain: frontend
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P05
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P05
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/app/(dashboard)/docs/", "apps/hub/src/features/docs-cms/", "packages/schemas/docs-cms/", "packages/db/schema/docs-cms/"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "implementation"]
target_date: null
template_id: task
template_version: 1.0.0
title: 実装 — S15 一覧/閲覧/編集・Doc スキーマ・B7 API・AI 下書きキュー・監査 event の実装
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P05 を実行する: 実装 — S15 一覧/閲覧/編集・Doc スキーマ・B7 API・AI 下書きキュー・監査 event の実装
goal: P03 承認済み設計と P04 テストスタブに基づき、S15 一覧/閲覧/編集 UI (編集は admin 限定)・Doc エンティティスキーマ (scope=common/tenant)・B7 REST 資源 (zod 単一ソース + 認可単一ミドルウェア)・AI 下書きキュー (AiJob doc kind) の投入/受領・doc 編集の監査 event 記録を実装し、P04 のテストスタブを green にする。
scope_in: ["apps/hub/src/app/(dashboard)/docs/", "apps/hub/src/features/docs-cms/", "packages/schemas/docs-cms/", "packages/db/schema/docs-cms/"]
scope_out: ["Markdown レンダラ/エディタ部品自体の実装 (design system 共通部品。owner は feat-hub-foundation で、本 feature は消費のみ)", "AI 実行基盤のサーバ側実装 (D5 で不採用)", "外部公開サイト生成・バージョン管理 (Git 連携) (goal-spec scope_out)", "AiJob キュー共通層自体の一般化実装 (上流論点)"]
acceptance: ["P04 のテストスタブがすべて green であること、および pnpm build/test の成功ログが得られている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# 実装 — S15 一覧/閲覧/編集・Doc スキーマ・B7 API・AI 下書きキュー・監査 event の実装

> task projection (P05 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-05-implementation.md`

## 依存

- SYS-DOCS-CMS-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P05)
