---
graph_node_id: "issue-hub-cwv-tbt-over-budget-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["feat-hub-foundation","cwv","performance","qa-018"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "Hub 本番の初回 CWV 実測で TBT 926ms (予算 200ms) 超過 — 不要 JS 削減の是正"
owners: ["daishiman"]
created_at: "2026-07-24T09:00:00Z"
updated_at: "2026-07-24T09:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-hub-foundation"]
resource_scope: ["apps/hub/",".github/workflows/cwv.yml"]
purpose: "G11 (cwv.yml) の初回実測 (2026-07-24 / run 30074457529 / 本番 harness-hub.daishimanju.workers.dev) で LCP 1154ms・CLS 0.00 は good、TBT 926.50ms が予算 200ms を超過し run が fail した。qa-018(2) の確定手段 (不要 JS 削減) による是正を追跡する。証跡: docs/features/feat-hub-foundation/evidence/recheck-2026-07-24.md §5"
goal: "本番 URL への cwv.yml 実測で TBT ≤ 200ms となり、CWV 全指標 good で run が success 終了する状態"
scope_in: ["hydration / クライアント JS の削減 (不要 JS 削減。qa-018(2) の確定手段)","依存の見直しと code splitting","cwv.yml 再計測での good 確認"]
scope_out: ["G11 閾値の緩和","bundle 予算 (G5) の変更","PR 単位の Lighthouse 実行 (C2 の Actions 無料枠に反する)"]
acceptance: ["gh workflow run cwv.yml -f target_url=<本番URL> の run が success で終了する","TBT (INP の lab 代理指標) ≤ 200ms","LCP ≤ 2500ms / CLS ≤ 0.1 を維持している"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hub-cwv-tbt-over-budget-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T09:00:00Z","origin_kind":"manual","source_digest":"2d8fb58e0087dbb308a0e42c92a238b8e0ced6141b189866906888644f720ab2","source_path":"docs/features/feat-hub-foundation/evidence/recheck-2026-07-24.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "G11 初回実測 (2026-07-24 / run 30074457529) の TBT 予算超過を是正する issue。G11 の設計 (good を外れたら是正起票) に基づく"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-cwv-tbt-over-budget-20260724.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T09:00:00Z","missing_sections":[],"status":"complete"}
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
