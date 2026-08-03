---
status: confirmed
layer: feature-quality
task: SYS-TENANT-DATA-RETENTION-P07
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: docs/features/feat-tenant-data-retention/test-run-results.md
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: [arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-infrastructure]
---

# feat-tenant-data-retention 受入記録

> **位置づけ**: P07 の成果物。[test-run-results.md](./test-run-results.md) (P06) の全 pass を前提に、goal-spec の acceptance 3 件を最終確認する。

確認日: 2026-08-03

## 1. acceptance 3 件の判定

### A1. テナント A の業務データがテナント B のいかなる authz role からも取得不可であること (テナント分離テストが PASS)

**判定: 満たす**

| 確認事項 | 証跡 |
|---|---|
| `tenant_id` 列を持つ全テーブルをスキーマ駆動で自動列挙し、テナント越境で 0 件になること | `packages/db/__tests__/tenant-isolation.test.ts` (4 tests pass)。`tenant_data_objects` 追加後も `TENANT_SCOPE_EXEMPT` へ加えていないことを自身が検出する設計 |
| 2 テナント (A/B) の R2 key が `tenant/{tenant_id}/{workspace_id}/{kind}/{tenant_data_objects.id}` prefix で分離されること | DMDB-T15 TC-1 (`tenant-data-encryption.test.ts` 内) |
| 他テナントの `:id` 指定 API が 404 を返す (403 で存在を示唆しない、T-12 存在秘匿パターン踏襲) | API-3/API-4 (`apps/hub/tests/tenant-data/routes.test.ts`) |

対応する quality_constraint: `tenant-cross-boundary-read-prevention-t14-r2-prefix`。

### A2. 削除 API 実行後、R2 blob・DB row・backup 断面のいずれにも当該データの平文/暗号文が残存しないこと (削除完全性テストが PASS)

**判定: 満たす**

| 確認事項 | 証跡 |
|---|---|
| 削除 API 実行後、対象行が DB から即時に存在しない (soft delete 列を経由しない) | DMDB-T16 TC-6 (`tenant-data-deletion.test.ts`、4 tests pass) |
| 対応する R2 blob が削除される (行単位一意 key のため他行へ影響しない) | DMDB-T16 TC-7 |
| 削除対象を含む backup snapshot から restore しても tombstone manifest 適用後は復元されない | DMDB-T16 TC-8 |
| 削除操作が `audit_events` へ 1 件記録される (soft delete 用の追加列を持たない) | DMDB-T16 TC-9 |
| API-5 (DELETE) が上記と整合し、削除後に一覧・取得から消える | `apps/hub/tests/tenant-data/routes.test.ts` API-5 |

対応する quality_constraint: `immediate-full-deletion-r2-db-backup-contract` + `c4-revision-tenant-data-retention-qa045-048-appr007`。

### A3. 保管された業務データが R2 上で平文として存在せず、テナント別 DEK で封筒暗号化されていること (暗号化検証テストが PASS)

**判定: 満たす**

| 確認事項 | 証跡 |
|---|---|
| テナント A/B が同一 `purpose=tenant_data` でも異なる DEK (`UNIQUE(tenant_id, purpose, key_version)`) を持つ | DMDB-T15 TC-2 (`tenant-data-encryption.test.ts`、6 tests pass) |
| テナント A の DEK でテナント B の暗号文を復号すると `EncryptionError` になる (cross-tenant unwrap 拒否) | DMDB-T15 TC-3 |
| AAD 材料の `tenant_id` 不一致で復号結果が異なる | DMDB-T15 TC-4 |
| rotation 実行後も旧 `key_version` の既存暗号文が新 KEK で復号できる | DMDB-T15 TC-5 |
| 同一平文でも upload ごとに IV が異なる | DMDB-T15 TC-1 (既存 IV 検証流用) |

対応する quality_constraint: `tenant-data-envelope-encryption-numeric-contract`。

## 2. quality_constraints 6 件との突き合わせ

| quality_constraint | 支える acceptance | 備考 |
|---|---|---|
| `c4-revision-tenant-data-retention-qa045-048-appr007` | A2 | DB は R2 参照+メタデータのみ保持する列制約 |
| `tenant-data-envelope-encryption-numeric-contract` | A3 | UNIQUE(tenant_id,purpose,key_version)・rotation |
| `immediate-full-deletion-r2-db-backup-contract` | A2 | R2 blob・DB row・backup tombstone を同一 transaction/workflow で更新 |
| `tenant-cross-boundary-read-prevention-t14-r2-prefix` | A1 | R2 prefix 分離 + テナント分離スキーマ駆動テスト |
| `r2-usage-monitoring-alert-cron-extension` | acceptance 3 件の直接対象外 (運用監視) | P06 で AD-5 実装完了。既存 Turso cron dispatch へ R2 monitor を実登録し、70%/90% 通知を確認済み (`usage-monitor.test.ts` 13 tests pass)。通知の永続化・一覧表示は別途通知基盤 feature のスコープ (`implementation-notes.md` 参照) |
| `tenant-data-api-endpoint-detail-deferred-to-p02` | A1/A2 の実行経路 | API-1〜API-5 (20 tests pass) が上記 acceptance の到達経路を保証する |

**未使用の constraint は無い**。`r2-usage-monitoring-alert-cron-extension` は goal-spec acceptance 3 件 (テナント分離・削除完全性・暗号化) の対象外だが、P07 acceptance の Normative closure 節 (「既存 Turso 使用量 cron dispatch へ R2 monitor を実登録する」) に該当し、P06 で実装・検証済みであることをここに記録する。

## 3. 受入判定

**acceptance 3 件すべて満たす。P08 (リファクタリング/マイグレーション) へ引き継ぐ。**

ただし本記録は**テスト環境での確認**であり、本番環境での smoke test は P13 の範囲である。P13 未実施の状態で「本番で動作する」ことは主張しない。また Turso Platform API の secret (`TURSO_API_TOKEN` 等) は `planned` (未投入) のままであり、Turso 側の使用量監視は実投入まで実行時にスキップされる (R2 側の使用量監視は `TENANT_DATA_BUCKET`/`PACKAGES_BUCKET` binding が既に存在するため即時有効)。
