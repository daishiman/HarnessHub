---
graph_node_id: "spec-requirements-definition"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "wt28-postmerge-system-spec"
domain: "system"
tags: ["system-spec","requirements"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "要件定義書 — 上位概念 U1-U9"
owners: []
created_at: "2026-07-29T11:00:00Z"
updated_at: "2026-07-29T11:00:00Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: []
purpose: "自分の TODO を外部サービスにデータを渡さずに手元 1 プロセスで管理・自動化する仕様の上位概念 (U1-U9) と技術要件を定義する"
goal: "G1=外部送信0件 G2=認証必須 G3=再起動後データ保持 G4=1コマンド起動停止"
scope_in: ["要件定義 (U1-U9)","データベース (SQLite)","認証 (bearer token)","バックエンド (FastAPI)","インフラ (localhost)","セキュリティ","UI-UX (web)","フロントエンド (web)","保守運用"]
scope_out: ["モバイルアプリ","タブレット専用UI","Windowsデスクトップ","Linuxデスクトップ","macOSネイティブ"]
acceptance: ["spec-state.json の全48セルが終端 (未収集0)","completeness-report.json verdict=PASS","全確定セルが serves_goals で G1-G4 へトレース"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/spec-requirements-definition.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7e3732f5b155cd85fd21b6a6119411a8f9f14be96f254ec4ac9a794e2ef95551","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-07-29T11:30:00Z","origin_kind":"system-spec-harness","source_digest":"7e3732f5b155cd85fd21b6a6119411a8f9f14be96f254ec4ac9a794e2ef95551","source_path":"system-spec/00-requirements-definition.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "system-spec-harness 要件定義書からの直接 import"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-29T11:30:00Z","evidence_refs":["system-spec/completeness-report.json"],"policy":"manual","reconciled_at":null,"source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-29T11:30:00Z","missing_sections":[],"status":"complete"}
---

# 目的と成功状態

自分の TODO を外部サービスにデータを渡さずに手元 1 プロセスで管理・自動化できる状態にする。成功時は未認証要求が全エンドポイントで 401 を返し、再起動後も全 TODO が保持され、外部通信が 0 件で、起動が 1 コマンドで完了する。

## スコープ

- In: 要件定義 (U1-U9)、データベース (SQLite)、認証 (bearer token)、バックエンド (FastAPI)、インフラ (localhost)、セキュリティ、UI-UX (web)、フロントエンド (web)、保守運用
- Out: モバイルアプリ、タブレット専用UI、Windows/Linux/macOS ネイティブクライアント

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| 利用者兼開発者 | 唯一の利用者であり要求の確定権限を持つ |
| TODO | 管理対象のタスクデータ。CRUD 操作で管理する |
| bearer token | localhost 上の API 認証に使用するトークン |

## ユースケースとユーザーフロー

1. 利用者が 1 コマンドで API サーバを起動する
2. 利用者が bearer token 付きリクエストで TODO を作成する
3. 利用者が TODO 一覧を取得・更新・削除する
4. 利用者がプロセスを停止し、データファイルをコピーしてバックアップする

## 機能要件

- `FR-001`: TODO の CRUD (作成・参照・更新・削除) を REST API で提供する
- `FR-002`: 全エンドポイントは bearer token 認証を必須とする
- `FR-003`: データは SQLite 単一ファイルに永続化し、再起動後も保持する
- `FR-004`: 1 コマンドで起動・停止できる

## 非機能要件

- Performance: localhost 単一ユーザー想定のため応答時間制約なし
- Availability/Reliability: プロセス再起動後にデータが失われないこと
- Accessibility/Usability: CLI/curl で操作可能な REST API
- Security/Privacy: 外部通信 0 件、bearer token 認証必須
- Maintainability/Operability: バックアップはファイル 1 個のコピー

## UI・状態遷移

- API 状態: 停止 → 起動中 → 稼働 → 停止
- 遷移条件: 起動コマンドで稼働、停止コマンドで停止
- Loading/Empty/Error: 未認証は 401、リソース未存在は 404

## ビジネスルールと検証

- `BR-001`: 未認証リクエストは全エンドポイントで 401 を返す
- `BR-002`: TODO データは外部サービスへ送信しない (外部 network 送信 0 件)
- `BR-003`: バックアップは SQLite ファイル 1 個のコピーで完了する

## API契約

REST API: FastAPI が OpenAPI 仕様を自動生成する。エンドポイントは TODO リソースの CRUD (POST/GET/PUT/DELETE)。認証は bearer token ヘッダ必須。

## データモデル

- Entity: TODO (id, title, description, completed, created_at, updated_at)
- Fields/Types: id=integer(PK auto), title=text(NOT NULL), description=text(nullable), completed=boolean(default false), created_at=datetime, updated_at=datetime
- Storage: SQLite 単一ファイル、追加インデックス不要 (単一ユーザー)

## 認証・認可

- 認証方式: localhost bearer token (FastAPI の HTTPBearer)
- 認可: 単一ユーザーのため全操作を許可 (トークン一致で認証通過)
- トークン管理: 環境変数または設定ファイルで指定

## エラー・例外・回復

- 401 Unauthorized: bearer token 未指定または不一致
- 404 Not Found: 指定 ID の TODO が存在しない
- 500 Internal Server Error: SQLite I/O エラー (ログ出力後プロセス継続)
- 回復: データファイル破損時はバックアップからコピー復元

## イベント・非同期処理

N/A: 本システムは同期 REST API のみ。非同期処理・イベント駆動は対象外。

## 可観測性

- ログ: FastAPI 標準の stdout ログ (アクセスログ + エラーログ)
- メトリクス: 単一ユーザー想定のため外部メトリクス収集は対象外
- トレーシング: 対象外

## 互換性・移行・リリース

- 新規構築のため既存システムからの移行は不要
- API バージョニング: 初期リリースでは v1 固定
- SQLite スキーマ変更時はマイグレーションスクリプトを用意する

## テストと受入条件

- 未認証要求が全エンドポイントで 401 を返すこと
- TODO 作成→プロセス再起動→一覧取得で作成した TODO が戻ること
- 外部通信 0 件をレビューで確認すること
- 起動 1 コマンド、バックアップ 1 ファイルコピーで記述できること

## 未決事項

N/A: 全要件が確定済み (completeness-report.json verdict=PASS)。
