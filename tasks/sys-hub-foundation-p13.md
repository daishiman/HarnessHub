---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p13.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: P12 の runbook に従い wrangler CLI で Hub を Cloudflare Workers 本番環境へデプロイする P13 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P12"]
domain: infrastructure
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p13.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P13
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P13
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: [".github/workflows/ci.yml", "docs/features/feat-hub-foundation/release-notes.md"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-13-release-deploy.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p13"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 本番リリース・デプロイ
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P13 を実行する: Hub 基盤 本番リリース・デプロイ
goal: P12 の runbook に従い、goal-spec acceptance「CI が test→deploy まで完走する」を満たす形で、Hub 基盤を Cloudflare Workers 本番環境へ wrangler CLI 経由でデプロイする。この task 完了時点で、.github/workflows/ci.yml の deploy ステップが本番へ到達し、/health が本番 URL 上で応答し、外部死活監視と SLO ダッシュボードが本番稼働を計測している状態にする。goal-spec の acceptance 3 件のうち、本番環境での実現は本 task が担う (P07 は CI/開発環境での判定)。
scope_in: [".github/workflows/ci.yml", "docs/features/feat-hub-foundation/release-notes.md"]
scope_out: ["業務ドメインロジックのリリース (goal-spec scope_out)", "認証・認可のリリース (feat-auth-tenancy の scope)", "本番デプロイ後の恒常的な運用監視そのもの (P12 runbook に基づき日常運用として継続、本 task は初回デプロイと稼働確認のみ)"]
acceptance: ["docs/features/feat-hub-foundation/release-notes.md にデプロイ日時・Worker バージョン・本番 URL・/health 初回応答・bundle サイズ最終値が記録されている"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 本番リリース・デプロイ

> task projection (P13 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-13-release-deploy.md`

## 依存

- SYS-HUB-FOUNDATION-P12

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P13)
