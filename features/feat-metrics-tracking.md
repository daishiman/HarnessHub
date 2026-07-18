---
graph_node_id: feat-metrics-tracking
artifact_kind: feature
artifact_subtypes: []
title: Studio: 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード)
project_id: harness-hub
domain: backend
status: draft
priority: medium
start_date: null
target_date: null
iteration: Studio 拡張
owners: ["daishiman"]
tags: ["macro-feature", "studio-extension", "backend"]
file_path: features/feat-metrics-tracking.md
template_id: feature
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: pending
confirmation_evidence: {"evaluator": "user-design-review (claude session 9ce54d7a)", "evidence_ref": "eval-log/run-dev-graph-node-confirm-feat-metrics-tracking.json", "evaluated_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6"}
source_lineage: {"imported_at": "2026-07-17T10:44:09Z", "origin_kind": "generated", "source_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6", "source_path": "specs/harness-hub-system-specification.md", "source_plugin": "dev-graph", "source_version": null}
created_at: 2026-07-17T10:44:09Z
updated_at: 2026-07-17T14:34:01Z
depends_on: ["feat-hub-foundation", "feat-domain-model-db", "feat-auth-tenancy", "feat-user-org-admin"]
related_nodes: []
resource_scope: ["features/feat-metrics-tracking.md"]
purpose: 導入ハーネスの利用実態と削減効果 (G5) を可視化するため、実行ログ ingest (B2: 短命 token・冪等キー・回数のみ)・週次 rollup (B3: Workers cron)・試算エンジン共通層 (サーバ側係数換算) と S09/S16 ダッシュボードを提供する (I10)
goal: 実行ログがサーバ側で信頼可能に集計され (SEC5)、S09 ダッシュボード・S16 利用/削減効果・S17 個別集計が週次 rollup から描画される状態
scope_in: ["MetricsEvent/MetricsRollup エンティティ + ingest API (B2)", "Workers cron 週次 rollup (B3)", "試算エンジン純関数 (時給=年収÷annualHours・分/回・削減率、単一実装)", "S09 ダッシュボード (KPI/推移/完了率/ランキング/部門別)", "S16 利用・削減効果 (ハーネス別・週次)", "チャート共通部品の消費 (bundle 3MiB 予算内)"]
scope_out: ["クライアント側での金額換算・自己申告 (SEC5 で禁止)", "外部 BI 連携"]
acceptance: ["ingest が短命 token + 冪等キーで保護され重複計上しない", "金額換算がサーバ側のみで行われる (クライアント申告は回数のみ)", "S09/S16 が rollup 由来のデータで描画され CWV good を維持する"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-metrics-tracking.md"}]
tracker_binding: beads
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "open", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "incomplete", "missing_sections": ["13-task package 未生成 (system-dev-planner 待ち)"], "checked_at": "2026-07-17T10:44:09Z"}
---

# Studio: 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード)

> Studio 拡張 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。
> 由来: Harness Studio mockup 反映 (qa-021〜030・U7 改訂 appr-004/005・D5/D6)。正本分析: docs/mockups/harness-studio-v2-analysis.md

## 目的

導入ハーネスの利用実態と削減効果 (G5) を可視化するため、実行ログ ingest (B2: 短命 token・冪等キー・回数のみ)・週次 rollup (B3: Workers cron)・試算エンジン共通層 (サーバ側係数換算) と S09/S16 ダッシュボードを提供する (I10)

## 到達状態

実行ログがサーバ側で信頼可能に集計され (SEC5)、S09 ダッシュボード・S16 利用/削減効果・S17 個別集計が週次 rollup から描画される状態

## スコープ

**対象 (in):**

- MetricsEvent/MetricsRollup エンティティ + ingest API (B2)
- Workers cron 週次 rollup (B3)
- 試算エンジン純関数 (時給=年収÷annualHours・分/回・削減率、単一実装)
- S09 ダッシュボード (KPI/推移/完了率/ランキング/部門別)
- S16 利用・削減効果 (ハーネス別・週次)
- チャート共通部品の消費 (bundle 3MiB 予算内)

**対象外 (out):**

- クライアント側での金額換算・自己申告 (SEC5 で禁止)
- 外部 BI 連携

## 受入

- ingest が短命 token + 冪等キーで保護され重複計上しない
- 金額換算がサーバ側のみで行われる (クライアント申告は回数のみ)
- S09/S16 が rollup 由来のデータで描画され CWV good を維持する

## アーキテクチャ参照

- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-data](../architecture/harness-hub-data.md)
- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy
- feat-user-org-admin

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## 上流未解決 (P02 設計時に解消)

- 試算エンジンの実装 owner 記述に食い違いあり: docs/shared-layers.md §2 は feat-hub-foundation へ一元化と記載する一方、本 feature の scope_in は試算エンジン純関数を含む。P02 で owner を確定し、shared-layers.md か本 feature のどちらかを訂正する (出典: feat-user-org-admin plan-findings.json 2026-07-17 evaluator finding)
