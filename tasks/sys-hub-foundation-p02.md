---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p02.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: pnpm workspace 構成 (apps/hub + packages/ui,schemas,inspection,db) と Cloudflare Workers デプロイ単位を比較検討し確定する P02 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P01"]
domain: infrastructure
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P02
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P02
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/architecture-decision-record.md", "pnpm-workspace.yaml", "package.json"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p02"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 アーキテクチャ・workstream 設計 (pnpm monorepo 構成確定)
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P02 を実行する: Hub 基盤 アーキテクチャ・workstream 設計 (pnpm monorepo 構成確定)
goal: feat-hub-foundation の frontend/backend/API/data/infrastructure/security workstream 設計を確定し、特に docs/shared-layers.md §4 が「要ユーザー確認」としていた pnpm workspace 構成 (apps/hub + packages/ui,schemas,inspection,db) を、本 task の設計判断として比較検討し確定する。この task 完了時点で、後続の P03 独立設計レビューが評価できる具体的なディレクトリ構成・デプロイ単位・共通層境界が揃っている状態にする。
scope_in: ["docs/features/feat-hub-foundation/architecture-decision-record.md", "pnpm-workspace.yaml", "package.json"]
scope_out: ["packages/db のスキーマ内容確定 (feat-domain-model-db の scope)", "認可ミドルウェアの実装本体 (feat-auth-tenancy の scope)", "plugins/publisher/ の実装内容確定 (feat-publisher-plugin の scope)", "業務ドメイン API 契約の内容確定 (後続 feature の scope)"]
acceptance: ["docs/features/feat-hub-foundation/architecture-decision-record.md に pnpm workspace 構成の比較表と (b) 採用理由、apps/hub と packages/* の責務境界が記載されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 アーキテクチャ・workstream 設計 (pnpm monorepo 構成確定)

> task projection (P02 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-02-architecture.md`

## 依存

- SYS-HUB-FOUNDATION-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P02)
