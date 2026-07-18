---
graph_node_id: feat-hub-foundation
artifact_kind: feature
artifact_subtypes: []
title: Hub 基盤: Workers + Next.js scaffold / CI/CD / 運用 baseline
project_id: harness-hub
domain: infrastructure
status: draft
priority: high
start_date: null
target_date: null
iteration: Stage 1
owners: ["daishiman"]
tags: ["macro-feature", "stage-1", "infrastructure"]
file_path: features/feat-hub-foundation.md
template_id: feature
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: pending
confirmation_evidence: {"evaluator": "user-design-review (claude session 9ce54d7a)", "evidence_ref": "eval-log/run-dev-graph-node-confirm-feat-hub-foundation.json", "evaluated_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6"}
source_lineage: {"origin_kind": "generated", "source_plugin": "dev-graph", "source_path": "specs/harness-hub-system-specification.md", "source_version": null, "source_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6", "imported_at": "2026-07-17T00:38:30Z"}
created_at: 2026-07-17T00:38:30Z
updated_at: 2026-07-17T07:00:28Z
depends_on: []
related_nodes: []
resource_scope: ["features/feat-hub-foundation.md"]
purpose: 費用ゼロ制約 (C2) 下で Hub の実行基盤 (Cloudflare Workers 一体型 + OpenNext) と CI/CD・監視・SLO 運用の土台を確立する
goal: pnpm 強制 CI → wrangler deploy が自動化され、/health・監視・SLO 99.5% 計測が稼働し、Worker 3MiB 予算内で Next.js が動作する状態
scope_in: ["Next.js + TypeScript + pnpm monorepo scaffold", "@opennextjs/cloudflare デプロイ", "GitHub Actions CI/CD (npm 混入 fail)", "/health + 外部死活監視", "SLO ダッシュボード + bundle サイズ予算 CI"]
scope_out: ["業務ドメインロジック", "認証"]
acceptance: ["CI が test→deploy を完走する", "Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する", "SLO 99.5% の計測と /health が稼働する"]
architecture_refs: ["arch-harness-hub-infrastructure", "arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-hub-foundation.md"}]
tracker_binding: beads
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "open", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "incomplete", "missing_sections": ["13-task package 未生成 (system-dev-planner 待ち)"], "checked_at": "2026-07-17T00:38:30Z"}
---

# Hub 基盤: Workers + Next.js scaffold / CI/CD / 運用 baseline

> Stage 1 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

費用ゼロ制約 (C2) 下で Hub の実行基盤 (Cloudflare Workers 一体型 + OpenNext) と CI/CD・監視・SLO 運用の土台を確立する

## 到達状態

pnpm 強制 CI → wrangler deploy が自動化され、/health・監視・SLO 99.5% 計測が稼働し、Worker 3MiB 予算内で Next.js が動作する状態

## スコープ

**対象 (in):**

- Next.js + TypeScript + pnpm monorepo scaffold
- @opennextjs/cloudflare デプロイ
- GitHub Actions CI/CD (npm 混入 fail)
- /health + 外部死活監視
- SLO ダッシュボード + bundle サイズ予算 CI

**対象外 (out):**

- 業務ドメインロジック
- 認証

## 受入

- CI が test→deploy を完走する
- Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する
- SLO 99.5% の計測と /health が稼働する

## アーキテクチャ参照

- [arch-harness-hub-infrastructure](../architecture/harness-hub-infrastructure.md)
- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- なし

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
