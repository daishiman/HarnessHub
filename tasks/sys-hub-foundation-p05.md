---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/sys-hub-foundation-p05.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: P02 承認構成と P04 テスト設計に基づき pnpm monorepo scaffold・CI/CD・監視・SLO を実装する P05 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hub-foundation/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T08:03:32Z
depends_on: ["SYS-HUB-FOUNDATION-P04"]
domain: infrastructure
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hub-foundation
file_path: tasks/sys-hub-foundation-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HUB-FOUNDATION-P05
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hub-foundation
phase_ref: P05
priority: null
project_id: feature-package-feat-hub-foundation
pull_request_linkages: []
related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
resource_scope: ["apps/hub/", "packages/ui/", "packages/schemas/", "packages/inspection/", "packages/db/", "pnpm-workspace.yaml", "package.json", "wrangler.jsonc", "open-next.config.ts", ".github/workflows/ci.yml", "README.md"]
source_lineage: {"imported_at": "2026-07-17T08:03:32Z", "origin_kind": "system-dev-planner", "source_digest": "d6cce29a0f3ba6d5f3988e3d4310201fc8be0fee08688def59ad76399cb4b12a", "source_path": ".dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hub-foundation", "stage-1", "infrastructure", "p05"]
target_date: null
template_id: task
template_version: 1.0.0
title: Hub 基盤 実装 (scaffold・CI/CD・監視・SLO)
tracker_binding: beads
updated_at: 2026-07-17T08:03:32Z
purpose: feat-hub-foundation の P05 を実行する: Hub 基盤 実装 (scaffold・CI/CD・監視・SLO)
goal: P02 で確定した pnpm workspace 構成と P04 の test-first 受入契約に基づき、goal-spec の scope_in 全項目 (Next.js + TypeScript + pnpm monorepo scaffold、@opennextjs/cloudflare デプロイ、GitHub Actions CI/CD、/health + 外部死活監視、SLO ダッシュボード + bundle サイズ予算 CI) を依存順に実装する。この task 完了時点で、pnpm 強制 CI から wrangler deploy までが動作し、/health と SLO 計測の土台が稼働する状態にする。
scope_in: ["apps/hub/", "packages/ui/", "packages/schemas/", "packages/inspection/", "packages/db/", "pnpm-workspace.yaml", "package.json", "wrangler.jsonc", "open-next.config.ts", ".github/workflows/ci.yml", "README.md"]
scope_out: ["業務ドメインロジックの実装 (goal-spec scope_out)", "認証・認可の実装 (feat-auth-tenancy の scope)", "DB スキーマ実体の実装 (feat-domain-model-db の scope)", "axe a11y チェックの本格運用 (対象画面が増える後続 feature で有効化。本 task では導線枠のみ)"]
acceptance: [".github/workflows/ci.yml が pnpm install から build/test/bundle チェックまでを実行し、/health route handler が実装され開発環境で 200 応答を返す"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
---

# Hub 基盤 実装 (scaffold・CI/CD・監視・SLO)

> task projection (P05 / parent: feat-hub-foundation)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hub-foundation/task-specs/phase-05-implementation.md`

## 依存

- SYS-HUB-FOUNDATION-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HUB-FOUNDATION-P05)
