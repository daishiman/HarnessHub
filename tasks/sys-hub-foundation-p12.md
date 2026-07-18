---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p12.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: P13 の本番デプロイに先立ち運用 runbook と利用者向けドキュメントを整備する P12 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P11"]
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p12.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P12
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P12
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/runbook.md", "README.md"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-12-documentation-operations.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p12"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 運用ドキュメント整備
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P12 を実行する: Hub 基盤 運用ドキュメント整備
goal: C1 (単独運用者が長期的に低運用負荷で回せる) を満たすため、Hub 基盤の運用手順を runbook として整備し、README.md の初期セットアップ手順を最終形へ更新する。この task 完了時点で、P13 の本番デプロイと、デプロイ後の日常運用 (障害対応、エラーバジェット運用、restore drill) が runbook 一つで完結できる状態にする。
scope_in: ["docs/features/feat-hub-foundation/runbook.md", "README.md"]
scope_out: ["業務ドメインロジックの運用ドキュメント (goal-spec scope_out)", "認証・認可の運用手順 (feat-auth-tenancy の scope)", "実際のデプロイ実行 (P13 の scope)"]
acceptance: ["docs/features/feat-hub-foundation/runbook.md にデプロイ・ロールバック・障害対応・エラーバジェット運用・restore drill の 5 手順が記載されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 運用ドキュメント整備

> task projection (P12 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-12-documentation-operations.md`

## 依存

- SYS-HUB-FOUNDATION-P11

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P12)
