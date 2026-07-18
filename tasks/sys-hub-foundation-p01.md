---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p01.md", "confidence": 0.92}]
classification_confidence: 0.92
classification_reason: goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-hub-foundation.md の purpose/goal/scope/acceptance を要件ベースラインへ確定転記する P01 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: []
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p01.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P01
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P01
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/requirements-baseline.md"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-01-requirements.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p01"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 要件ベースライン確定
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P01 を実行する: Hub 基盤 要件ベースライン確定
goal: feat-hub-foundation の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (スコープ・受入基準・品質制約) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が machine-verifiable な baseline 文書として固定される。
scope_in: ["docs/features/feat-hub-foundation/requirements-baseline.md"]
scope_out: ["業務ドメインロジックの要件定義 (goal-spec scope_out)", "認証・認可の要件定義 (feat-auth-tenancy の scope)", "DB スキーマ実体の要件定義 (feat-domain-model-db の scope)", "実装コードの作成 (本 task は要件確定のみ)"]
acceptance: ["docs/features/feat-hub-foundation/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件が過不足なく転記されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 要件ベースライン確定

> task projection (P01 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-01-requirements.md`

## 依存

- なし (feature 内の先頭 phase)

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P01)
