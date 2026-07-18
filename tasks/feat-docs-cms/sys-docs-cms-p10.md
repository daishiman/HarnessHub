---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p10.md", "confidence": 0.86}]
classification_confidence: 0.86
classification_reason: P01-P09 の成果物を根拠に goal-spec の quality_constraints 8 件の充足を独立した視点で最終判定する P10 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P09"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p10.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P10
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P10
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/final-review-notes.md"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-10-final-review.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "final-review"]
target_date: null
template_id: task
template_version: 1.0.0
title: 最終独立レビュー — quality_constraints 8 件の充足判定
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P10 を実行する: 最終独立レビュー — quality_constraints 8 件の充足判定
goal: P01-P09 の成果物 (要件・設計・レビュー・テスト・実装・品質保証記録) を根拠として、goal-spec の quality_constraints 8 件 (tenant-scope-d4-doc-entity, markdown-sanitize-sec7-doc, markdown-common-component-qa021-qa022, doc-edit-audit-sec6, ai-queue-pull-type-d5-doc-draft, ai-queue-authz-payload-secret-ban, doc-edit-admin-only-qa021-sec2, b7-zod-single-source-authz-mw) それぞれの充足を、実装担当から独立した視点で最終判定する。
scope_in: ["docs/features/feat-docs-cms/final-review-notes.md"]
scope_out: ["実装コードの修正 (未充足判定が出た場合の修正は該当 task へ差し戻す)", "goal-spec quality_constraints 自体の再定義 (dev-graph の scope)"]
acceptance: ["final-review-notes.md に quality_constraints 8 件それぞれの充足判定と根拠成果物への参照が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# 最終独立レビュー — quality_constraints 8 件の充足判定

> task projection (P10 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-10-final-review.md`

## 依存

- SYS-DOCS-CMS-P09

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P10)
