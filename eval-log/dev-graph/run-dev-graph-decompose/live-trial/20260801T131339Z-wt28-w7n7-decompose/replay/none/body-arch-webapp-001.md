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
