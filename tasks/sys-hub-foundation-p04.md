---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p04.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: 承認済み設計を根拠に P05 実装前の test-first 受入契約を定義する P04 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P03"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p04.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P04
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P04
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/test-design.md", "apps/hub/tests/"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-04-test-design.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p04"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 テスト設計 (test-first 受入契約)
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P04 を実行する: Hub 基盤 テスト設計 (test-first 受入契約)
goal: P03 で承認された設計に基づき、P05 実装に先立って test-first の受入契約 (何が検証されれば feature acceptance を満たすか) を確定する。この task 完了時点で、CI 品質ゲート・bundle 予算・SLO 計測・/health 稼働のそれぞれについて、自動テストで検証可能な合否基準が定義されている状態にする。
scope_in: ["docs/features/feat-hub-foundation/test-design.md", "apps/hub/tests/"]
scope_out: ["テストコード実体の実装 (P05/P06 の scope)", "業務ドメインロジックのテスト設計 (goal-spec scope_out)", "Tenant 分離テスト・検査 pipeline 挙動同値テストの内容確定 (本 feature では枠のみ用意し、内容確定は消費 feature の scope)"]
acceptance: ["docs/features/feat-hub-foundation/test-design.md に goal-spec acceptance 3 件それぞれの test種別と合否基準が明記されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 テスト設計 (test-first 受入契約)

> task projection (P04 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-04-test-design.md`

## 依存

- SYS-HUB-FOUNDATION-P03

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P04)
