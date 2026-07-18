---
acceptance: ["refactoring-migration-note.md に不採用経路の試作 artifact の削除/保留判断・採用経路 artifact の P12 runbook への引き継ぎ整理・恒久コード移植や DB migration が本 feature の scope_out であることの明記の 3 点が記載されていること"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p08.md", "confidence": 0.84}]
classification_confidence: 0.84
classification_reason: 本 feature は packages/db/schema/ 等の恒久実装コードを持たないため DB migration やコード移植を伴わない。P08 は不採用経路の試作 artifact 整理と、採用経路 artifact を P12 runbook へ引き継ぐための最終整理に読み替える required-node タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P07"]
domain: infrastructure
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: P07 で確定した受入結果に基づき、不採用と判定された経路の試作 artifact を整理 (削除または保留の判断) し、採用経路の artifact を P12 の runbook へ引き継ぐための最終整理を行う。本 feature は恒久的な実装コードや DB migration を持たないため、本 task は feature-execution-package-contract.md §3 が定める N/A-with-reason パターンとして適用される。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P08
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P08
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P08 を実行する: リファクタリング/マイグレーション — 検証 prototype 資産の整理 (N/A 判断を含む)
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/refactoring-migration-note.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/refactoring-migration-note.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "DB migration・既存コードの移植 (本 feature は永続実装コードを持たないため対象外)", "採用経路の runbook 具体化そのもの (本 task は引き継ぎ整理のみ。具体化は P12 で扱う)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "infrastructure", "refactor-migration"]
target_date: null
template_id: task
template_version: 1.0.0
title: リファクタリング/マイグレーション — 検証 prototype 資産の整理 (N/A 判断を含む)
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# リファクタリング/マイグレーション — 検証 prototype 資産の整理 (N/A 判断を含む)

> task projection (P08 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P08)
