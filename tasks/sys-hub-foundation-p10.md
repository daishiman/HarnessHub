---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p10.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: P01〜P09 の成果物一式を goal-spec と付随制約に対して独立して再点検する P10 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P09"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p10.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P10
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P10
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/final-review-notes.md"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-10-final-review.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p10"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 最終独立レビュー
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P10 を実行する: Hub 基盤 最終独立レビュー
goal: P01 requirements-baseline から P09 quality-assurance-report までの全成果物を、goal-spec (digest: sha256:06c97e2ee833b6bb42f76d38f2f133eededd1dc5422a75153f4d3a7a1c42111a) と quality_constraints 8 件に対して独立した視点で再点検する。この task 完了時点で、feature-execution-package-contract.md §7 の完了条件のうち P10 分の evidence が揃っている状態にする。
scope_in: ["docs/features/feat-hub-foundation/final-review-notes.md"]
scope_out: ["レビューで発見した不備の恒久修正 (該当する P02〜P09 の task へ差し戻して修正する)", "業務ドメインロジックのレビュー (goal-spec scope_out)", "evidence の証跡収集そのもの (P11 の scope)"]
acceptance: ["docs/features/feat-hub-foundation/final-review-notes.md に quality_constraints 8 件の充足状況が記録されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 最終独立レビュー

> task projection (P10 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-10-final-review.md`

## 依存

- SYS-HUB-FOUNDATION-P09

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P10)
