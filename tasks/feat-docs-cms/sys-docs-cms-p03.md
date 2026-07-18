---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p03.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P02 で確定した Doc スキーマ・S15 画面構成・B7 API 契約・AI キュー doc kind 契約を、設計担当から独立した視点でレビューする P03 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P02"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p03.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P03
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P03
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/design-review-notes.md"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-03-design-review.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "design-review"]
target_date: null
template_id: task
template_version: 1.0.0
title: 独立設計レビュー — Doc スキーマ・S15 認可・AI キュー契約・Markdown sanitize の妥当性確認
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P03 を実行する: 独立設計レビュー — Doc スキーマ・S15 認可・AI キュー契約・Markdown sanitize の妥当性確認
goal: P02 の architecture-decision-record.md に対し、設計担当から独立した視点で tenant 分離・doc 編集 admin 限定認可・Markdown sanitize 消費点・AI キュー認可・監査 event 記録点の妥当性を確認し、承認または差し戻しを判定する。
scope_in: ["docs/features/feat-docs-cms/design-review-notes.md"]
scope_out: ["Markdown レンダラ/エディタ部品自体のレビュー (design system 共通部品。owner は feat-hub-foundation)", "AI 実行基盤のサーバ側実装のレビュー (D5 で不採用)", "実装コードの作成 (本 task はレビューのみ)"]
acceptance: ["design-review-notes.md に承認可否と SEC2/SEC6/SEC7/SEC8・qa-021/qa-022/qa-023(B1/B7)/qa-024 適合確認結果が明記されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# 独立設計レビュー — Doc スキーマ・S15 認可・AI キュー契約・Markdown sanitize の妥当性確認

> task projection (P03 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-03-design-review.md`

## 依存

- SYS-DOCS-CMS-P02

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P03)
