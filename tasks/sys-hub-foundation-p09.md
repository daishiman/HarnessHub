---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p09.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: CI 品質ゲート・セキュリティ・運用readinessを横断的に確認する P09 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P08"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p09.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P09
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P09
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/quality-assurance-report.md", ".github/workflows/ci.yml"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-09-quality-assurance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p09"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 品質・セキュリティ・運用保証
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P09 を実行する: Hub 基盤 品質・セキュリティ・運用保証
goal: docs/shared-layers.md §3 の CI 品質ゲート (pnpm 混入検査 / axe 導線枠 / bundle 予算 Worker 3MiB / Tenant 分離テスト枠 / 検査 pipeline 挙動同値テスト枠) と qa-019 の運用 readiness (エラーバジェット運用、restore drill 手順) が実際に機能する状態であることを横断的に確認する。この task 完了時点で、品質・セキュリティ・運用の 3 観点それぞれについて readiness が確認されている状態にする。
scope_in: ["docs/features/feat-hub-foundation/quality-assurance-report.md", ".github/workflows/ci.yml"]
scope_out: ["axe チェック対象画面の拡充 (対象画面が増える後続 feature の scope)", "Tenant 分離テスト・検査 pipeline 挙動同値テストの内容確定 (消費 feature の scope、本 feature では枠のみ確認する)", "restore drill の実施そのもの (四半期ごとの定常運用として実行、本 task は手順の readiness 確認のみ)"]
acceptance: ["docs/features/feat-hub-foundation/quality-assurance-report.md に CI 品質ゲートの実効性確認結果とエラーバジェット運用・restore drill readiness が記録されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 品質・セキュリティ・運用保証

> task projection (P09 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-09-quality-assurance.md`

## 依存

- SYS-HUB-FOUNDATION-P08

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P09)
