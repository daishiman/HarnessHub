---
graph_node_id: "feat-dashboard-001"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "webapp-minimal"
domain: "web-application"
tags: ["dashboard","usage-tracking"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ダッシュボードで利用状況確認"
owners: []
created_at: "2026-07-30T11:00:00Z"
updated_at: "2026-07-30T11:00:00Z"
status: "draft"
depends_on: ["feat-user-auth-001"]
related_nodes: []
resource_scope: ["src/frontend/components/dashboard","src/backend/routes/dashboard"]
purpose: "ログイン後のユーザーが自分の利用状況を可視化できるようにする"
goal: "認証済みユーザーがダッシュボード画面で自分の利用統計を確認できる状態"
scope_in: ["利用統計データの収集・格納","ダッシュボードUI実装","バックエンドAPI集計","アクセス制御"]
scope_out: ["リアルタイム通知","管理者向けレポート","AI予測"]
acceptance: ["ログイン済みユーザーがダッシュボードにアクセス可能","利用統計が正確に表示される","未ログイン状態ではアクセス拒否"]
architecture_refs: ["arch-webapp-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-dashboard-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-30T11:00:00Z","origin_kind":"generated","source_digest":"7c08c499e176f8c3f6f0349a5d22bead19b24bc9a5605911b68afc1003a14577","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "User-facing dashboard feature for usage statistics"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

# ダッシュボードで利用状況確認

## 目的

ログイン後のユーザーが自分の利用状況を可視化できるようにする。

## 到達状態

認証済みユーザーがダッシュボード画面で自分の利用統計を確認できる状態。

## スコープ

### スコープ内

- 利用統計データの収集・格納
- ダッシュボードUI実装
- バックエンドAPI集計
- アクセス制御

### スコープ外

- リアルタイム通知
- 管理者向けレポート
- AI予測

## 受入条件

- ログイン済みユーザーがダッシュボードにアクセス可能
- 利用統計が正確に表示される
- 未ログイン状態ではアクセス拒否

## アーキテクチャ参照

- arch-webapp-001: 三層アーキテクチャ (Frontend SPA, Backend REST API, PostgreSQL)

## 機能間依存

- feat-user-auth-001: ユーザー認証基盤に依存

## Handoff

system-dev-planner へ委譲し P01..P13 の13タスク仕様書を生成する。
