---
graph_node_id: "arch-webapp-001"
artifact_kind: "architecture"
artifact_subtypes: ["frontend","backend","infrastructure","security"]
project_id: "webapp-minimal"
domain: "web-application"
tags: ["authentication","dashboard","email-notification","admin-panel"]
priority: null
start_date: null
target_date: null
iteration: null
title: "小規模 Web アプリケーション基盤"
owners: []
created_at: "2026-07-30T11:00:00Z"
updated_at: "2026-07-30T11:00:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: []
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/arch-webapp-001.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":null,"origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 1.0
classification_reason: "Macro-level system architecture for small web app"
classification_candidates: []
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

# 小規模 Web アプリケーション基盤

## Context and drivers

ユーザー登録・ログイン・ダッシュボード・通知メール・管理者レポートを提供する小規模 Web アプリケーション。

## Goals and non-goals

### Goals
- ユーザー認証基盤の提供
- 利用状況の可視化
- メール通知の自動化
- 管理者向けレポート機能

### Non-goals
- 大規模分散システム
- マイクロサービスアーキテクチャ

## System context and boundaries

外部システムとの境界はSMTPメールサービスのみ。データベースは単一PostgreSQLインスタンス。

## Architecture overview

三層アーキテクチャ: フロントエンド (SPA)、バックエンド (REST API)、データベース (PostgreSQL)。

## Container and component view

- Frontend: React SPA
- Backend: REST API サーバー
- Database: PostgreSQL
- Email Service: SMTP integration

## Subtype architecture

### Frontend
SPA フレームワークによるダッシュボード・管理画面の実装。

### Backend
REST API によるビジネスロジック・認証・集計処理。

### Infrastructure
単一サーバーデプロイメント、PostgreSQL、SMTP。

### Security
パスワードハッシング、セッション管理、RBAC。

## Architecture decisions

- ADR-001: 三層モノリスアーキテクチャを採用（小規模アプリのため）
- ADR-002: PostgreSQL を唯一のデータストアとして使用
- ADR-003: SMTP 統合によるメール通知

## Cross-cutting contracts

- 認証: セッションベース認証
- ロギング: 構造化ログ
- エラーハンドリング: 統一エラーレスポンス形式

## Risks and verification

- リスク: SMTP サービス障害時のメール遅延 → 再試行キューで軽減
- リスク: DB 単一障害点 → バックアップ戦略で軽減

## Delivery, migration and rollback

単一サーバーへのデプロイ。データベースマイグレーションはバージョン管理。
