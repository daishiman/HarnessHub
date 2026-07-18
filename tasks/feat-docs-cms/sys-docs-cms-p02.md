---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p02.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い Doc エンティティ (scope=common/tenant) のスキーマと S15 画面構成・B7 REST 資源契約・AI 下書きキュー (doc kind) 契約を確定する P02 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P01"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P02
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P02
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/architecture-decision-record.md"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "architecture"]
target_date: null
template_id: task
template_version: 1.0.0
title: アーキテクチャ設計 — Doc スキーマ・S15 画面構成・B7 API 契約・AI 下書きキュー契約の設計
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P02 を実行する: アーキテクチャ設計 — Doc スキーマ・S15 画面構成・B7 API 契約・AI 下書きキュー契約の設計
goal: P01 で確定した要件ベースラインに基づき、Doc エンティティ (scope=common/tenant・Markdown 本文・tenant_id/workspace_id スコープ列) のカラム定義、S15 一覧/閲覧/編集の画面構成、B7 REST 資源の zod スキーマ契約と認可単一ミドルウェア配下の role×操作許可表、AI 下書きキュー (AiJob の doc kind) の投入/受領契約を確定し、P03 レビューと P05 実装の入力となる設計文書を作成する。
scope_in: ["docs/features/feat-docs-cms/architecture-decision-record.md"]
scope_out: ["Markdown レンダラ/エディタ部品自体の設計・実装 (design system 共通部品。owner は feat-hub-foundation)", "AI 実行基盤のサーバ側設計 (D5 で不採用)", "AiJob キュー共通層自体の一般化設計 (上流論点。goal-spec scope_out に含まれる論点であり、本 task は doc kind の投入/受領契約のみを扱う)", "実装コードの作成 (本 task は設計確定のみ)"]
acceptance: ["architecture-decision-record.md に Doc カラム一覧、S15 画面構成表、B7 API 契約、AI キュー doc kind 契約、AiJob 共通層汎化の未解決論点の明記が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# アーキテクチャ設計 — Doc スキーマ・S15 画面構成・B7 API 契約・AI 下書きキュー契約の設計

> task projection (P02 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-02-architecture.md`

## 依存

- SYS-DOCS-CMS-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P02)
