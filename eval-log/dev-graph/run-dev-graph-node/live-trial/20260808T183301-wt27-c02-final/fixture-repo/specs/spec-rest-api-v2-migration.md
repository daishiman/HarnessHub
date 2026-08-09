---
graph_node_id: "spec-rest-api-v2-migration"
artifact_kind: "specification"
artifact_subtypes: ["api"]
project_id: "c02final"
domain: "product-platform"
tags: ["api","specification","migration","breaking-change"]
priority: null
start_date: null
target_date: null
iteration: null
title: "REST API v2 移行仕様"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T09:37:12Z"
updated_at: "2026-08-08T09:42:51.866278Z"
status: "draft"
depends_on: []
related_nodes: ["arch-order-processing-backend","task-public-api-rate-limit"]
resource_scope: ["specs/spec-rest-api-v2-migration.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/spec-rest-api-v2-migration.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T09:37:12Z","origin_kind":"manual","source_digest":"73cf6d5c9cdfb6d7552719d91f259345c301d85914b658b35287c0eeea4cfc39","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "機能要件・API契約・互換性/移行を定める仕様であり、破壊的変更を含むため specification へ写像し api-contract overlay を合成した"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/spec-rest-api-v2-migration.md","confidence":0.98},{"artifact_kind":"architecture","candidate_path":"architecture/spec-rest-api-v2-migration.md","confidence":0.18}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:37:12Z","missing_sections":[],"status":"complete"}
---

## 目的と成功状態

REST API v1 から v2 へ移行し、既存クライアントが期限内に破壊的変更へ追従できる状態にする。

## スコープ

- 対象: 公開 REST API の users / orders / sessions 系エンドポイント
- 対象外: 内部管理用エンドポイント

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| v1 クライアント | 既存の `X-API-Key` 認証と旧ページネーションで呼び出す利用者 |
| v2 クライアント | `Authorization: Bearer` と新ページネーション封筒に追従した利用者 |
| ページネーション封筒 | items と next_cursor と total を持つ共通レスポンス包み |

## ユースケースとユーザーフロー

1. 既存クライアントが v1 を呼び、Sunset ヘッダで移行期限を受け取る。
2. クライアントが認証方式を Bearer トークンへ切り替え、v2 の同等エンドポイントを呼ぶ。
3. クライアントが新しいページネーション封筒と改名フィールドへ追従し、v1 呼び出しを停止する。

## 機能要件

- `FR-001`: v2 は一貫したページネーション封筒を返す
- `FR-002`: v1 と v2 は移行期間中に併存する
- `FR-003`: v1 のレスポンスに移行期限を示す Sunset ヘッダを付与する

## 非機能要件

- Performance: v2 の応答時間は同等操作の v1 と同水準を維持する
- Availability/Reliability: 併存期間中は v1 と v2 のどちらの停止も他方へ波及させない
- Accessibility/Usability: 破壊的変更の一覧と移行手順を公開ドキュメントで提供する
- Security/Privacy: 認証は Bearer トークンに統一し、API key をログへ残さない
- Maintainability/Operability: v1 と v2 の共通ロジックは 1 箇所で保持し、差分は表現層に閉じる

## UI・状態遷移

- 画面/CLI/API状態: クライアントは v1 のみ、併存、v2 のみの 3 状態を取る
- 遷移条件: 認証方式の切替とフィールド改名への追従が完了した時点で v2 のみへ遷移する
- Loading/Empty/Error: 空ページは items 空配列と next_cursor なしで表し、認証不備は 401 で返す

## ビジネスルールと検証

- `BR-001`: 併存期間中に同一資源へ v1 と v2 から更新した場合、後勝ちではなく更新時刻の比較で解決する
- `BR-002`: v1 の Sunset 期限を過ぎた呼び出しは 410 を返し、移行先 URL を本文へ含める

## API契約

本仕様は API の破壊的変更を含む。

### 破壊的変更

- `GET /api/v1/users` を `GET /api/v2/users` へ移し、ページネーション封筒を変更する
- `POST /api/v2/orders` のリクエスト本文で `items` を `line_items` へ改名する
- 認証ヘッダを `X-API-Key` から `Authorization: Bearer` へ変更する

### 追加エンドポイント

- `GET /api/v2/users/{id}/preferences`
- `DELETE /api/v2/sessions/bulk`

### 非推奨エンドポイント

- `GET /api/v1/users/search` は `GET /api/v2/users` のクエリパラメータへ統合する

### 識別と目的

- Operation ID: `listUsersV2`
- Method/Path: `GET /api/v2/users`
- Purpose: 利用者一覧をカーソル方式で取得する代表操作として v2 の封筒契約を確定する
- Version/Lifecycle: v2 安定版、v1 の同等操作は一般提供開始から 6 か月で終了

### 認証・認可

- Authentication: `Authorization: Bearer` の署名付きアクセストークン
- Required scopes/roles: `users:read` を持つ主体のみ許可する
- Resource ownership check: 一覧は要求主体のテナントに属する利用者だけへ絞り込む

### Request

- Headers: `Authorization` (必須)、`X-Request-Id` (任意、相関 ID)
- Path parameters: 本操作は path パラメータを持たない
- Query parameters: `cursor` (文字列、既定なし)、`limit` (整数、既定 50、最大 200)、`q` (部分一致検索)
- Body schema: GET のため本文を持たない
- Example: `GET /api/v2/users?limit=50&q=tanaka`

### Response

| Status | Meaning | Schema |
|---|---|---|
| 200 | 一覧取得成功 | `{ items: User[], next_cursor: string \| null, total: integer }` |
| 401 | 認証失敗 | エラー封筒 |
| 410 | v1 の Sunset 期限超過 | エラー封筒 |

- Headers: `X-Request-Id` を必ず返し、v1 応答には `Sunset` を付与する
- Example: `{ "items": [{ "id": "u_1", "name": "田中" }], "next_cursor": "c_2", "total": 128 }`

### Validation・ビジネスルール

- `limit` が上限を超える場合は 400 を返し、上限値をエラー本文へ含める
- `cursor` が失効または改竄されている場合は 400 を返し、先頭からの再取得を促す

### Error contract

| HTTP | Code | Condition | Retryable | Client action |
|---|---|---|---|---|
| 400 | invalid_cursor | cursor が失効または不正 | no | cursor なしで再取得する |
| 401 | unauthenticated | Bearer トークンが無効 | no | トークンを再取得する |
| 410 | version_sunset | v1 の Sunset 期限超過 | no | v2 の同等操作へ切り替える |

### 実行セマンティクス

- Idempotency key/replay: 参照操作のため冪等であり、再送は同じ結果を返す
- Concurrency/optimistic lock: 更新操作 (`POST /api/v2/orders`) は更新時刻による楽観制御を用いる
- Transaction boundary: 一覧取得は単一読取で完結し、複数資源を跨ぐ更新を含まない
- Timeout/retry/rate limit: 上限超過時は 429 と Retry-After を返し、レートリミット契約に従う

### キャッシュ・ページング

- Cache/ETag: 一覧応答に ETag を付与し、条件付き取得で 304 を返す
- Cursor/limit/filter/sort: カーソルは不透明文字列とし、`limit` と `q` の組合せで安定順序を保つ

### 可観測性と監査

- Request/correlation ID: `X-Request-Id` を受領時に引き継ぎ、未指定なら発番する
- Metrics/logs/audit/redaction: バージョン別呼び出し数を計測し、トークンと API key はログから除去する

### セキュリティ確認

- Input/output validation: クエリ長と limit 上限を検証し、封筒外のフィールドを返さない
- Sensitive data exposure: 一覧応答に認証情報と内部識別子を含めない
- Abuse/authorization tests: 他テナントの利用者を取得できないことを認可テストで確認する

### Contract tests

- Positive: v2 一覧が封筒形式で返り、next_cursor で続きを取得できる
- Boundary: `limit` の上限値と上限超過値で 200 と 400 の境界を確認する
- Negative/auth/error/idempotency: 無効トークンで 401、失効 cursor で 400、Sunset 後の v1 で 410 を確認する

## データモデル

- Entity/Value: User、Order、Session
- Fields/Types/Nullability: Order の本文フィールドは `line_items` (配列、必須)、`next_cursor` は文字列または null
- Relations/Constraints/Indexes: Order は User に属し、Session は User に属する。カーソル順序は作成時刻と ID の複合で一意にする
- Ownership/Retention/Migration: v1 の `items` を受理する互換層を併存期間だけ保持し、期限後に削除する

## 認証・認可

- Authentication: v2 は Bearer トークンのみ、v1 は併存期間中だけ API key を受理する
- Authorization: 操作ごとに必要スコープを定義し、既定は拒否とする
- Tenant/data boundary: すべての一覧・取得はテナント境界で絞り込む

## エラー・例外・回復

- Error taxonomy: 安定コードを持つ共通エラー封筒で返す
- Retry/Timeout/Fallback: 429 と 5xx のみ再試行可能とし、Retry-After に従う
- Idempotency/Concurrency: 更新系は冪等キーを受理し、同一キーの再送は同じ結果を返す

## イベント・非同期処理

- Producer/Consumer: 移行期間中のバージョン別利用状況を計測イベントとして送出し、移行状況の集計が購読する
- Delivery/Ordering/Deduplication/DLQ: 少なくとも 1 回配信、重複は要求 ID で除去し、失敗は再処理待ち行列へ退避する

## 可観測性

- Logs/Metrics/Traces/Audit: バージョン別・エンドポイント別の呼び出し数と失敗率を記録する
- Alert/SLO dashboard: v1 残存率と v2 失敗率をダッシュボードで追跡し、期限前に残存率が下がらない場合に通知する

## 互換性・移行・リリース

v1 は v2 の一般提供開始から 6 か月維持し、その間 Sunset ヘッダを付与する。

## テストと受入条件

- [ ] `AC-001`: v2 の一覧系エンドポイントが共通ページネーション封筒を返す
- [ ] `AC-002`: 併存期間中は v1 と v2 の双方が同一資源に対して成功応答を返す
- [ ] `AC-003`: v1 応答に Sunset ヘッダが付与され、期限後は 410 になる
- Contract/integration/e2e/security/performance: 契約テストと移行シナリオの統合テストで担保する

## 未決事項

- `DELETE /api/v2/sessions/bulk` の一括上限件数は、レートリミット契約の確定後に API owner が決める。
