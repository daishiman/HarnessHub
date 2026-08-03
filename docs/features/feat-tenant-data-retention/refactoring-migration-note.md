---
status: confirmed
layer: feature-design
task: SYS-TENANT-DATA-RETENTION-P08
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: [arch-harness-hub-data, arch-harness-hub-security]
---

# feat-tenant-data-retention P08 リファクタリング/マイグレーション記録

- graph_node_id: `SYS-TENANT-DATA-RETENTION-P08`
- feature_context_digest: `sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`

## 0. 実装ファイルの実パスと task spec の記載パスの差異

task spec の `resource_scope` は `packages/db/src/schema/encryption-keys.ts` /
`packages/db/src/repository/tenant-deks.ts` / `packages/db/src/backup/tenant-data-tombstones.ts` を
記載しているが、本リポジトリの実レイアウトは `packages/db/src/` prefix を使わないフラット構成
(`packages/db/schema/`、`packages/db/repository/`) である。P04 (test-design.md §6) で同じ差異が
確認済みで「既存規約に合わせて解決する」方針が確定しているため、本 task も同じ方針を踏襲する。

実装は以下の既存ファイルへの追加・拡張として行われている (P05 で実装済み、本 task は移行手順と非破壊性の確認)。

| task spec の記載パス | 実パス | 内容 |
| --- | --- | --- |
| `packages/db/src/schema/encryption-keys.ts` | `packages/db/schema/core/security.ts` (`encryptionKeys` テーブル) | `tenant_id` 列追加・partial unique index 2 本 |
| `packages/db/src/repository/tenant-deks.ts` | `packages/db/repository/crypto.ts` (`ColumnCipher`) | per-tenant DEK の lookup/rotation/deletion を既存暗号化 repository へテナント軸を追加する形で拡張 |
| `packages/db/src/backup/tenant-data-tombstones.ts` | `packages/db/backup/tenant-data-tombstones.ts` + `packages/db/schema/tenant-data/tombstones.ts` + `packages/db/repository/tenant-data.ts` | tombstone manifest の抽出・restore 時の適用、スキーマ、削除時の書き込み |

## 1. `encryption_keys.tenant_id` migration の適用手順と非破壊確認

### 1.1 migration 内容 (`packages/db/migrations/0006_tenant-data-retention.sql`)

```sql
CREATE TABLE `tenant_data_objects` ( ... );
CREATE UNIQUE INDEX `tenant_data_objects_r2_key_uq` ON `tenant_data_objects` (`r2_key`);
CREATE INDEX `tenant_data_objects_tenant_workspace_kind_created_idx` ON `tenant_data_objects` (...);
DROP INDEX `encryption_keys_purpose_version_uq`;
ALTER TABLE `encryption_keys` ADD `tenant_id` text;
CREATE UNIQUE INDEX `encryption_keys_purpose_version_global_uq` ON `encryption_keys` (`purpose`,`key_version`) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX `encryption_keys_tenant_purpose_version_uq` ON `encryption_keys` (`tenant_id`,`purpose`,`key_version`) WHERE tenant_id IS NOT NULL;
```

`tenant_id` は **nullable** で追加している。既存の `salary`/`idp_secret` 用途 (global スコープ、`tenant_id
IS NULL`) の DEK 行は無変更のまま残り、旧来の単一 unique 制約 (`purpose, key_version` の組が一意) を
`WHERE tenant_id IS NULL` の partial index が引き継ぐ。新規の `tenant_data` 用途は `WHERE tenant_id IS NOT
NULL` の partial index で `(tenant_id, purpose, key_version)` の組を一意にする。2 本の partial index は
条件が排他 (`IS NULL` / `IS NOT NULL`) のため、互いの一意性判定に影響しない。

### 1.2 非破壊確認

| 確認事項 | 証跡 |
| --- | --- |
| 既存 `salary`/`idp_secret` の round-trip・IV・AAD・rotation ケース (DMDB-T11) が migration 後も無改修で PASS する | `packages/db/__tests__/encryption.test.ts`。migration 前の KEK-wrap AAD `` `${purpose}:v${keyVersion}` `` で seed した global DEK を復号する回帰テストを含め、P06 の apps/hub 全体 vitest 実行に含めて確認 |
| `purpose` enum への `tenant_data` 追加が既存 `EncryptionPurpose` 型の消費側を壊さない | `pnpm --filter @harness-hub/db exec tsc --noEmit` PASS |
| migration ファイルが追記のみ (既存 migration 0000〜0005 を書き換えていない) | `packages/db/migrations/` の連番ファイル群を確認。0006 は新規追加のみ |
| global 用 unique index の tenant 対応への置換が G7 で意図どおり検査される | `0006` の `DROP INDEX` の直前に `ddl:contract-approved` 注釈を置く。これは未配布 migration 内で、既存 global 行を保持する partial unique index と tenant 用 unique index へ置換するための承認記録 |

### 1.3 per-tenant DEK provisioning (lookup / rotation / deletion)

`packages/db/repository/crypto.ts` の `ColumnCipher` を拡張し、`purpose='tenant_data'` のときのみ
`tenantId` を DEK スコープ (`tenantScope()`)・AAD 材料 (`wrapAad()`) の両方へ組み込む。`salary`/
`idp_secret` (tenant 非スコープ) は `tenantId: undefined` の経路のままで、型 (`TenantIdFor<P>`) と実行時
検査 (`resolveKeyScope()`) が purpose ごとに `tenantId` の必須/禁止を fail-closed で強制する。global DEK
の wrap AAD は migration 前からの `` `${purpose}:v${keyVersion}` `` を維持し、既存鍵を読めなくする形式変更を
行わない。

- **lookup**: `activeDekVersion(purpose, tenantId)` — `tenantScope(tenantId)` で `tenant_id IS NULL` /
  `tenant_id = ?` を切り替える。
- **rotation**: 新しい `key_version` を発行しても旧バージョンの行は削除せず `status` を切り替えるのみ
  (既存 `salary`/`idp_secret` と同じ rotation 契約を踏襲)。DMDB-T15 TC-5 で確認済み (P06/P07)。
- **deletion**: `tenant_data_objects` 削除時に DEK 自体は削除しない (同一テナントの他オブジェクトが同じ
  `key_version` を共有するため)。DEK のライフサイクルはオブジェクト単位ではなく purpose+tenant 単位。

## 2. R2 バケット/prefix 新設が PackageRegistry/backups に影響しないことの確認

`apps/hub/wrangler.jsonc` の `r2_buckets` は 3 バケットとも binding・bucket_name の両方が完全に分離
されている。

| binding | bucket_name | 用途 |
| --- | --- | --- |
| `PACKAGES_BUCKET` | `harness-hub-packages` | PackageRegistry (既存、feat-publish-pipeline 所有) |
| `BACKUPS_BUCKET` | `harness-hub-backups` | 日次バックアップ (既存) |
| `TENANT_DATA_BUCKET` | `harness-hub-tenant-data` | 本 feature が新設 |

`TENANT_DATA_BUCKET` は新規バケットであり、既存 2 バケットの key 空間・binding 名のいずれとも重複しない
(AD-3)。R2 使用量監視 (`apps/hub/src/lib/scheduled/usage-monitor.ts`、P06 で実装) も
`TENANT_DATA_BUCKET`/`PACKAGES_BUCKET` を個別に `measureR2StorageBytes()` へ渡し、指標
(`r2_tenant_data` / `r2_packages`) を分けて評価しているため、新設バケットの使用量が既存
PackageRegistry の閾値判定へ混入することもない。`BACKUPS_BUCKET` は使用量監視の対象外 (infrastructure-spec
の対象範囲外) のままで変更していない。

| 確認事項 | 証跡 |
| --- | --- |
| 3 バケットの binding/bucket_name が重複しない | `apps/hub/wrangler.jsonc` 目視確認 (上表) |
| 新設バケット追加後も既存 `check-worker-secrets.mjs`/build が影響を受けない | P06 実行結果 (`test-run-results.md`) の全ゲート PASS |
| R2 使用量監視が指標をバケット別に分離している | `apps/hub/tests/scheduled/usage-monitor.test.ts` (「R2 ストレージが 90% を超えたら critical 通知をバケット別に送出する」テストが `r2_tenant_data` の kind のみを送出、`PACKAGES_BUCKET` 側は閾値未満のため送出しないことを確認) |

## 3. tombstone manifest の同一 transaction/workflow 更新

`packages/db/schema/tenant-data/tombstones.ts` に `tenant_data_tombstones` テーブルを定義し、
`packages/db/migrations/0006_tenant-data-retention.sql` に同じ tenant-data の封筒暗号化拡張とともに作成する。`packages/db/repository/
tenant-data.ts` の `deleteTenantDataObject` が R2 blob 削除・DB row 削除・tombstone 行挿入を同一
呼び出し内で実行する。日次 export は `allTables` から Studio 拡張を含めて出力し、
`packages/db/backup/tenant-data-tombstones.ts` が削除後 artifact から manifest を抽出する。古い snapshot
の restore はその manifest を重ね、削除済み object 参照を除去する (DMDB-T16 TC-8)。

## 4. 本 task で変更したファイル

本 task (P08) は既存実装 (P05/P06 で完了済み) の移行手順・非破壊性を確認する文書化作業であり、
コード変更は発生していない。

| ファイル | 内容 |
| --- | --- |
| `docs/features/feat-tenant-data-retention/refactoring-migration-note.md` | 新規 (本ファイル) |

`packages/db/migrations/` への新規追加は無し (0006 は P05 で作成済み)。
