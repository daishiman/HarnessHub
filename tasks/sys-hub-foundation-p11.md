---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p11.md", "confidence": 0.86}]
classification_confidence: 0.86
classification_reason: P06〜P10 の実行結果・判定記録を再現可能な証跡として収集・保存する P11 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P10"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p11.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P11
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P11
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/evidence/"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-11-evidence.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p11"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 証跡収集
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P11 を実行する: Hub 基盤 証跡収集
goal: P06 (test-run)、P07 (acceptance)、P09 (quality-assurance)、P10 (final-review) それぞれの実行結果・判定記録を、再現可能な形式で docs/features/feat-hub-foundation/evidence/ 配下に集約保存する。この task 完了時点で、feature-execution-package-contract.md §7 が定める完了条件のうち P11 分の evidence が揃っている状態にする。
scope_in: ["docs/features/feat-hub-foundation/evidence/"]
scope_out: ["証跡から新たな不備が発見された場合の恒久修正 (該当する P02〜P10 の task へ差し戻して修正する)", "業務ドメインロジックの証跡収集 (goal-spec scope_out)", "運用ドキュメント・runbook の作成 (P12 の scope)"]
acceptance: ["docs/features/feat-hub-foundation/evidence/index.md に P06/P07/P09/P10 の一次証跡への参照が明記されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 証跡収集

> task projection (P11 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-11-evidence.md`

## 依存

- SYS-HUB-FOUNDATION-P10

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P11)
