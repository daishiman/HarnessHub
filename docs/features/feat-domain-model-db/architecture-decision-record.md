---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P02
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
architecture_refs: [arch-harness-hub-data, arch-harness-hub-backend]
consumes: [docs/features/feat-domain-model-db/requirements-baseline.md, docs/backend-spec.md, docs/security-spec.md, docs/shared-layers.md, system-spec/database.md]
---

# feat-domain-model-db アーキテクチャ設計記録 (ADR)

> **位置づけ**: P02 の成果物。P01 の requirements-baseline.md を実装可能なアーキテクチャへ具体化した正本。P05 (実装)・P08 (migration) はこの文書に厳密に従い、逸脱が必要になった場合は本 task を re-open する。

## 1. Architecture decision: User 基底テーブルの owner は feat-domain-model-db である

**決定**: feat-domain-model-db が users テーブル (department/salary 列を含む完全な基底定義: id, tenant_id, idp_subject, email, name, department, salary, role, status, last_login_at) および user_settings テーブルを含むコアドメイン 18 テーブル全ての owner である。feat-user-org-admin は users テーブルへの列追加を一切行わない。

**証跡 (3 系統)**:

1. **文書証跡 (直接引用)**: docs/backend-spec.md §2.2 の `users` 行は `id, tenant_id, idp_subject, email, name, department, **salary (PII, 年収 JPY)**, role, status, last_login_at` の単一行・単一の既存確定・不変定義であり、§2.3 (Studio 拡張 11 テーブル: hearing_sheets, builds, build_stage_events, feedbacks, documents, notifications, metrics_events, metrics_rollups, ai_jobs, tenant_coefficients, display_code_counters) は users.department/users.salary を定義・所有しない (hearing_sheets.department は申請者部門の snapshot 列 = 別テーブルの非正規化コピーであり、users 列の owner とは無関係 — P03 指摘による精度補正)。department/salary は「User 拡張列」ではなく §2.2 が定めるコアドメイン base table そのものの構成列である。したがって users の列定義を分割して別 feature に割り当てる文書的根拠は存在しない。
2. **write_scope の構造的制約**: `packages/db/schema/core/` は本 feature の排他的 write_scope であり、単一 migration 系統 (quality_constraints: single-migration-pipeline-drizzle-repository-package) の下で 1 つの CREATE TABLE 文を複数 feature の write_scope にまたがって ALTER 分割する仕組みは goal-spec/exact-13 契約のどこにも定義されていない。users テーブルの全列は schema/core/ に単一の CREATE TABLE として実装され、feat-domain-model-db が唯一の owner となる。
3. **アクセス制御責務の分離**: docs/backend-spec.md はメンバーが name/department のみ閲覧可能で salary は admin 限定であること、role/department/salary/status 変更時に監査 event を要求することを定める (§3 API 契約、§9.1)。「誰が列を定義するか (スキーマ owner)」と「誰が読み書きを制御するか (業務ロジック owner)」は別責務であり、PII ガード共通層自体は feat-hub-foundation が owner (docs/shared-layers.md §5)、feat-user-org-admin はこの共通層を salary 列に適用する消費者であって、列定義そのものの owner ではない。

**feat-user-org-admin の責務 (本決定後)**: (a) feat-hub-foundation 所有の PII ガード共通層を salary 列に適用する認可ゲート、(b) feat-domain-model-db の AuditRepo.append() を消費する salary/role 変更監査ロジック、(c) tenant_coefficients テーブルと係数管理 UI/API (hourlyRate = salary ÷ annual_hours、docs/backend-spec.md §6)。

**cross-feature follow-up 注記**: feat-user-org-admin の現行公開 plan (phase-02-architecture.md) は「User 拡張 (department/salary) のカラム設計」「User テーブルへの department/salary 列追加は後方互換な列追加として設計」と記述しており、本決定と矛盾する前提に基づく。この矛盾は feat-user-org-admin 自身の write_scope 配下にあるため本 task では訂正できない。dev-graph への follow-up として「feat-user-org-admin 側 P02 再実行時に、User 拡張列設計を PII ガード適用・監査・tenant_coefficients 設計へ置き換え、department/salary 列のスキーマ定義記述を削除する」ことを申し送る。features/feat-domain-model-db.md 上流未解決節の記述更新も同様に follow-up として申し送る (features/ 配下は graph authority 管理下のため本 task の write_scope 外)。

## 2. コアドメイン 18 テーブルの列定義 (docs/backend-spec.md §2.2 準拠)

共通規約 (qa-032): 全 PK は `id TEXT` — ULID (26 文字 Crockford Base32、時系列ソート可)。時刻列は `INTEGER` (Unix epoch ミリ秒、サーバ時刻のみ、クライアント指定不可)。表示用連番は Studio 拡張が owner の display_code_counters から発行される別列であり、本 feature のコアテーブルは連番カウンタを持たない。`packages` (PK=content_hash) と `user_settings` (PK=user_id)、`session_revocations` (PK=tenant_id)、`idempotency_ledger` (PK=(scope,key)) は自然キー PK の例外。

| # | テーブル | 列 | 制約・備考 |
|---|---|---|---|
| 1 | `tenants` | id PK, slug, name, plan, status(`active/suspended`), created_at | slug UNIQUE。tenant_id 列を持たない唯一のルート境界テーブル (自身が境界) |
| 2 | `idp_connections` | id PK, tenant_id, issuer_url, client_id, client_secret_enc, scopes, created_at | client_secret_enc は封筒暗号化 (purpose=`idp_secret`, §5)。UNIQUE(tenant_id, issuer_url) |
| 3 | `workspaces` | id PK, tenant_id, slug, name, created_at | UNIQUE(tenant_id, slug)。共有・カタログの境界 (権限の境界は tenant) |
| 4 | `users` | id PK, tenant_id, idp_subject, email, name, department, salary (PII, 暗号文 TEXT), role(`provider-admin/workspace-admin/member`), status(`active/inactive`), last_login_at, created_at | UNIQUE(tenant_id, idp_subject)。salary は封筒暗号化 (purpose=`salary`, §5)。owner は role 列ではなく projects.owner_user_id の関係 role |
| 5 | `user_settings` | user_id PK, notify_generation, notify_review, notify_weekly, notify_feedback, email_enabled, theme, density, language | tenant_id 非保持 (users 経由で tenant へ辿る 1:1 拡張)。2FA/パスワード列なし (IdP 責務, SEC1) |
| 6 | `projects` | id PK, tenant_id, workspace_id, slug, name, description, owner_user_id, status(`active/suspended/archived`), created_at | UNIQUE(workspace_id, name) |
| 7 | `target_channels` | id PK, tenant_id, project_id, target(`skill/web_app`), stable_release_id, created_at | UNIQUE(project_id, target)。stable pointer の正本 |
| 8 | `releases` | id PK, tenant_id, project_id, channel_id, version, package_hash, manifest_json, status(`available/suspended/deprecated`), created_by, created_at | **immutable** (更新は status のみ)。version は直前 release との package_hash 差分判定から自動採番 (§6)。UNIQUE(channel_id, version) |
| 9 | `packages` | content_hash PK(sha256 hex), r2_key, size_bytes, kind(`skills-package`), created_at | R2 実体への参照 (PackageRegistry)。tenant 非スコープ (content-addressed 共有。到達可能性は releases 経由の認可で制御) |
| 10 | `deployment_references` | id PK, tenant_id, project_id, channel_id, release_id, url, provider(`cloudflare`), orphan_candidate INTEGER(bool), registered_by, last_health_at, created_at | web_app 出口 |
| 11 | `catalog_entries` | id PK, tenant_id, workspace_id, project_id UNIQUE, visibility(`private/workspace`), summary, tags_json, dl_count, published_at | `public` は Stage 5 まで非対象 |
| 12 | `publish_requests` | id PK, tenant_id, workspace_id, project_id, channel_id, status(9 値), verdict(`green/yellow/red`), findings_json, release_id, requested_by, idempotency_key, created_at | 同一 channel の非終端 request は 1 件 (partial UNIQUE index `WHERE status NOT IN ('completed','failed','cancelled')`, qa-009) |
| 13 | `publisher_tokens` | id PK, tenant_id, user_id, device_name, refresh_token_hash, scopes_json, family_id, last_used_at, expires_at, revoked_at, created_at | refresh は SHA-256 ハッシュ保存。scopes_json 値域は publish:write/metrics:write/feedback:write/aijob:process |
| 14 | `device_authorizations` | id PK, tenant_id, device_code_hash, user_code, user_id, status(`pending/approved/denied/expired`), interval_sec, expires_at, created_at | Device Flow (qa-008)。tenant_id/user_id は承認前 NULL 許容 |
| 15 | `audit_events` | id PK, tenant_id, workspace_id, actor_type(`user/publisher_token/system`), actor_id, action, entity_type, entity_id, summary_json, seq, prev_hash, event_hash, created_at | **append-only** (UPDATE/DELETE 禁止)。hash chain はテナント単位。UNIQUE(tenant_id, seq)。summary_json に秘匿値を書かない |
| 16 | `encryption_keys` | id PK, purpose(`salary/idp_secret`), key_version, dek_wrapped, status(`active/retiring/retired`), created_at, retired_at | UNIQUE(purpose, key_version)。active は purpose ごとに 1 件。DEK 平文は保存しない。tenant 非スコープ (システム全体の鍵台帳。行データではなく鍵素材のため D4 の分離テスト対象外と明示) |
| 17 | `session_revocations` | tenant_id PK, revoked_at | 緊急失効のみ。JWT.iat < revoked_at を拒否 |
| 18 | `idempotency_ledger` | scope, key, request_hash, response_status, response_body_json, expires_at — PK(scope, key), tenant_id | publish 系 POST の再試行安全化 |

**tenant_id スコープ判定 (D4 分離テスト対象)**: 上記 18 テーブルのうち tenant_id 列を持つのは idp_connections, workspaces, users, projects, target_channels, releases, deployment_references, catalog_entries, publish_requests, publisher_tokens, device_authorizations, audit_events, session_revocations, idempotency_ledger の 14 テーブル。tenants (自身が境界)・user_settings (users 1:1 従属)・packages (content-addressed 共有)・encryption_keys (鍵台帳) の 4 テーブルは tenant_id 列を持たず、除外理由をスキーマ定義内 (`TENANT_SCOPE_EXEMPT`) に機械可読で宣言し、分離テスト網羅チェック (P09) がこの宣言と実スキーマの差分を fail-closed で検査する。target_channels/releases は backend-spec §2.2 では project 経由の間接スコープだが、リポジトリ層の WHERE 強制注入を単純化するため tenant_id を非正規化して直接保持する (JOIN を跨ぐ scope 注入は実装漏れリスクが高い。qa-024 の「全新規テーブルへ scope 列必須」とも整合)。

## 3. 接続層の隔離設計 (D2 ヘッジ)

- スキーマ定義は `drizzle-orm/sqlite-core` の driver 非依存 API (`sqliteTable`/`text`/`integer`/`uniqueIndex`) のみを使用し、Turso 固有・D1 固有の型に依存しない。
- `packages/db/connection/` に 2 系統のファクトリを設ける:
  - `createTursoClient(env)` — `@libsql/client` + `drizzle-orm/libsql` (primary)。env は `{ url, authToken? }`。
  - `createD1Client(binding)` — `drizzle-orm/d1` (hedge)。binding は D1Database 構造型。
- 両者は既存の境界型 `DatabaseAdapter<Schema>` (packages/db/src/adapter.ts、feat-hub-foundation 確立) を返し、リポジトリ層関数は driver 種別を意識せず同一シグネチャで動作する。libSQL 側は `TransactionalAdapter` (interactive transaction 可)、D1 側は transaction 非対応 (D1 の実行モデル上 interactive transaction が存在しない) のため、原子性が必要な操作は「単一 SQL 文の原子性 + UNIQUE 制約 + 再試行」で両 driver 共通に成立する設計とする (§7 audit append)。
- 切替はデプロイ時の環境バインディング選択のみで完結する。DB アクセスは packages/db のリポジトリ層関数経由以外を禁止し (qa-020)、CI の接続層隔離検査 (P09: `check-connection-layer-isolation.ts` — packages/db 以外からの `@libsql/client`/`drizzle-orm/libsql`/`drizzle-orm/d1` 直接 import の禁止) で機械検証する。

## 4. R2 content-addressed PackageRegistry

- `packages` テーブルは content_hash (sha256 hex, PK) / r2_key / size_bytes / kind のみを保持し、SkillPackage 実体は保存しない。
- R2 key は content_hash から決定的に導出する: `packages/{content_hash}`。
- 同一 content_hash への書き込みは既存確認により**スキップ** (冪等) し、上書きを行わない (immutable)。
- 公開 API は 2 関数のみ: `putPackage(buffer) -> {contentHash, r2Key, sizeBytes}` / `getPackage(contentHash) -> ReadableStream | null`。R2 バケットは構造型 `R2BucketLike` (put/get/head) で受け、workers-types への hard 依存を持たない。

## 5. 封筒暗号化 (KEK/DEK) と encryption_keys の owner 確定

- 本 feature が encryption_keys テーブルと列暗号化プリミティブ `encryptColumn(purpose, plaintext, rowRef)` / `decryptColumn(purpose, ciphertext, rowRef)` の owner である。
- AES-256-GCM (Web Crypto API)。IV=96bit random (レコードごと)、AAD=`"{table}:{column}:{row_id}"`、保存形式 `{key_version}:{iv_b64}:{ciphertext_b64}:{tag_b64}` (security-spec §4.1)。
- KEK は Workers Secret (`ENCRYPTION_KEK`) の 1 本。DEK は purpose 別 (`salary`/`idp_secret`) に KEK で wrap して encryption_keys.dek_wrapped へ保存 (形式 `{iv_b64}:{ciphertext_b64}:{tag_b64}`)。
- `key_version` により旧版復号を常に可能とし、ローテーションは security-spec §4.1.2 (KEK=re-wrap のみ / DEK=新 version 発行 + バッチ再暗号化) に従う (運用手順は P12 runbook)。
- users.salary / idp_connections.client_secret_enc の双方が同一プリミティブを再利用する。feat-user-org-admin は本プリミティブ経由で salary への PII ガード付きアクセスを実装する消費者。

## 6. Release immutability と atomic stable pointer

- releases リポジトリは `createRelease()` / `updateReleaseStatus()` / 読取系のみを公開し、status 以外のフィールドを更新する関数を**提供しない** (存在しないものは呼べない)。
- version 自動採番: `createRelease(ctx, {channelId, packageHash, ...})` は同一 channel の直前 release を取得し、(a) package_hash が同一なら新規採番せず既存 release を返す (差分なし=新 version を作らない)、(b) 異なれば直前 version + 1 を `v{N}` 形式で採番する (初回は v1)。UNIQUE(channel_id, version) が並行採番の競合を検出し、競合時は再試行する。
- target_channels.stable_release_id の切替 (`setStableRelease()`) は単一 UPDATE 文で行い、両 driver で atomic (I3)。rollback は旧 release_id への同一操作。

## 7. audit_events hash chain の owner 確定

- 本 feature が AuditRepo (`append()`/`read()` のみ公開) の owner。他 feature は AuditRepo を消費するのみで独自監査テーブルを持たない。
- hash chain (テナント単位): `event_hash = SHA-256(prev_hash || "\n" || tenant_id || "\n" || seq || "\n" || actor_type || "\n" || actor_id || "\n" || action || "\n" || entity_type || "\n" || entity_id || "\n" || canonical_json(summary_json) || "\n" || created_at)`。seq=1 の prev_hash は `"genesis"`。canonical_json はキー辞書順・空白なし (JCS 相当)。
- append の原子性: libSQL では `BEGIN IMMEDIATE` トランザクション内で「最終 seq/hash 取得 → insert」を行う。D1 では interactive transaction が存在しないため「最終 seq/hash 取得 → insert」を UNIQUE(tenant_id, seq) の競合検出 + 再試行で直列化する (optimistic)。どちらの経路でも UNIQUE 制約が最終防衛線であり、chain の一貫性は insert 成功時のみ確定する。
- UPDATE/DELETE 関数は実装しない。CI 禁止検査 (security-spec §8.2 CI-2) の対象。
- chain 全体検証 `verifyAuditChain(ctx)` を backup/検証ライブラリとして実装し、restore 後整合検査 (§9) と日次検証 cron (P12 stub) が共用する。

## 8. 単一 migration 系統と Studio 拡張の統合方式

- drizzle-kit の出力先を `packages/db/migrations/` に一本化する。`packages/db/drizzle.config.ts` (dialect=sqlite, schema=`./schema/index.ts`, out=`./migrations`) を本 feature が所有する。
- コアドメイン 18 テーブルは `packages/db/schema/core/*.ts` に配置。Studio 拡張 feature は各自の write_scope `packages/db/schema/{studio-feature}/` に自身のテーブル定義を配置する。
- `packages/db/schema/index.ts` (barrel) は core と Studio 拡張の schema を re-export するのみで内容を編集しない。migration 生成は常に barrel を入力とするため lineage は単一に保たれる。
- 破壊的 DDL は CI G7 (`check:ddl`) が expand/contract 規約で検査する (P08/P09)。

## 9. 日次 export / restore の設計 (qa-019)

- **保存形式**: 1 アーティファクト = JSON Lines。ヘッダ行 (`{"type":"header","schema_version",…,"exported_at","table_counts"}`) + 各行 (`{"type":"row","table","data"}`)。gzip は転送層 (backup.yml/R2) の関心とし、ライブラリはプレーン JSONL を生成する。決定論的順序 (テーブル名順 → PK 順) で出力し、同一 DB 状態からの export が同一バイト列になることを完全性検査の前提とする。
- **暗号化/マスク境界**: users.salary と idp_connections.client_secret_enc は DB 上で暗号文 TEXT のため、export は**暗号文のまま**転写する (復号処理を export 経路に置かない = 平文が断面に存在しえない構造)。加えて export 側で salary/client_secret_enc 値を `***` へマスクした **masked ビュー**は作らない — マスクすると restore 不能になり qa-019 (復元できないバックアップを成功と数えない) に反するため、「暗号文のまま転写 + export 成果物に平文が現れないことのテスト」で「常にマスク」要求を充足する (平文はどの断面にも現れない)。
- **restore の検証順序**: (1) ヘッダの schema_version/table_counts 検証 → (2) 空の別 DB へ migration 適用 → (3) 全行 insert → (4) 行数一致検査 → (5) audit chain 全体検証 (§7) → (6) UNIQUE/PK 整合 (insert 成功自体が検査) → (7) salary 断面検査 (暗号文形式 `{v}:{iv}:{ct}:{tag}` のままであること)。いずれか失敗で exit 非 0 (復元できないバックアップを成功と数えない)。
- **実装**: ライブラリ `packages/db/backup/` (export/restore/verify)、CLI `packages/db/scripts/export-control-plane.ts` / `restore-control-plane.ts`。日次 cron ハンドラの interface stub は P12 (`packages/db/cron/`)。

## 10. 2-tenant fixture の設計

- `packages/db/__tests__/fixtures/two-tenants.ts` が tenant A / tenant B の完全な fixture (18 テーブル全てに両テナントの行。tenant 非スコープ 4 テーブルは共有行) を migration 適用済み DB へ seed する。
- 分離テスト (P06/P09) は「A のコンテキストで全リポジトリ読取を行い、B の行が 1 件も返らないこと」をスキーマ駆動 (barrel から tenant_id 保有テーブルを列挙) で検証する。新テーブル追加時に fixture/テスト対象が未追随なら CI fail (P09 網羅チェック)。

## 11. qa-045 (tenant_data_objects) の scope-out 確定

system-spec/database.md qa-045 (2026-07-18 確定) の tenant_data_objects テーブルおよび業務データ封筒暗号化保存は、本 feature の feature_context_digest (`sha256:68f274de…`) の quality_constraints/lineage に含まれず、goal-spec に出現する qa エントリ (qa-002/004/011/017/019/020/024/032 — P03 指摘により全列挙へ精度補正) にも含まれない。exact-13 パッケージ契約は digest に紐づかないスコープ拡張を禁止するため、tenant_data_objects は本 feature の成果物に**含めない**。当該責務は独立 feature (feat-tenant-data-retention = HarnessHub-47b が追跡) として dev-graph へ follow-up 済みであることを確認した。

## 12. P05 実装構成 (確定)

```
packages/db/
  schema/
    core/            # 18 テーブル定義 (本 feature 排他 write_scope)
    index.ts         # barrel (Studio 拡張の re-export 挿入点)
  connection/        # createTursoClient / createD1Client
  repository/        # TenantCtx 強制のリポジトリ関数群 + ULID/時刻/暗号化プリミティブ
  registry/          # R2 content-addressed registry (putPackage/getPackage)
  backup/            # export/restore/verify ライブラリ
  scripts/           # export-control-plane.ts / restore-control-plane.ts / CI 検査スクリプト
  cron/              # (P12) 日次 export・audit chain 検証の interface stub
  migrations/        # (P08) 単一 lineage
  __tests__/         # (P04 で構造確定、P05/P06 で実装・実行)
```

- TenantCtx は既存境界型 `RepositoryContext` (packages/db/src/types.ts) を採用する (tenantId 必須・branded 相当の生成関数 `createRepositoryContext` で空スコープを拒否済み)。新設の別ブランド型は導入しない (二重の scope 型は消費側の混乱を招く。security-spec §3.6 の「第 1 引数で強制」を既存型で満たす)。
