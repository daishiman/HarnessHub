---
graph_node_id: "issue-hub-cwv-tbt-over-budget-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["hub","performance","cwv","ci-gate","bundle-budget","qa-018"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "Hub 本番の初回 CWV 実測で TBT 926ms (予算 200ms) 超過 — 不要 client JS 削減と PR 段階の予算ゲート新設"
owners: ["daishiman"]
created_at: "2026-07-24T00:00:00Z"
updated_at: "2026-07-25T09:27:54Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/next.config.ts","apps/hub/package.json","apps/hub/scripts/check-client-bundle.mjs","apps/hub/tests/ci/client-bundle-budget.test.ts",".github/workflows/ci.yml","package.json","docs/shared-layers.md","docs/infrastructure-spec.md","docs/frontend-spec.md","docs/features/feat-hub-foundation/architecture-decision-record.md"]
purpose: "2026-07-24 の Hub 本番初回 CWV 実測で TBT 926ms (予算 200ms・qa-018 の INP lab 代理指標) を記録した。原因は apps/hub/src/app/{page,layout}.tsx が @harness-hub/ui の barrel から named import しており、App Router が barrel 経由で到達可能な 'use client' 部品を丸ごと client reference manifest へ載せるため、Alert 1 個しか使わない / が MarkdownView 依存の react-markdown/micromark/rehype 一式 (146.4 KB) を初期チャンクで読んでいたこと。さらに既存 CI ゲート G5 は wrangler が Cloudflare へ上げる Worker (サーバー側実行コード) を 3MiB 予算で測る設計であり、ブラウザへ配る client JS の退行を原理的に検知できない (実測時 0.96MiB/3MiB で緑のままだった)。G11 (CWV 定期計測) は main 反映後の実行なので PR 段階では止められず、client JS 退行を事前に遮断する経路が存在しない。"
goal: "/ の First Load JS を framework baseline 近傍まで削減して TBT 予算超過の主因を除去し、同種の退行が PR 段階で必ず fail する client JS 予算ゲート (G12) を CI 品質ゲート登録簿へ正式登録した状態にする。"
scope_in: ["next.config.ts への experimental.optimizePackageImports 追加による barrel 巻き込みの解消","route ごと First Load JS を gzip 実測する client JS 予算ゲート (G12) の新設と ci.yml 配線","CI 品質ゲート登録簿 (shared-layers.md) / 設計正本 (ADR §6) / infrastructure-spec / frontend-spec §8 への G12 反映","dev-workflow qa-039【2】の CI/local 同値要件に沿った root pnpm verify への G12 組み込み"]
scope_out: ["TBT <=200ms の本番実測による最終確認 (cwv.yml の定期計測または workflow_dispatch が必要でデプロイ後にのみ取得可能)","G11 cwv.yml 自体の閾値・実装変更","packages/ui 側の barrel 構成そのものの再設計 (公開 contract 単一入口 R-15 は維持する)","Markdown エディタ等を実際に使う重量 route の個別予算設計 (発生時に measureRoutes で例外化する余地のみ残す)"]
acceptance: ["/ の First Load JS が是正前 159 kB から framework baseline 近傍へ削減され、gzip 実測で予算 120 KiB/route を満たす","optimizePackageImports を外して再ビルドすると G12 が非ゼロ終了し、route handler は誤検知しないことが実測で確認できる","CI 品質ゲート登録簿・ADR §6・infrastructure-spec・frontend-spec §8 の 4 者が G12 を含む形で整合し、shared-layers.md の不変条件 (ゲート増減時の同一 PR 改訂) を満たす"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hub-cwv-tbt-over-budget-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "本番 CWV 実測で判明した性能退行と、それを検知できなかった CI ゲート設計ギャップを追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-cwv-tbt-over-budget-20260724.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-aqi","linked_at":"2026-07-24T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-25T09:27:54Z","missing_sections":[],"status":"incomplete"}
---

# 概要

<問題または要望を一文で記載>

## 背景と問題

<誰が、どの状況で、何に困っているか>

## 現在の挙動

<観測事実。再現不能の場合はその旨と理由>

## 期待する挙動

<解決後に観測できる状態>

## 再現手順またはユースケース

1. <step>

## 影響と優先度

- 影響範囲: <users/data/system>
- 深刻度: <critical|high|medium|low>
- 緊急度: <理由>

## スコープ

- In: <対象>
- Out: <非対象>

## 関連グラフ

- 原因/親ノード: <graph_node_id>
- 関連仕様: <graph_node_id>
- 関連アーキテクチャ: <graph_node_id>
- 解決タスク: <graph_node_id>

## 受入条件

- [ ] <観測可能な結果>

## 検証証跡

- コマンド/テスト: <how-to-verify>
- 証跡 path: <path-or-url>
