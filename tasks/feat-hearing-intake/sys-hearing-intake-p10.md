---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p10.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: feature-execution-package-contract.md §7 が定める最終独立レビューゲートに従い、quality_constraints 10 件全件を P01-P09 の成果物に照らして最終点検する P10 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P09"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p10.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P10
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P10
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/final-review-notes.md"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-10-final-review.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "final-review"]
target_date: null
template_id: task
template_version: 1.0.0
title: 最終独立レビュー — feature 全体の confirmation 前最終点検
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P10 を実行する: 最終独立レビュー — feature 全体の confirmation 前最終点検
goal: feature-execution-package-contract.md §7 が定める最終独立レビューゲートに従い、goal-spec の quality_constraints 10 件全件を P01-P09 の成果物に照らして最終点検し、feature 全体が confirmation へ進める状態にあるかを判定する。
scope_in: ["docs/features/feat-hearing-intake/final-review-notes.md"]
scope_out: ["quality_constraints 未充足時の実装修正 (該当 task を再実行対象として差し戻す)", "feature の confirmation 判定そのもの (system-dev-plan-evaluator の C12 判定と dev-graph の C11 promotion の scope)"]
acceptance: ["final-review-notes.md に quality_constraints 10 件全件それぞれの充足判定と根拠成果物への参照が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# 最終独立レビュー — feature 全体の confirmation 前最終点検

> task projection (P10 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-10-final-review.md`

## 依存

- SYS-HEARING-INTAKE-P09

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P10)
