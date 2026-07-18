---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p04.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P03 で承認された設計に基づき P05 実装の受入契約となるテストスタブを作成する P04 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P03"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p04.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P04
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P04
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/test-design.md", "apps/hub/src/features/docs-cms/__tests__/"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-04-test-design.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "test-design"]
target_date: null
template_id: task
template_version: 1.0.0
title: テストファースト設計 — tenant 分離/admin 限定編集/Markdown sanitize/AI キュー認可/監査記録のテストスタブ作成
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P04 を実行する: テストファースト設計 — tenant 分離/admin 限定編集/Markdown sanitize/AI キュー認可/監査記録のテストスタブ作成
goal: P03 で承認された設計に基づき、P05 実装が満たすべき受入契約として、tenant 分離・doc 編集 admin 限定認可・Markdown XSS sanitize・doc 編集監査 event 記録・AI 下書きキュー (doc kind) 認可の 5 テストカテゴリのテストスタブを作成する。
scope_in: ["docs/features/feat-docs-cms/test-design.md", "apps/hub/src/features/docs-cms/__tests__/"]
scope_out: ["Markdown レンダラ/エディタ部品自体のテスト (design system 共通部品。owner は feat-hub-foundation)", "AI 実行基盤のサーバ側実装のテスト (D5 で不採用)", "実装コード本体の作成 (本 task はテストスタブ作成のみ)"]
acceptance: ["test-design.md に tenant 分離・doc 編集 admin 限定・Markdown sanitize・doc 編集監査・AI キュー認可の 5 テストカテゴリの合否基準が明記されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# テストファースト設計 — tenant 分離/admin 限定編集/Markdown sanitize/AI キュー認可/監査記録のテストスタブ作成

> task projection (P04 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-04-test-design.md`

## 依存

- SYS-DOCS-CMS-P03

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P04)
