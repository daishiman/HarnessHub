---
graph_node_id: "arch-system-infrastructure"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "wt28-postmerge-system-spec"
domain: "system"
tags: ["system-spec","architecture","infrastructure"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "システムインフラストラクチャ — SQLite / FastAPI / localhost bearer token"
owners: []
created_at: "2026-07-29T11:00:00Z"
updated_at: "2026-07-29T11:00:00Z"
status: "active"
depends_on: ["spec-requirements-definition"]
related_nodes: []
resource_scope: []
purpose: "TODO管理APIのインフラ構成 (SQLite/FastAPI/localhost bearer token) を定義し、外部依存0・単一ファイル永続化・1コマンド運用を実現する"
goal: "G1=外部送信0件 G4=追加ミドルウェアなし1コマンド起動停止バックアップ"
scope_in: ["SQLite 単一ファイルDB","FastAPI バックエンド","localhost bearer token 認証","ファイルコピーバックアップ"]
scope_out: ["クラウドDB","コンテナオーケストレーション","OAuth2外部IDP","CDN"]
acceptance: ["常駐ミドルウェア0","起動1コマンド","バックアップ=ファイル1個コピー","外部通信0件"]
architecture_refs: ["spec-requirements-definition"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/arch-system-infrastructure.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b7c7e0e1d4091124ecb6850ea97b0765a13f4d9f67cdc969c834879d01027fb6","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-07-29T11:30:00Z","origin_kind":"system-spec-harness","source_digest":"b7c7e0e1d4091124ecb6850ea97b0765a13f4d9f67cdc969c834879d01027fb6","source_path":"system-spec/infrastructure.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "system-spec-harness infrastructure 章からの直接 import"
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

# Architecture overview

localhost で完結する TODO 管理 REST API。SQLite 単一ファイル永続化、FastAPI バックエンド、bearer token 認証。外部通信 0 件、常駐ミドルウェア 0、1 コマンド起動停止。

## Context and drivers

- Business/technical context: 個人利用の TODO 管理を外部サービスに依存せず手元で完結させる
- Quality attribute priorities: security (外部送信0), reliability (再起動後データ保持), cost (無料), delivery (単純構成)
- Constraints: localhost 限定、単一ユーザー、Python 実行環境

## Goals and non-goals

- Goals: G1=外部送信0件、G4=追加ミドルウェアなし1コマンド起動停止バックアップ
- Non-goals: マルチユーザー対応、クラウドデプロイ、モバイルネイティブ、外部 IDP 連携

## System context and boundaries

- Users/external systems: 利用者兼開発者 (唯一のユーザー)。外部システム連携なし。
- Trust/deployment/data boundaries: localhost のみ。データは SQLite ファイルとしてローカルディスクに格納。ネットワーク境界は localhost に閉じる。
- Context diagram: 利用者 → curl/ブラウザ → FastAPI (localhost:8000) → SQLite (todo.db)

## Container and component view

| Container/Component | Responsibility | Interface | Data owner | Deployment unit |
|---|---|---|---|---|
| FastAPI app | REST API 提供・認証・ルーティング | HTTP REST (OpenAPI) | N/A | Python process |
| SQLite DB | TODO データ永続化 | SQL (Python sqlite3) | TODO entity | 単一ファイル (todo.db) |
| Bearer token auth | リクエスト認証 | HTTPBearer header | N/A | FastAPI middleware |

## Cross-cutting contracts

- Identity/access: localhost bearer token (FastAPI HTTPBearer)。トークンは環境変数で指定。
- Errors/resilience: 401 (未認証) / 404 (未存在) / 500 (DB I/O エラー)。プロセス再起動で回復。
- Observability/audit: FastAPI 標準 stdout ログ (アクセス + エラー)。外部メトリクス収集なし。
- Configuration/secrets: bearer token は環境変数。DB パスは設定可能 (デフォルト ./todo.db)。
- Compatibility/versioning: API v1 固定。SQLite スキーマ変更時はマイグレーションスクリプト。

## Subtype architecture

- Frontend: N/A: web ブラウザから直接 API を呼ぶか curl を使用。フロントエンド専用アーキテクチャは対象外。
- Backend: FastAPI + Pydantic。Clean Architecture の data-access 層で SQLite を抽象化。
- Infrastructure: localhost 単一プロセス。常駐ミドルウェアなし。1 コマンド (uvicorn) で起動。
- Data: SQLite 単一ファイル。WAL モード不要 (単一ユーザー)。
- Security: OWASP ASVS に基づく bearer token 認証。外部通信 0 件。CORS は localhost のみ許可。

## Architecture decisions

| ADR | Decision | Alternatives | Trade-on rationale | Consequences |
|---|---|---|---|---|
| D1 | SQLite 単一ファイル DB | PostgreSQL, MySQL, JSON file | 常駐プロセス不要・ファイルコピーバックアップ・G4 直結 | 同時書込制限 (単一ユーザーで問題なし) |
| D2 | FastAPI バックエンド | Flask, Django, Express | OpenAPI 自動生成・型安全・非同期対応・G2 認証容易 | Python 依存 |
| D3 | localhost bearer token | OAuth2 外部 IDP, HTTP Basic, API Key | 外部通信 0 (G1)・実装単純・単一ユーザーに十分 | トークン管理は手動 |

## Delivery, migration and rollback

- Build/deploy topology: pip install → uvicorn main:app (1 コマンド起動)
- Migration sequence: 新規構築のため移行なし。スキーマ変更時は alembic 相当の script
- Rollback trigger/procedure: データ破損時は todo.db のバックアップコピーを復元

## Risks and verification

- Risk/assumption: SQLite ファイル破損リスク → バックアップ運用で軽減
- Architecture fitness test: 全エンドポイントの認証必須テスト (未認証→401)、再起動後データ保持テスト
- Load/failure/security validation: 外部通信 0 件のレビュー確認、bearer token 不一致で 401 のテスト
