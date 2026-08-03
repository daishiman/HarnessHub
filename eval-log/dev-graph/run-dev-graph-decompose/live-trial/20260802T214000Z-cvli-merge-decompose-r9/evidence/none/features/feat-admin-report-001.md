---
graph_node_id: "feat-admin-report-001"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "webapp-minimal"
domain: "web-application"
tags: ["admin-panel","reporting","analytics"]
priority: null
start_date: null
target_date: null
iteration: null
title: "運営者向けレポート画面"
owners: []
created_at: "2026-07-30T11:00:00Z"
updated_at: "2026-07-30T11:00:00Z"
status: "draft"
depends_on: ["feat-user-auth-001"]
related_nodes: []
resource_scope: ["src/frontend/components/admin-report","src/backend/routes/admin"]
purpose: "運営者が全ユーザーの利用状況を一元的に集計・可視化でき、運営判断に活用できるようにする"
goal: "管理者ロールを持つユーザーが専用レポート画面で全ユーザーの集計統計を確認できる状態"
scope_in: ["管理者ロール判定・アクセス制御","全ユーザー利用統計集計","レポート画面UI実装","集計API"]
scope_out: ["個別ユーザー強制停止","全件ログダウンロード","ML異常検知"]
acceptance: ["管理者ロール認証成功時のみアクセス可能","全ユーザー集計統計が表示される","CSVエクスポート可能"]
architecture_refs: ["arch-webapp-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-admin-report-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-30T11:00:00Z","origin_kind":"generated","source_digest":"7c08c499e176f8c3f6f0349a5d22bead19b24bc9a5605911b68afc1003a14577","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "Admin-facing analytics feature for operational oversight"
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

# 運営者向けレポート画面

## 目的

運営者が全ユーザーの利用状況を一元的に集計・可視化でき、運営判断に活用できるようにする。

## 到達状態

管理者ロールを持つユーザーが専用レポート画面で全ユーザーの集計統計を確認できる状態。

## スコープ

### スコープ内

- 管理者ロール判定・アクセス制御
- 全ユーザー利用統計集計
- レポート画面UI実装
- 集計API

### スコープ外

- 個別ユーザー強制停止
- 全件ログダウンロード
- ML異常検知

## 受入条件

- 管理者ロール認証成功時のみアクセス可能
- 全ユーザー集計統計が表示される
- CSVエクスポート可能

## アーキテクチャ参照

- arch-webapp-001: 三層アーキテクチャ (Frontend SPA, Backend REST API, PostgreSQL)

## 機能間依存

- feat-user-auth-001: ユーザー認証基盤に依存

## Handoff

system-dev-planner へ委譲し P01..P13 の13タスク仕様書を生成する。
