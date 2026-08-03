---
status: confirmed
layer: feature-operations
task: SYS-TENANT-DATA-RETENTION-P12
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: [docs/features/feat-tenant-data-retention/evidence-summary.md, docs/features/feat-tenant-data-retention/test-run-results.md]
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: []
---

# feat-tenant-data-retention runbook

- graph_node_id: `SYS-TENANT-DATA-RETENTION-P12`
- feature_context_digest: `sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`

## 1. 業務データ upload/取得/削除操作手順

対象 API (`apps/hub/tests/tenant-data/routes.test.ts` API-1〜API-5 で契約確認済み)。

### 1.1 upload

```
POST /api/v1/tenant-data/objects
```
- multipart/form-data で `workspaceId` (自テナントの workspace と一致必須) と `file` を送る。
- `kind` は enum 制約あり、範囲外は 422。
- rate limit あり (超過時 429)。
- role: workspace member 以上で許可 (`MEMBER_UP`)。

### 1.2 一覧取得・詳細取得

```
GET /api/v1/tenant-data/objects?workspaceId=...
GET /api/v1/tenant-data/objects/:id
```
- 一覧は自テナント分のみ返る (`tenant-isolation.test.ts` でスキーマ駆動に自動検証)。
- 詳細取得で他テナントの `:id` を指定すると 404 (403 ではない — 存在秘匿。他テナント資源の存在有無を
  応答から推測させない設計)。

### 1.3 本文取得 (復号済みコンテンツ)

```
GET /api/v1/tenant-data/objects/:id/content
```
- 認可ミドルウェア (`withAuthz`) 通過後にのみ R2 blob を取得し復号する。認可判定より先に復号する経路は
  存在しない (T14 対策の 1 層)。

### 1.4 削除

```
DELETE /api/v1/tenant-data/objects/:id
```
- role: workspace admin (`ADMIN_UP`) のみ許可、member は 403。
- 実行後、対象行は DB から即時削除 (soft delete 列を持たない)、対応する R2 blob も削除、
  `tenant_data_tombstones` へ 1 行追加、`audit_events` へ 1 件記録される。全て同一 workflow 内で実行
  されるため、削除操作の途中失敗で「DB は消えたが R2 blob は残る」状態にはならない (`immediate-full-
  deletion-r2-db-backup-contract`)。
- 削除後は一覧・取得・本文取得のいずれからも即座に消える (204 応答)。

### 1.5 削除後の backup restore 手順

古い日次 backup を復元する場合は、削除後に作成されたより新しい export から tombstone manifest を抽出して
必ず重ねる。これにより、削除前 snapshot の `tenant_data_objects` 行を restore しても API から再び読めない。

```bash
pnpm --filter @harness-hub/db exec tsx scripts/extract-tenant-data-tombstones.ts \
  --in <delete後の新しい-export.jsonl> --out <tenant-data-tombstones.json>
pnpm --filter @harness-hub/db exec tsx scripts/restore-control-plane.ts \
  --url <空の復元先-libsql-url> --in <復元対象-export.jsonl> \
  --tombstone-manifest <tenant-data-tombstones.json>
```

- `--tombstone-manifest` は tenant_data 行を含む restore で必須。manifest の元 export が復元対象より古い場合は
  fail-closed（安全側に失敗する）で停止する。
- R2 blob は削除 API 実行時に既に物理削除される。manifest は古い DB 参照だけを除去し、削除済みデータを
  新たに R2 から復元する機能は持たない。

## 2. R2 使用量監視アラート対応手順

- `apps/hub/src/worker/cron.ts` の日次 cron (`DAILY_CRON`) が `turso-usage-monitor` スロットで
  `createUsageMonitorJob()` を実行し、`TENANT_DATA_BUCKET`/`PACKAGES_BUCKET` の使用量を個別に評価する。
- 閾値: ストレージ使用率 90% 超過で critical 通知 (`kind: usage.r2_tenant_data_threshold`)。70% は
  warning 相当の閾値として同じジョブ内で評価される (`apps/hub/tests/scheduled/usage-monitor.test.ts`)。
- 通知到達経路: `NotificationDispatcher` の `in_app` transport 経由で Workers の構造化ログへ出力される
  (最小実装。DB 保存・admin 画面での一覧表示は別途通知基盤 feature のスコープ、
  `implementation-notes.md` 参照)。
- **対応手順**: critical 通知のログを確認したら、対象バケット (`harness-hub-tenant-data` /
  `harness-hub-packages`) の R2 ダッシュボードで実使用量を確認し、想定超過 (テナント数増加による自然増)
  か異常増加 (誤アップロード・攻撃) かを切り分ける。異常増加が疑われる場合は該当テナントの直近 upload
  ログを `audit_events` から確認する。
- **前提条件の制約**: Turso Platform API の secret (`TURSO_API_TOKEN`/`TURSO_ORG_SLUG`/
  `TURSO_DATABASE_NAME`) は `scripts/ci/worker-secrets-registry.json` に `requirement: "planned"` と
  して登録されているが未投入。投入するまで Turso 側 (rows_read/rows_written/storage_bytes) の使用量
  監視はスキップされ、R2 側の監視のみが稼働する。Turso 監視を有効化する運用タスクは本 feature の
  スコープ外 (secret 投入のみで追加のコード変更なしに有効化される設計)。

## 3. encryption_keys ローテーション手順 (tenant_data purpose 拡張分)

既存の `salary`/`idp_secret` purpose のローテーション手順に、`tenant_data` purpose 向けの以下の差分が
追加される (`packages/db/repository/crypto.ts` の `ColumnCipher`)。

- **DEK のスコープ単位**: `tenant_data` purpose の DEK は `(tenant_id, purpose, key_version)` の組で
  一意 (`UNIQUE(tenant_id,purpose,key_version)`)。既存の global purpose (`tenant_id IS NULL`) とは
  別の partial unique index で管理されるため、ローテーション操作はテナント単位で独立して実行できる
  (あるテナントの rotation が他テナントの DEK に影響しない)。
- **rotation 実行**: 新しい `key_version` を発行しても旧バージョンの DEK 行は削除せず `status` を
  切り替えるのみ。ローテーション後も旧 `key_version` で暗号化済みの既存データは、旧バージョンの DEK が
  残っているため復号可能 (DMDB-T15 TC-5 で確認済み)。
- **active DEK の lookup**: `activeDekVersion(purpose, tenantId)` が `tenant_id IS NULL` /
  `tenant_id = ?` を条件に応じて切り替えて active な DEK を返す。新規 upload は常に active な
  `key_version` で暗号化される。
- **deletion との関係**: `tenant_data_objects` の削除では DEK 自体は削除しない (同一テナントの他
  オブジェクトが同じ `key_version` を共有しているため)。DEK のライフサイクルはオブジェクト単位ではなく
  purpose+tenant 単位で管理する。

## 4. feature context の scope_in/acceptance 全件の P12 責務追跡

`feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327` の
scope_in は本ファイル (`runbook.md`) 1 件のみであり、P12 の acceptance 2 件 (3 項目の記載、feature
context 全 scope_in の追跡) は本ファイルの §1〜§3 と本節でともに充足する。

**未割当項目: 0 件。**

P13 (リリース/デプロイ) へ引き継ぐ。
