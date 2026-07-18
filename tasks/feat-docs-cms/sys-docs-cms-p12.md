---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p12.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P11 のエビデンスを踏まえ S15 運用手順・AI キュー滞留監視・doc 編集監査運用を runbook 化する P12 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P11"]
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p12.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P12
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P12
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/runbook.md"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-12-documentation-operations.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "documentation", "operations"]
target_date: null
template_id: task
template_version: 1.0.0
title: ドキュメント/運用 — S15 運用手順・AI キュー滞留監視・監査運用の runbook 作成
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P12 を実行する: ドキュメント/運用 — S15 運用手順・AI キュー滞留監視・監査運用の runbook 作成
goal: S15 一覧/閲覧/編集画面の運用手順、AI 下書きキュー (doc kind) の滞留監視方法、doc 編集監査 event の確認手順を runbook.md にまとめ、feature 引き継ぎ後の運用担当が参照できる状態にする。
scope_in: ["docs/features/feat-docs-cms/runbook.md"]
scope_out: ["Markdown レンダラ/エディタ部品自体の運用ドキュメント (design system 共通部品。owner は feat-hub-foundation)", "AI 実行基盤のサーバ側運用ドキュメント (D5 で不採用)", "AiJob キュー共通層自体の運用ドキュメント一般化 (上流論点)"]
acceptance: ["runbook.md に S15 運用手順・AI キュー滞留監視手順・doc 編集監査確認手順の 3 項目が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# ドキュメント/運用 — S15 運用手順・AI キュー滞留監視・監査運用の runbook 作成

> task projection (P12 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-12-documentation-operations.md`

## 依存

- SYS-DOCS-CMS-P11

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P12)
