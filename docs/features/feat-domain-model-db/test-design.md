---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P04
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
consumes: [docs/features/feat-domain-model-db/architecture-decision-record.md, docs/features/feat-domain-model-db/design-review-notes.md, docs/security-spec.md]
---

# feat-domain-model-db テスト設計 (P04)

> **位置づけ**: P05 (実装) に先立ち、goal-spec の acceptance 3 件と quality_constraints 10 件の全てを自動化可能なテストケースへ写像する。P05 は本一覧のテスト対象を過不足なく実装し、P06 が実行して結果を記録する。

## 0. テスト基盤方針 (テストダブル方針)

| 項目 | 方針 |
|---|---|
| SQLite エンジン (libSQL 経路) | `@libsql/client` の `file:` / `:memory:` URL + `drizzle-orm/libsql` (**本番と同一 driver**) |
| SQLite エンジン (D1 経路) | `node:sqlite` (`DatabaseSync`) を裏に持つ **D1Database 構造互換 shim** + `drizzle-orm/d1` (**本番と同一 drizzle driver**)。D1 本体は CI から接続できないため、driver の SQL 生成と方言互換を実 SQLite エンジンで検証する |
| スキーマ DDL (P06 時点) | `drizzle-kit/api` の `generateSQLiteMigration` で **schema barrel から実行時導出** (= schema test harness)。P08 で生成する canonical migration artifact を P06 の前提にしない (Normative closure 準拠)。P08 完了後は canonical migration との**同値検証** (DMDB-T13) を追加する |
| R2 | `R2BucketLike` 構造型の in-memory fake (put/get/head)。immutable 検証は fake の書込記録で行う |
| 暗号 | 実物 (Web Crypto API / AES-256-GCM)。モックしない |
| 時刻 | リポジトリ層のサーバ時刻注入を実時刻で検証 (範囲アサーション)。クライアント指定値の無視は入力に偽時刻を与えて検証 |
| fixture | `__tests__/fixtures/two-tenants.ts` — tenant A/B の 2 テナント完全 fixture (18 テーブル全行 seed) |

## 1. テストケース一覧 (quality_constraints 10 件 + acceptance 3 件の写像)

| Test ID | 対応 QC / acceptance | 種別 | 内容 |
|---|---|---|---|
| DMDB-T01 | sqlite-dialect-compat-d1-fallback-connection-layer-d2 / **A1** | 結合 | package exports (`@harness-hub/db/connection`, `/repository`, `/schema`) を通して、同一スキーマ barrel から導出した DDL を libSQL 接続 (`createTursoClient`) と D1 接続 (`createD1Client` + shim) の双方へ適用し、代表エンティティの CRUD (insert/select/update/delete) が両接続で成功する |
| DMDB-T02 | release-immutable-atomic-stable-pointer-i3 / **A2** | 単体+結合 | (a) releases リポジトリの公開 API に status 以外の更新関数が存在しない (実行時 API 表面検査 + 型)、(b) `updateReleaseStatus()` が status のみ変更し他列が不変、(c) version が package_hash 差分から自動採番される (同一 hash → 新規採番せず既存返却、差分 hash → 直前 +1)、(d) `setStableRelease()` が単一 UPDATE で atomic に切替わり rollback (旧 id への再切替) が成立する |
| DMDB-T03 | tenant-workspace-scope-row-level-d4 | 結合 (CI 必須) | 2 テナント fixture 上で、tenant A のコンテキストから全 tenant_id 保有テーブル (14) の読取を行い、B の行が 1 件も返らない。update/delete も他 tenant の行へ到達しない。**スキーマ駆動**: 対象テーブルは barrel から実行時に列挙し、fixture/検証対象から漏れたら fail |
| DMDB-T04 | ulid-pk-display-code-epoch-server-time-qa032 | 単体 | 生成 PK が ULID 形式 (26 文字 Crockford Base32)・時系列単調。created_at / last_login_at 等の時刻列が INTEGER epoch ms でサーバ時刻注入され、クライアント指定値 (入力オブジェクトの偽 created_at) が無視される。last_login_at は入力 DTO に含めず、`markLastLogin()` だけが更新できる |
| DMDB-T05 | r2-content-addressed-package-registry-c4 | 単体 | `putPackage` が sha256 content hash と決定的 r2_key (`packages/{hash}`) を返し、同一内容の再 put が**書込なしで**同一結果を返す (冪等・immutable)。`getPackage` round-trip でバイト列一致。DB 側 (packages テーブル) には content_hash/r2_key/size_bytes/kind のみが入る |
| DMDB-T06 | daily-export-quarterly-restore-drill-qa019 / **A3** | 結合 | export 成果物 (JSONL) に salary 平文・client_secret 平文が一切現れず、暗号文形式 `{v}:{iv}:{ct}:{tag}` が維持される (断面検査)。export → **別 DB** へ restore → exact 18 テーブル集合・行数一致 + audit chain 検証 + salary 断面検査の round-trip が成功する。壊れた artifact (テーブル丸ごと欠落・行数不一致・chain 改竄) の restore が**失敗と判定される** (復元できないバックアップを成功と数えない) |
| DMDB-T07 | single-migration-pipeline-drizzle-repository-package | CI ゲート | drizzle.config.ts の out が `./migrations` の単一値であること。migrations/meta/_journal.json が単一 lineage であること。barrel (`schema/index.ts`) が migration 生成の唯一の入力であること (config の schema 指定検査) |
| DMDB-T08 | repository-layer-db-access-isolation-qa020 | CI ゲート (静的) | packages/db 以外のワークスペース source から `@libsql/client` / `drizzle-orm/libsql` / `drizzle-orm/d1` への import が 0 件 (`check-connection-layer-isolation.ts`)。リポジトリ関数が第 1 引数に RepositoryContext を要求し、省略がコンパイルエラーになる (型テスト = tsc) |
| DMDB-T09 | user-base-table-schema-owner-unresolved-p02 (P02 決定の検証) | 単体 (スキーマ一致) | users テーブルの実カラム集合が backend-spec §2.2 の定義 (id, tenant_id, idp_subject, email, name, department, salary, role, status, last_login_at + created_at) と完全一致する。UNIQUE(tenant_id, idp_subject) が強制される。schema/core/ 配下への他 feature 書込がないことは write_scope 運用と G10 duplicate detector が担保 (静的検査は P09) |
| DMDB-T10 | (release-immutable/tenant-scope の防衛層: security-spec §5.4 T-6) | 結合 | audit chain: 正しい append 連鎖が verify を pass。中間行の**改竄/削除/挿入**を verify が検出する。並行 append (同時 8 本) で seq が重複せず chain が破綻しない。AuditRepo の公開 API に update/delete が存在しない |
| DMDB-T11 | (封筒暗号化の防衛層: security-spec §4.1 T-4/T-5) | 単体 | encryptColumn/decryptColumn round-trip。並行した初回暗号化でも active DEK 発行が一つへ収束する。IV がレコードごとに異なる。AAD 不一致 (別 row_id) で復号が失敗する。DEK wrap/unwrap round-trip。key_version を上げた後も旧 version の暗号文が復号できる |
| DMDB-T12 | executable-export-restore-ci-fixture | 結合 (CI 必須) | 2 テナント fixture が schema harness 適用済み DB へ seed でき、export → 別 DB restore round-trip が **CLI (`export-control-plane.ts`/`restore-control-plane.ts`) 実行**でも exit 0 で完走する。認証トークンは argv に載せず `TURSO_AUTH_TOKEN` 環境変数だけから読む |
| DMDB-T13 | single-migration-pipeline (P08 追補) | 結合 | P08 で生成した canonical migration SQL を空 DB へ適用した結果のスキーマが、schema harness 導出 DDL 適用結果と同値 (テーブル/カラム/インデックス集合一致)。2 テナント fixture が canonical migration 適用 DB 上でも成立する |

## 2. acceptance との対応 (P06/P07 が参照)

| acceptance | 判定根拠となる Test ID |
|---|---|
| A1 スキーマが SQLite 方言互換で D1 接続テストが通る | DMDB-T01 (+T13) |
| A2 Release が immutable として強制される | DMDB-T02 |
| A3 バックアップ export と復元手順が検証済み | DMDB-T06, DMDB-T12 |

## 3. テストファイル配置 (P05 実装対象の構造)

```
packages/db/__tests__/
  support/
    schema-harness.ts        # barrel → DDL 実行時導出 (drizzle-kit/api)
    d1-shim.ts               # node:sqlite ベースの D1Database 構造互換 shim
    r2-fake.ts               # R2BucketLike in-memory fake
    test-db.ts               # libSQL/D1 テスト DB の生成ヘルパ
  fixtures/
    two-tenants.ts           # DMDB-T03/T06/T12 の 2 テナント fixture
  dialect-compat.test.ts     # DMDB-T01
  release-immutable.test.ts  # DMDB-T02
  tenant-isolation.test.ts   # DMDB-T03
  ulid-epoch.test.ts         # DMDB-T04
  r2-registry.test.ts        # DMDB-T05
  backup-restore.test.ts     # DMDB-T06 / DMDB-T12
  migration-lineage.test.ts  # DMDB-T07 / DMDB-T13 (P08 後に T13 有効化)
  users-schema-match.test.ts # DMDB-T09
  audit-chain.test.ts        # DMDB-T10
  encryption.test.ts         # DMDB-T11
  repository-context.test-d.ts # DMDB-T08 型テスト (tsc で検証, @ts-expect-error)
```

CI ゲート (DMDB-T07/T08 の静的検査) は `packages/db/scripts/check-*.ts|mjs` に置き、P09 が `.github/workflows/ci.yml` へ接続する。

## 4. スコープ外

- Studio 拡張 feature 独自のテストケース (各 feature の P04)
- tenant_data_objects (qa-045) 関連テスト (digest スコープ外)
- 認可ミドルウェア・PII ガード適用のテスト (owner=feat-auth-tenancy / feat-user-org-admin)
