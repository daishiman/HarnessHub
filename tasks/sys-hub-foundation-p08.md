---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p08.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: 新規 scaffold feature のため refactor/migration の適用要否を判定し N/A 理由を機械可読に残す P08 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P07"]
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P08
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P08
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/refactoring-migration-note.md"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p08"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 リファクタリング・データ移行 (N/A 判定)
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P08 を実行する: Hub 基盤 リファクタリング・データ移行 (N/A 判定)
goal: feature-execution-package-contract.md §3 (P08 = refactoring/migration。不要でも「N/A: reason」を成果として実行する) に従い、feat-hub-foundation における refactoring・data migration・compatibility 対応の適用要否を判定する。この task 完了時点で、適用外である理由が機械可読に記録され、node 自体は 13-task exact-set の一員として存在している状態にする。
scope_in: ["docs/features/feat-hub-foundation/refactoring-migration-note.md"]
scope_out: ["実際のコードリファクタリング・データ移行の実施 (適用対象が存在しないため)", "将来の bundle 予算超過対応そのもの (P09 の運用監視トリガーとして別途扱う)", "DB スキーマ実体の移行 (feat-domain-model-db の scope)"]
acceptance: ["docs/features/feat-hub-foundation/refactoring-migration-note.md に 9 workstream すべての N/A 判定理由が記録されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 リファクタリング・データ移行 (N/A 判定)

> task projection (P08 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-HUB-FOUNDATION-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P08)
