---
status: confirmed
qa_ref: [qa-031, qa-032, qa-033, qa-048]
layer: implementation-spec
sources: [system-spec/backend.md, system-spec/database.md, system-spec/auth.md, system-spec/security.md, system-spec/00-requirements-definition.md, docs/mockups/harness-studio-v2-analysis.md, doc/harness-hub-platform-concept.md]
---

# Harness Hub backend 実装仕様書 (データ構造・API 詳細正本)

> **位置づけ**: system-spec 確定章 (backend / database / auth / security) と mockup 分析 (harness-studio-v2) を実装可能な粒度へ展開した詳細正本。確定 QA (qa-002/004/005/008/009/020/023/024/028/029) と decision (D1-D6) に反する記述はできない。矛盾を発見した場合は R4-reopen の根拠として扱う。
> **確定状態**: §9 の 5 論点は 2026-07-17 のユーザー確認 (qa-031) で確定済み。本書に【要確認】は残っていない。

## 1. ランタイム・コード構造 (qa-009 / qa-020 / D1)

- **実行環境**: Cloudflare Workers + `@opennextjs/cloudflare` (D1)。Next.js App Router の Route Handlers で REST API を実装。Worker サイズ上限 3 MiB (gzip, Free) を CI で計測する。
- **DB**: Turso Free (libSQL)。Drizzle ORM (SQLite dialect)、`@libsql/client` (HTTP)。D1 退避経路を温存するため SQLite 方言互換を維持する (D2 ヘッジ)。
- **パッケージ実体**: Cloudflare R2 (immutable PackageRegistry)。DB は content hash と参照のみ保持。
- **顧客業務データ (C4 改訂 2026-07-18・appr-007/qa-048)**: 業務ナレッジ/ドキュメントとハーネス実行入出力データは保持可能 (R2 + テナント別封筒暗号化・即時完全削除・詳細は qa-045/qa-046)。業務システム接続 credential は引き続き保持しない。保管 API の詳細設計は feature P02。
- **コード構造規約 (qa-020)**:
  - DB アクセスは **Drizzle リポジトリ層** に閉じる (Turso→D1 移行をアプリ層へ波及させない)。
  - **認証アダプタ隔離**: Auth.js 依存を adapter 境界に閉じる。
  - **認可は単一ミドルウェア** に集約 (deny-by-default・全 API で Tenant/Workspace スコープ強制 = D4)。
  - **検査 pipeline / 試算エンジン / 通知ディスパッチは純関数の共有パッケージ** (Publisher と Hub で二重実装しない)。
  - secret は環境 binding のみ。コード・DB へ平文を持ち込まない。
- **monorepo 構成 (pnpm workspace, 提案)**:

```text
apps/hub            Next.js (Hub Web + Route Handlers API)
apps/publisher      Publisher CLI (Claude Code / Codex plugin, qa-010)
packages/schemas    zod スキーマ単一ソース → OpenAPI 生成 (B1)
packages/inspection 検査 pipeline 純関数 (harness-creator Python 資産の TS 移植, C3)
packages/estimation 試算エンジン純関数 (§6.2)
packages/db         Drizzle スキーマ + リポジトリ層
```

## 2. データモデル (Drizzle / SQLite 方言)

### 2.1 共通規約

- **PK**: `id TEXT` — ULID (時系列ソート可・衝突なし。qa-031 確定)。表示用コード (HS-xxxx 等) は別列。
- **時刻**: `INTEGER` (epoch ms)。**サーバ時刻のみ採用** (クライアント申告時刻は保存しない, SEC5)。
- **テナント分離 (D4/SEC3)**: `documents.scope='common'` を除く全テーブルに `tenant_id` (必要に応じ `workspace_id`) を必須とし、リポジトリ層で常時 WHERE 句へ強制注入。分離テストを CI 必須とする。
- **PII (SEC4)**: `users.salary` は要保護列。読取は workspace-admin/provider-admin のみ、member 向け API レスポンスへ含めない。export 時マスク。変更は監査 event 対象。**保存はアプリ層カラム暗号化** (AES-GCM / Web Crypto、鍵は Workers Secret binding) — 日次 export・R2 バックアップの断面にも平文を残さない (qa-032 確定。qa-025 SEC4 の「保存時暗号化は要設計」の解消)。復号は認可ミドルウェア通過後のリポジトリ層でのみ行い、試算エンジンへは復号済み値をサーバ内でのみ渡す。
- **enum 値**: DB/API は英語 snake/kebab、UI 表示ラベル (「生成中」等) はフロントエンドの辞書で写像する (mockup の日本語ラベルは表示層の関心)。

### 2.2 コアドメイン (公開基盤 — §4.2 + qa-002。既存確定・不変)

| テーブル | 主な列 | 制約・備考 |
|---|---|---|
| `tenants` | id, slug, name, plan, status(`active/suspended`), created_at | slug UNIQUE。課金・IdP 設定の境界 |
| `idp_connections` | id, tenant_id, issuer_url, client_id, **client_secret_enc**, scopes | **封筒暗号化 (KEK/DEK) で DB 保存** (security-spec §4.3)。テナント IdP secret は顧客ごとに動的に増えるため環境 binding では C1/C2 に反する。「secret は環境 binding のみ」原則は Hub 自身の静的 secret を対象とし、テナント由来の動的 secret は本方式で保護する |
| `workspaces` | id, tenant_id, slug, name | UNIQUE(tenant_id, slug)。**共有・カタログの境界 (権限の境界は tenant)** — `users` に workspace 所属列が無いため認可判定には使わない (security-spec §3.1.2) |
| `users` | id, tenant_id, idp_subject, email, name, department, **salary (PII, 年収 JPY)**, role(`provider-admin/workspace-admin/member`), status(`active/inactive`), last_login_at | UNIQUE(tenant_id, idp_subject)。**owner は role 列ではなく `projects.owner_user_id` による関係 role** (qa-005 の 4 role は認可判定時に合成) |
| `user_settings` | user_id PK, notify_generation, notify_review, notify_weekly, notify_feedback, email_enabled, theme, density, language | mockup account 画面準拠。2FA/パスワードは IdP 責務のため列なし (SEC1) |
| `projects` | id, tenant_id, workspace_id, slug, name, description, owner_user_id, status(`active/suspended/archived`) | 業務ツール名は Workspace 内一意 (§4.2)。UNIQUE(workspace_id, name) |
| `target_channels` | id, project_id, target(`skill/web_app`), stable_release_id | UNIQUE(project_id, target)。stable pointer の正本 |
| `releases` | id, project_id, channel_id, version, package_hash, manifest_json, status(`available/suspended/deprecated`), created_by | **immutable** (更新は status のみ)。version は差分+content hash から自動採番 (§7.1) |
| `packages` | content_hash PK(sha256), r2_key, size_bytes, kind(`skills-package`) | R2 実体への参照 (PackageRegistry) |
| `deployment_references` | id, project_id, channel_id, release_id, url, provider(`cloudflare`), orphan_candidate BOOL, registered_by, last_health_at | web_app 出口。orphan_candidate は §7.2 準拠 |
| `catalog_entries` | id, tenant_id, workspace_id, project_id UNIQUE, visibility(`private/workspace`), summary, tags_json, dl_count, published_at | `public` は Stage 5 まで非対象 (mockup 分析 §6-4) |
| `publish_requests` | id, tenant_id, workspace_id, project_id, channel_id, status(§5.1 の 9 値), verdict(`green/yellow/red`), findings_json, release_id, requested_by, idempotency_key | **同一 channel の非終端 request は 1 件** (partial UNIQUE index で直列化, qa-009) |
| `publisher_tokens` | id, tenant_id, user_id, device_name, refresh_token_hash, scopes_json, last_used_at, expires_at, revoked_at, **family_id** | access token は短命 JWT で発行のみ (保存しない、TTL 15 分)。refresh は SHA-256 ハッシュ保存・TTL 90 日・**rotation 必須**・**再利用検知で family 全失効** (security-spec §2.2)。`scopes_json` の値域は `publish:write`/`metrics:write`/`feedback:write`/`aijob:process` の 4 種。失効導線は Hub Web (qa-008) |
| `device_authorizations` | id, device_code_hash, user_code, tenant_id, user_id, status(`pending/approved/denied/expired`), interval_sec, expires_at | Device Flow (qa-008)。user_code は照合後即失効 |
| `audit_events` | id, tenant_id, workspace_id, actor_type(`user/publisher_token/system`), actor_id, action, entity_type, entity_id, summary_json, created_at, **seq**, **prev_hash**, **event_hash** | **append-only** (UPDATE/DELETE 禁止)。対象 action は §3.8。**hash chain (テナント単位)** で改竄検知 — UNIQUE(tenant_id, seq)、計算式と検証は security-spec §5.4。`summary_json` に値そのもの (salary 金額・secret・token) を書かない |
| `encryption_keys` | id, purpose(`salary/idp_secret`), key_version, dek_wrapped, status(`active/retiring/retired`), created_at, retired_at | **封筒暗号化の DEK 保管** (KEK で wrap)。UNIQUE(purpose, key_version)。`active` は purpose ごとに 1 件。DEK 平文は保存しない (security-spec §4.1.1) |
| `session_revocations` | tenant_id PK, revoked_at | **緊急失効のみ**。認可 MW が `JWT.iat < revoked_at` を拒否する。KV/メモリキャッシュ (TTL 60 秒) 経由で参照し通常の DB 往復を発生させない (security-spec §2.1) |
| `idempotency_ledger` | scope, key PK(scope,key), request_hash, response_status, response_body_json, expires_at | publish 系 POST の再試行安全化 (metrics は events 側 UNIQUE で担保) |

### 2.3 Studio 拡張 (qa-024 + mockup §2)

| テーブル | 主な列 | 制約・備考 |
|---|---|---|
| `hearing_sheets` | id, tenant_id, workspace_id, code(`HS-xxxx`), title, applicant_user_id, department, status(§5.2), form_json, estimate_json, ai_job_id, generated_doc_ids_json, build_id | code はテナント別連番。estimate_json は提出時のサーバ側試算 snapshot |
| `builds` | id, tenant_id, workspace_id, sheet_id, project_id, title, stage(§5.3 の 7 値), risk(`ok/warn`), eta_date, assignee_user_id, publish_request_id, note | 公開工程は PublishRequest へ接続し二重実装しない (B4) |
| `build_stage_events` | id, build_id, from_stage, to_stage, actor_user_id, created_at | append-only (ボード履歴表示用。監査は audit_events にも記録) |
| `feedbacks` | id, tenant_id, workspace_id, code(`FR-xxx`), project_id, type(`improvement/bug/question`), source(`harness/manual`), body, status(§5.4), ai_response, ai_job_id, created_by | CLI 発 (`harness feedback`) と Web フォームは同一テーブル・同一キュー (B6) |
| `documents` | id, code(`DOC-xx`), scope(`common/tenant`), tenant_id (common は NULL), category, title, body_md, status(`draft/published`), updated_by | common は provider-admin のみ書込・全テナント読取専用 (SEC3 例外)。category は自由文字列 + 推奨プリセット (使い方/FAQ/構想・戦略/セキュリティ/経理/CS 等 — mockup 実測) |
| `notifications` | id, tenant_id, user_id, kind, title, body, link_path, read_at, created_at | アプリ内通知が正本、メールは補助 (D6) |
| `metrics_events` | id, tenant_id, workspace_id, project_id, user_id, run_count, client_context_json, idempotency_key, server_received_at | **append-only**。UNIQUE(tenant_id, idempotency_key)。時間・金額の自己申告は受けない (SEC5)。**生データは無期限 DB 保持** (ユーザー決定 qa-031)。Turso 無料枠使用量を保守運用の監視対象とし、圧迫時は保持期間導入を R4-reopen で再検討 |
| `metrics_rollups` | id, tenant_id, period(`week/month`), period_start, dim(`tenant/department/user/project`), dim_key, run_count, saved_minutes, saved_amount_jpy, computed_at | UNIQUE(tenant_id, period, period_start, dim, dim_key)。金額換算はサーバのみ (B3) |
| `ai_jobs` | id, tenant_id, workspace_id, kind(`sheet_generation/feedback_response/doc_draft`), status(§5.5), payload_json, result_json, error, attempt, max_attempts(3), lease_expires_at, claimed_by_token_id, ref_type, ref_id | D5 pull 型キュー。lease は visibility timeout 方式 |
| `tenant_coefficients` | tenant_id PK, annual_hours(既定 2000), minutes_per_run(既定 15), sheet_reduction_rate(既定 0.35), updated_by | 係数変更は監査 event 必須 (B10/SEC6) |
| `display_code_counters` | tenant_id, kind(`HS/FR/DOC`), next_value | 表示用コード採番 (トランザクション内 increment) |

## 3. API 共通契約 (B1 / qa-009)

### 3.1 ベース

- ベースパス: `/api/v1` (qa-031 確定)。破壊的変更は additive evolution を優先し、v2 は最終手段。
- スキーマ: `packages/schemas` の **zod が単一ソース**。CI で `openapi.json` を生成し、Publisher は生成型を利用する (二重定義禁止)。
- Content-Type: `application/json` (package upload のみ `multipart/form-data`)。

### 3.2 認証 (2 系統, qa-005 / qa-008)

| principal | 方式 | 用途 |
|---|---|---|
| Web セッション | Auth.js + テナント別 OIDC → 署名付き JWT cookie (SameSite=Lax, CSRF は同一サイト cookie 前提, SEC8) | Hub Web の全画面/API |
| Publisher / CLI / AI worker | OAuth Device Flow → 短命 access token (Bearer) + refresh token (OS 資格情報域保存) | publish・metrics ingest・feedback CLI・AI job pull |

- mockup のパスワードログイン画面は **採用しない** (SEC1・D3 維持)。IdP redirect へ置換。
- **数値契約は security-spec §2 で確定済み**: session `maxAge` 8h / `updateAge` 15 分 (= **role/status 変更の失効許容 15 分**) / device_code TTL 10 分 / user_code 8 文字 Crockford Base32・5 回失敗で denied / polling interval 5 秒 / access token 15 分 / refresh 90 日 rotation + 再利用検知。緊急失効は `session_revocations` により即時 (§2.2)。
- **開発・デモも同一経路**: dev 専用 provider (Credentials / SKIP_AUTH) を実装しない。提供者の Google Workspace を dev tenant の OIDC として使う (security-spec §2.5)。CI が該当文字列を禁止検査する。

### 3.3 認可マトリクス (deny-by-default, SEC2。単一ミドルウェアで判定)

> **この表は単調でなければならない** (左から右へ許可が増えるだけで、上位 role が下位 role の許可を失う行を作らない)。認可判定はこの単調性に依拠して実効 role を全順序 `member < owner < workspace-admin < provider-admin` の単一値として扱う (security-spec §3.1.1)。非単調な行を追加するとテスト T-1b が fail する。判定契約の正本は security-spec §3.5。

| リソース | member | owner (対象 Project) | workspace-admin | provider-admin |
|---|---|---|---|---|
| dashboard/tracking 集計閲覧 | ✓ (金額は集計値のみ) | ✓ | ✓ | ✓ |
| sheets 作成/自分の閲覧 | ✓ | ✓ | ✓ | ✓ |
| sheets status 変更・再生成 | — | — | ✓ | ✓ |
| builds 閲覧 | ✓ | ✓ | ✓ | ✓ |
| builds 工程操作 | — | — | ✓ | ✓ |
| harnesses 閲覧/install 導線 | ✓ | ✓ | ✓ | ✓ |
| publish (自 Project) | — | ✓ | ✓ | ✓ |
| Yellow 承認 / suspend | — | suspend のみ ✓ | ✓ | ✓ |
| promote / rollback | — | ✓ | ✓ | ✓ |
| feedback 起票/閲覧 | ✓ | ✓ | ✓ | ✓ |
| feedback status 変更 | — | — | ✓ | ✓ |
| docs 閲覧 | ✓ | ✓ | ✓ | ✓ |
| docs 編集 (scope=tenant) | — | — | ✓ | ✓ |
| docs 編集 (scope=common) | — | — | — | ✓ |
| users CRUD・role・salary | — | — | ✓ | ✓ |
| 係数 (coefficients) 変更 | — | — | ✓ | ✓ |
| audit-events 閲覧 | — | — | ✓ (自テナント) | ✓ |
| ai-jobs pull/complete | — | — | — | ✓ |
| token 失効 | 本人 ✓ | 本人 ✓ | ✓ | ✓ |

### 3.4 エラー形式

- RFC 9457 (`application/problem+json`): `{ type, title, status, detail, instance, errors? }`。zod バリデーション失敗は `errors[]` にフィールド単位で格納。

### 3.5 ページネーション

- cursor 方式 (qa-031 確定): `?cursor=<opaque>&limit=<1..100>` → `{ items, next_cursor }`。offset は大規模/更新中データで欠落・重複を起こすため採らない (API Design Patterns カード準拠)。

### 3.6 冪等性

- `POST /publish`・`POST /metrics/events` は `Idempotency-Key` ヘッダ必須。scope = (tenant, endpoint)、TTL 24h、同一 key + 異 payload は 422。

### 3.7 レート制限 (SEC8)

- Workers 層 (Rate Limiting binding) で IP + principal 単位。**閾値は security-spec §7.2 で確定済み** (device/code 10・device/token 20・approve 5・auth 20・metrics 60 burst 120・publish 10・feedback 20・一般 API 120 / 分)。feature P02 は**実測に基づく調整のみ**とし、方式・鍵の変更は R4-reopen を要する。

### 3.8 監査対象 action (SEC6 = 既存 I8 + Studio 追加)

`publish.request / publish.approve / publish.reject / channel.promote / channel.rollback / release.suspend / sheet.status_change / build.stage_change / doc.create / doc.update / user.role_change / user.salary_change / coefficient.change / token.revoke / feedback.status_change / ai_job.complete`

**security-spec で追加 (計 20)**: `user.salary_read` (PII 読取の記録) / `idp.connection_change` / `token.reuse_detected` / `provider.cross_tenant_access` (provider-admin の越境は読取も記録 — security-spec §3.1.3)。記録するのは変更の**事実**であり、値そのもの (salary 金額・secret・token) は書かない (security-spec §5.2)。

## 4. API エンドポイント一覧

### 4.1 認証・Device Flow (qa-008)

| Method Path | 認証 | 概要 |
|---|---|---|
| `GET/POST /api/auth/[...nextauth]` | — | Auth.js (テナント別 OIDC redirect)。adapter 境界内 |
| `POST /api/v1/device/code` | なし (rate limit) | device_code + user_code + verification_uri + interval 発行 |
| `POST /api/v1/device/token` | なし (polling) | RFC 8628 準拠。`authorization_pending / slow_down / expired_token` → 承認後 access+refresh 発行 |
| `POST /api/v1/device/approve` | session | ブラウザ側承認 (user_code 入力)。SSO ログイン済み前提 |
| `POST /api/v1/token/refresh` | refresh token | access token 再発行 (rotation) |
| `GET /api/v1/tokens` | session | 自分の Publisher token 一覧 (admin は Workspace 全体) |
| `DELETE /api/v1/tokens/:id` | session | 失効 (本人 or admin)。監査 event |

### 4.2 ユーザー・組織管理 (B10)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/me` / `PATCH /api/v1/me` | member | プロフィール・通知/表示設定 (user_settings) |
| `GET /api/v1/users` | member (簡易) / admin (全列) | member には name/department のみ。**salary は admin のみ** |
| `POST /api/v1/users` | workspace-admin | 事前登録 (role/department/salary)。初回ログインは IdP JIT で idp_subject を紐付け |
| `GET /api/v1/users/:id` | workspace-admin | 個別ダッシュボード用 (削減効果 rollup 込み) |
| `PATCH /api/v1/users/:id` | workspace-admin | role/department/salary/status。監査 event |
| `GET/PATCH /api/v1/tenant/coefficients` | workspace-admin | annual_hours / minutes_per_run / sheet_reduction_rate。監査 event |

### 4.3 ヒアリングシート (B1: form / sheets)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `POST /api/v1/sheets` | member | ウィザード 12 項目提出 → HS コード発行、status=`received`、試算 snapshot 保存、AiJob(`sheet_generation`) 投入、受付通知 |
| `GET /api/v1/sheets` | member | 一覧 (filter: status/department/q, cursor) |
| `GET /api/v1/sheets/:id` | member | 詳細 (form + estimate + 生成ドキュメント参照 + 対応 build) |
| `PATCH /api/v1/sheets/:id` | workspace-admin | status 遷移 (§5.2)。監査 event |
| `POST /api/v1/sheets/:id/regenerate` | workspace-admin | AiJob 再投入 (status→`generating`) |

**FormData 12 項目 (mockup 実測。ラベル和訳は表示層)**: `taskName, company, applicant, domain, issue, tools, hours, people, salary, features, output, priority`

### 4.4 構築パイプライン (pipeline board)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/builds` | member | 7 工程ボード一覧 (stage 別グルーピングはクライアント) |
| `GET /api/v1/builds/:id` | member | 詳細 + stage 履歴 |
| `POST /api/v1/builds` | workspace-admin | sheet からの起票 (sheet_id 紐付け) |
| `PATCH /api/v1/builds/:id` | workspace-admin | title/risk/eta/assignee/note |
| `POST /api/v1/builds/:id/stage` | workspace-admin | 工程遷移 (§5.3)。`publish` 工程は publish_request_id の接続を要求 (B4)。監査 event |

### 4.5 ハーネスカタログ (I4/I6 既存整合)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/harnesses` | member | CatalogEntry 一覧 (filter: target/status/q) |
| `GET /api/v1/harnesses/:projectId` | member | 詳細: channels + stable release + install 導線 (marketplace URL / web_app URL) + 利用統計 |
| marketplace 配信 (catalog.json / package 取得) | — | 既存 feat (S01-S04 / I6 URL 型 marketplace) の契約を維持。本仕様で変更しない |

### 4.6 公開 (B4/B9: PublishRequest / Release / Channel — §7.2/qa-009)

| Method Path | 認証/最小 role | 概要 |
|---|---|---|
| `POST /api/v1/publish` | Bearer / owner | PublishRequest 作成 (project, target, visibility)。Idempotency-Key 必須。直列化違反は 409 |
| `GET /api/v1/publish` | session or Bearer | PublishRequest 一覧 (filter: project/channel/status, cursor)。owner = 自 Project のみ、workspace-admin = Workspace 全体。S03 (公開状態) の進行中 request 発見と S05 (承認キュー = status=approval_pending) の供給元 (frontend-spec §3.4 の additive 追加要求。qa-040。状態機械・直列化 (qa-009) は不変) |
| `PUT /api/v1/publish/:id/package` | Bearer / owner | package upload (multipart) → R2 staging + content hash。サイズ/種別制限 (SEC7) |
| `POST /api/v1/publish/:id/submit` | Bearer / owner | Draft→Validating。検査 pipeline を Worker 内同期実行 (skills-only 小サイズ前提) し結果を DB 記録 |
| `GET /api/v1/publish/:id` | Bearer or session | 状態 polling (Publisher/Hub Web 共用, qa-009) |
| `POST /api/v1/publish/:id/approve` | session / workspace-admin | Yellow 承認 (Stage 2 approval queue)。監査 event |
| `POST /api/v1/publish/:id/cancel` | Bearer / owner | 非終端のみ→Draft 差戻し |
| `GET /api/v1/projects/:id/releases` | member | Release 履歴 (immutable 一覧) |
| `POST /api/v1/channels/:id/promote` | owner | stable pointer 昇格。監査 event |
| `POST /api/v1/channels/:id/rollback` | owner | 2 版目以降のみ rollback 先検査 (§7.2)。監査 event |
| `POST /api/v1/releases/:id/suspend` | owner or admin | 公開停止 (Release status=suspended) |
| `POST /api/v1/projects/:id/deployment` | Bearer / owner | wrangler 実行結果 (exit code/URL) の登録 + HTTP health 確認。Catalog 昇格失敗時は orphan_candidate 記録 (§7.2) |

### 4.7 フィードバック (B6)

| Method Path | 認証/最小 role | 概要 |
|---|---|---|
| `POST /api/v1/feedback` | session=`manual` / Bearer=`harness` | source は principal 種別から導出。同一キューへ格納。type=`improvement/bug/question` |
| `GET /api/v1/feedback` | member | 一覧 (filter: status/type/project) |
| `GET /api/v1/feedback/:id` | member | 詳細 (ai_response 含む) |
| `PATCH /api/v1/feedback/:id` | workspace-admin | status 遷移 (§5.4)。監査 event。AI 対応は AiJob(`feedback_response`) 書戻しで `ai_response` 更新 + 起票者へ通知 |

### 4.8 ドキュメント CMS (B7)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/docs` | member | scope 合成一覧 (common + 自テナント)。filter: category/scope/q |
| `GET /api/v1/docs/:id` | member | body_md は raw 保存・レンダリング時 sanitize (SEC7) |
| `POST /api/v1/docs` | workspace-admin (tenant) / provider-admin (common) | 作成。監査 event |
| `PATCH /api/v1/docs/:id` | 同上 | 更新。監査 event |
| `POST /api/v1/docs/:id/draft` | workspace-admin | AI 下書き AiJob(`doc_draft`) 投入 |

### 4.9 メトリクス (B2/B3)

| Method Path | 認証/最小 role | 概要 |
|---|---|---|
| `POST /api/v1/metrics/events` | Bearer (短命 token) | 実行ログ ingest。**回数のみ受理・時刻はサーバ採用・Idempotency-Key 必須** (SEC5)。207 なし、重複 key は 200 (既存応答再生) |
| `GET /api/v1/metrics/summary` | member | dashboard KPI 6 カード + 推移 (rollup 読取のみ。Turso 読取予算対策) |
| `GET /api/v1/metrics/rollups` | member (集計値) / admin (user 次元の金額) | dim=`tenant/department/project` は全員、dim=`user` の金額換算は admin のみ (SEC4 逆算対策) |

### 4.10 通知 (B8/D6)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/notifications` | member | 自分宛て一覧 (未読数含む) |
| `POST /api/v1/notifications/read` | member | 個別 or 一括既読 |
| (送信は API でなく共通層) | — | NotificationDispatcher 純関数層: アプリ内 (正本) + Resend メール (opt-in・日次 100 通制限はバッチ分割+リトライ, D6) |

### 4.11 AI ジョブキュー (B5/D5: pull 型)

| Method Path | 認証 | 概要 |
|---|---|---|
| `POST /api/v1/ai-jobs/pull` | Bearer (**workspace-admin = 自テナントのみ / provider-admin = 全テナント**, qa-048 で改訂) | 最古の `queued` を lease 付き claim (`processing`, lease 10 分)。kind filter 可。空なら 204 |
| `POST /api/v1/ai-jobs/:id/complete` | Bearer (claim 者のみ) | result 書戻し → 参照先 (sheet/feedback/doc) へ反映 + 通知。監査 event |
| `POST /api/v1/ai-jobs/:id/fail` | Bearer (claim 者のみ) | attempt++。max_attempts 到達で `dead` + admin 通知 |
| `GET /api/v1/ai-jobs` | workspace-admin | キュー監視 (滞留は保守運用 qa-027 の監視対象) |

- **pull 権限 (qa-048 で改訂・2026-07-18 中立再確認)**: workspace-admin にも開放する。workspace-admin の pull は自テナントのジョブに限定 (D4 row-level scope 内で完結)。provider-admin の pull のみ cross-tenant で、audit_events へ tenant 明示で記録する (D4 の唯一の明示例外は従来どおり)。開放の目的は提供者単一障害点の解消。workspace-admin 側の Claude Code 契約が処理の前提となる点を運用ドキュメントへ明記する。

### 4.12 監査・検索

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/audit-events` | workspace-admin | append-only 閲覧 (filter: action/entity/actor/期間, cursor) |
| `GET /api/v1/search?q=` | member | ハーネス + ユーザー横断 (ユーザーは name/department のみ返す) |

## 5. 状態機械

### 5.1 PublishRequest (§7.2 完全準拠, qa-009)

```text
Draft → Validating ├─ Needs Fix → Draft (差戻し)
                   └─ Ready ├─ Approval Pending → Approved (管理者承認)   ← Stage 2 で有効化
                            └─ Approved (policy 自動承認 = Green)
                            → Publishing ├─ Failed (既存 stable 維持)
                                         └─ Published (Release 生成 → Promote)
```

- MVP サブセット: Yellow/Red 相当は `Needs Fix` 差戻し。`Approval Pending` は Stage 2 まで到達しない。
- 同一 TargetChannel の直列化: 先行が終端 (`Published/Failed/Draft` 差戻し) になるまで後続は `Draft` に留める。

### 5.2 HearingSheet

```text
received (受付) → generating (生成中: AiJob 投入中) → review (レビュー待ち) → completed (完了)
                       └─ AiJob dead → received へ戻し admin 通知 (再生成可能)
```

### 5.3 Build (7 工程, mockup pipeline)

```text
hearing → requirements → design → build → test → review → publish
```

- 遷移は隣接工程間 (前進/差戻し) のみ。`publish` 遷移時は接続済み PublishRequest の `Published` を確認する (B4)。

### 5.4 Feedback

```text
open (未対応) → in_progress (対応中) → resolved (対応済み)
```

### 5.5 AiJob

```text
queued → processing (lease 10 分) ├─ completed
                                  ├─ failed → attempt < 3 なら queued へ再投入
                                  └─ lease 失効 → queued へ自動返却
attempt = 3 → dead (admin 通知)
```

## 6. 共有パッケージ (純関数層, qa-020)

### 6.1 検査 pipeline (`packages/inspection`)

- §7.3 の最小検査を純関数で実装: owner/公開範囲・secret scan・必須メタ・skills-only 制約・禁止 Hook/script/binary 検出・高リスク instructions パターン (検出時 Yellow 降格)・manifest 補完・試験 install・Catalog 生成。
- 既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) を**仕様の正本**として TS へ移植し、挙動同値性をテストで担保 (qa-010/C3)。Publisher (ローカル pre-check) と Hub (公式検査) で同一パッケージを共有。

### 6.2 試算エンジン (`packages/estimation`)

```text
hourlyRate      = salary ÷ annual_hours            (既定 2000h)
savedMinutes    = runCount × minutes_per_run        (既定 15 分/回)
savedAmountJPY  = savedMinutes ÷ 60 × hourlyRate
sheetEstimate   = 月間工数(hours) × 対象人数(people) × sheet_reduction_rate (既定 0.35)
```

- 係数は `tenant_coefficients` から注入。**金額換算はサーバ側のみ** (クライアントへ salary を渡さない, SEC4/SEC5)。

### 6.3 スキーマ (`packages/schemas`)

- 全 API の request/response zod スキーマ + enum 定数 + OpenAPI 生成。Publisher は生成された型/クライアントを import する (B1 の単一ソース原則)。

## 7. バッチ・cron (Workers cron)

| ジョブ | 頻度 | 内容 |
|---|---|---|
| metrics rollup | 日次 + 週次確定 | metrics_events → metrics_rollups (週次/部門別/ユーザー別/ハーネス別, B3) |
| Turso 使用量監視 | 日次 | ストレージ/読取行数の使用量を記録し、無料枠の閾値超過で admin 通知 (metrics 無期限保持の帰結, qa-031) |
| 週次サマリメール | 週次 | opt-in ユーザーへ Resend 送信 (100 通/日制限のバッチ分割, D6) |
| orphan_candidate 通知 | 日次 | 一定期間滞留で admin へ通知 (§7.2) |
| DB backup | 日次 | export → R2 (qa-019 既定)。四半期 restore drill。**salary は常にマスク** (security-spec §4.2) |
| token/認可コード掃除 | 日次 | 期限切れ device_authorizations・revoked token の物理削除 |
| **監査 chain 検証** | 日次 | テナントごとに `audit_events` の hash chain 全体を再計算し、不一致・seq 欠番を検出したら provider-admin へ通知 (security-spec §5.4.4) |
| **metrics 異常検知** | 日次 | ユーザー別実行回数が過去 4 週中央値の 10 倍超で `metrics.anomaly` 通知 (ブロックはしない。security-spec §6.4) |

## 8. 非機能・無料枠予算 (C2/D1/D2)

- Worker bundle ≤ 3 MiB (gzip) を CI ゲート化。超過時はコード分割・依存削減、恒常超過は C2 再交渉 (D1 caveat)。
- Turso 読取予算: ダッシュボード系は rollup 読取のみに限定し、生イベントのオンライン集計を禁止 (B3)。
- 進捗反映は **ポーリング統一** (qa-031 確定): publish 状態 2 秒 (指数 backoff)、ボード/通知 30 秒。Workers で接続保持型 (SSE/WS) を避け無料枠 CPU 時間を温存。
- 可用性・SLO・監視は qa-019 (SRE 章) 準拠。キュー滞留・cron 失敗を監視対象に追加 (qa-027/qa-028)。

## 9. 確定記録 (2026-07-17 ユーザー確認 = qa-031 / qa-032 / qa-033)

| # | 項目 | 決定 | 備考 |
|---|---|---|---|
| 1 | 進捗のリアルタイム反映 | **ポーリング統一** (AI 推奨に同意) | publish 2 秒 backoff・ボード/通知 30 秒 (§8) |
| 2 | ページネーション | **cursor 方式** (推奨既定値を採用) | §3.5 |
| 3 | AiJob pull 権限 | **provider-admin のみ** (AI 推奨に同意) | cross-tenant は監査付き唯一例外 (§4.11) |
| 4 | metrics 生データ保持 | **無期限 DB 保持** (AI 推奨の 90 日退避を採らずユーザー選択) | 代償として Turso 使用量の日次監視を追加 (§7)。無料枠圧迫時は保持期間導入を R4-reopen で再検討。qa-032 ヒアリングで再提示し**無期限維持を再確認** (2026-07-17) |
| 5 | ID 形式 / ベースパス | **ULID / `/api/v1`** (推奨既定値を採用) | §2.1 / §3.1。qa-032 ヒアリングで UUIDv7 案を再提示し **ULID 維持を再確認** (2026-07-17) |
| 6 | salary (PII) 保存方式 | **アプリ層カラム暗号化** (AES-GCM + Workers Secret 鍵。ユーザー選択, qa-032) | §2.1。エラー形式 RFC 9457 (§3.4) も同ヒアリングで再確認済み |
| 7 | AiJob pull 権限 (行 3 の改訂) | **workspace-admin にも開放** (2026-07-18 中立再確認でユーザーが変更, qa-048) | §4.11。workspace-admin = 自テナント限定・provider-admin = cross-tenant (監査付き) |
| 8 | C4 データ保持境界の改訂 | **業務ナレッジ/ドキュメント + 実行入出力データを保持可能に** (2026-07-18, appr-007/qa-045-048) | R2 + テナント別封筒暗号化・即時完全削除。credential は引き続き非保持。新テーブル tenant_data_objects は qa-045。中立再確認の証跡は qa-047 (旧 qa-043)・backend delta は qa-048 (旧 qa-044。いずれも採番衝突で再登録) |

### 9.1 security 深掘りヒアリング (2026-07-17 第 2 回 = qa-034 / qa-035 / qa-036 / qa-037)

`docs/security-spec.md` を security の詳細正本として新設。本書への反映は下表のとおり (security-spec §9 と対応)。

| # | 項目 | 決定 | 本書への影響 |
|---|---|---|---|
| 7 | テナント IdP client_secret | **DB へ封筒暗号化保存 (KEK/DEK)** (ユーザー選択) | §2.2 `idp_connections` を `client_secret_ref` → `client_secret_enc` へ変更。**「secret は環境 binding のみ」原則は Hub 自身の静的 secret に限定**し、テナント由来の動的 secret は本方式とする (環境 binding ではテナント追加のたびに再デプロイが必要になり C1/C2 に反するため) |
| 8 | 監査の改竄防止 | **アプリ層 append-only + hash chain (テナント単位)** (ユーザー選択) | §2.2 `audit_events` に `seq`/`prev_hash`/`event_hash` 追加。§7 に日次 chain 検証 cron 追加 |
| 9 | 暗号鍵ローテーション | **封筒暗号化 (KEK/DEK)** (ユーザー選択) | §2.2 に `encryption_keys` 追加。KEK 更新が DEK re-wrap のみで済み全行再暗号化が不要 |
| 10 | ingest 認証 | **Device Flow token を scope 分離** (ユーザー選択) | §2.2 `publisher_tokens.scopes_json` の値域を 4 scope に確定。ingest 用 token に `publish:write` を含めない |
| 11 | rate limit / TTL 数値 | **security-spec §7.2/§2 で確定** (ユーザー選択: 先送りを解消) | §3.7 の「数値は feature P02 で確定」を解消。P02 は実測に基づく調整のみ |
| 12 | ASVS 到達目標 | **L1 全面 + 認証/セッション/認可/データ保護/監査/暗号のみ L2 相当** (ユーザー選択) | security-spec §8.1。`targets` に `owasp-asvs` を追加し version は C02 で取得 |
| 13 | dev/demo 認証 | **提供者の Google Workspace を dev tenant の OIDC に** (ユーザー選択) | §3.2。dev 専用 provider を実装せず CI で禁止検査 |
| 14 | **provider-admin の越境** | **許可 + `provider.cross_tenant_access` の監査強制** (ベストプラクティス選定) | §3.8 に action 追加。**#3 (qa-031「cross-tenant は AiJob pull が監査付き唯一例外」) の一般化** — AiJob pull は唯一の**定常・自動**越境経路であり続けるが、IdP 設定登録・顧客サポート等の**例外的**越境も同じ監査を通す。break-glass 承認は承認者が提供者自身になり自己承認となるため採らない (security-spec §3.1.3) |
| 15 | **workspace-admin の実効範囲** | **tenant 単位** (ベストプラクティス選定) | §2.2 `workspaces` の「共有・権限の境界」→「共有・カタログの境界」へ修正。`users` に workspace 所属列が無く認可判定で突合できないため。部門別の権限分離が要求された時点で `workspace_memberships` を追加し R4-reopen (security-spec §3.1.2) |
| 16 | 許可表の単調性 | **仕様上の前提として明示**し T-1b が検査 (ベストプラクティス選定) | §3.3。実効 role を全順序の単一値として扱う根拠 |
