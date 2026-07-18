---
acceptance: ["requirements-baseline.md への acceptance 3 件 + quality_constraints 8 件の過不足なき転記"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p01.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-stage0-distribution-gate.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: []
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p01.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: feat-stage0-distribution-gate の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (Skill 配布の成立経路検証という本 feature の中心責務、URL 型 marketplace / npm source / Bootstrap Installer の 3 経路検証、macOS/Windows 実機 E2E、採用経路の decision record 登録) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件が machine-verifiable な baseline 文書として固定される。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P01
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P01
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P01 を実行する: 配布経路検証 (H7) 要件ベースライン確定 — URL 型 marketplace / npm source / Bootstrap Installer 2 経路以上実機検証・Windows E2E・decision record 登録
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/requirements-baseline.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/requirements-baseline.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "実装コードの作成 (本 task は要件確定のみ。実装は P05 で扱う)", "採用経路の decision record への実書込 (owner=C01 writer コンポーネント。本 feature は登録依頼内容の確定のみを担う)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-01-requirements.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "documentation", "requirements-baseline"]
target_date: null
template_id: task
template_version: 1.0.0
title: 配布経路検証 (H7) 要件ベースライン確定 — URL 型 marketplace / npm source / Bootstrap Installer 2 経路以上実機検証・Windows E2E・decision record 登録
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# 配布経路検証 (H7) 要件ベースライン確定 — URL 型 marketplace / npm source / Bootstrap Installer 2 経路以上実機検証・Windows E2E・decision record 登録

> task projection (P01 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-01-requirements.md`

## 依存

- なし (feature 内の先頭 phase)

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P01)
