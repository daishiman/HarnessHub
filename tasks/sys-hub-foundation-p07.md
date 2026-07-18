---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p07.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P06 のテスト実行結果を goal-spec acceptance と突合し feature 受入可否を判定する P07 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P06"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p07.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P07
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P07
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/acceptance-report.md"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-07-acceptance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p07"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 feature 受入判定
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P07 を実行する: Hub 基盤 feature 受入判定
goal: P06 のテスト実行結果を goal-spec の acceptance 3 件 (CI が test→deploy を完走する / Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する / SLO 99.5% の計測と /health が稼働する) と突合し、feature 単位の受入可否を判定する。この task 完了時点で、feature-execution-package-contract.md §7 が定める「P07/P10/P11 の evidence から feature acceptance が満たされた」という完了条件のうち P07 分の判定材料が揃っている状態にする。
scope_in: ["docs/features/feat-hub-foundation/acceptance-report.md"]
scope_out: ["不合格判定時の恒久修正 (該当する P05/P06 へ差し戻して修正する)", "業務ドメインロジックの受入判定 (goal-spec scope_out)", "最終独立レビュー (P10 の scope)"]
acceptance: ["docs/features/feat-hub-foundation/acceptance-report.md に goal-spec acceptance 3 件それぞれの合否と根拠が明記されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 feature 受入判定

> task projection (P07 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-07-acceptance.md`

## 依存

- SYS-HUB-FOUNDATION-P06

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P07)
