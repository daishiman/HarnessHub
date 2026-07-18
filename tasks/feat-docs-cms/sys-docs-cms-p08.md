---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p08.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P05 で追加した Doc スキーマ定義から migration ファイルを生成し既存スキーマへの後方互換性を確認する P08 タスク (feature-execution-package-contract.md により P08 は N/A 判定時も常設される)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P07"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P08
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P08
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/refactoring-migration-note.md", "packages/db/schema/docs-cms/"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "migration"]
target_date: null
template_id: task
template_version: 1.0.0
title: リファクタリング/マイグレーション — Doc テーブルマイグレーション生成と後方互換性確認
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P08 を実行する: リファクタリング/マイグレーション — Doc テーブルマイグレーション生成と後方互換性確認
goal: P05 で packages/db/schema/docs-cms/ に追加した Doc テーブル定義から migration ファイルを生成し、既存スキーマへの後方互換性 (破壊的変更がないこと) を確認する。
scope_in: ["docs/features/feat-docs-cms/refactoring-migration-note.md", "packages/db/schema/docs-cms/"]
scope_out: ["既存テーブル (docs-cms 以外) のスキーマ変更", "本番環境への migration 適用 (P13 のリリース task で扱う)"]
acceptance: ["refactoring-migration-note.md に migration ファイル生成結果と後方互換性確認 (破壊的変更なし) の記録がある"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# リファクタリング/マイグレーション — Doc テーブルマイグレーション生成と後方互換性確認

> task projection (P08 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-DOCS-CMS-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P08)
