---
acceptance: ["release-record.md に N/A: 本 feature は Hub 本体の実デプロイを持たないため実デプロイなし、という close-out 判断、採用経路の decision record 登録依頼内容 (id/question/status/options/評価軸/確定根拠。system-spec/spec-state.json decisions[] への実書込は C01 writer 経由)、および Stage 1 開始条件 (H7 成立) の判定結果の 3 点が記載されていること"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p13.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: 本 feature は Hub 本体を持たないため実デプロイを行わない (N/A)。P13 は採用経路の decision record 登録依頼 (system-spec/spec-state.json decisions[] への実書込は C01 writer が所有し本 task は依頼内容の確定・引き渡しのみを行う) と、H7 成立結果に基づく Stage 1 開始条件の判定を実施する release-deploy タスクとして適用される
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P12"]
domain: operations
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p13.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: 本 feature の最終 task として、採用経路の decision record 登録依頼内容を確定し (実際の system-spec/spec-state.json decisions[] への書込は C01 writer コンポーネントが所有する)、H7 の成立結果に基づく Stage 1 開始条件の判定結果を release-record.md として確定する。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P13
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P13
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P13 を実行する: リリース/デプロイ — 採用経路の decision record 登録依頼 (C01 writer 経由) と Stage 1 開始条件判定
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/release-record.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/release-record.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "system-spec/spec-state.json decisions[] への実書込 (owner=C01 writer コンポーネント。本 task は登録依頼内容の確定と引き渡しのみを行う)", "Stage 1 系 feature 自体の起票・着手 (本 task は開始条件の判定のみ。実際の起票は dev-graph が別途行う)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-13-release-deploy.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "operations", "release-deploy"]
target_date: null
template_id: task
template_version: 1.0.0
title: リリース/デプロイ — 採用経路の decision record 登録依頼 (C01 writer 経由) と Stage 1 開始条件判定
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# リリース/デプロイ — 採用経路の decision record 登録依頼 (C01 writer 経由) と Stage 1 開始条件判定

> task projection (P13 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-13-release-deploy.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P12

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P13)
