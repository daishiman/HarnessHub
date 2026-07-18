---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p09.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P06 テスト結果と P08 migration 結果を踏まえ CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の充足を確認する P09 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P08"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p09.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P09
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P09
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/quality-assurance-report.md"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-09-quality-assurance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "quality-assurance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 品質保証 — CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の確認
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P09 を実行する: 品質保証 — CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の確認
goal: S15 画面のアクセシビリティ (axe)・tenant 分離 CI 必須テスト・AI キュー認可・Markdown XSS sanitize の 4 種の品質ゲートが CI 上で確認可能な状態になっていることを確認し、quality-assurance-report.md に記録する。
scope_in: ["docs/features/feat-docs-cms/quality-assurance-report.md"]
scope_out: ["CI パイプライン基盤自体の新設 (feat-hub-foundation が既に確立している既存 CI に乗る)", "Markdown レンダラ/エディタ部品自体の品質保証 (design system 共通部品。owner は feat-hub-foundation)"]
acceptance: ["quality-assurance-report.md に axe/tenant 分離/AI キュー認可/XSS sanitize の 4 種の確認結果が記録されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# 品質保証 — CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の確認

> task projection (P09 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-09-quality-assurance.md`

## 依存

- SYS-DOCS-CMS-P08

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P09)
