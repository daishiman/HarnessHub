---
status: confirmed
layer: feature-design
task: SYS-TENANT-DATA-RETENTION-P04
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: docs/features/feat-tenant-data-retention/architecture-decision-record.md
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: [arch-harness-hub-security]
---

# feat-tenant-data-retention テストファースト設計

> **位置づけ**: P04 (テストファースト設計) の成果物。P02 (architecture-decision-record.md、P03 是正反映済み) で確定した設計を根拠に、goal-spec acceptance 3 件と quality_constraints 6 件全てへ対応する実行可能テスト ID を確定する。P05 (実装) の実装対象と P06 (テスト実行) の実行対象は本文書が一意に定める (Trace rule)。

## 1. テスト ID 体系

本 feature は既存の 2 つの ID 体系にテストを追加する。新規体系は作らない。

- `security-spec.md` §8.3/§8.4 のテスト ID (`T-#`): 脅威対策の検証項目。既存 `T-4`(暗号化)・`T-5`(鍵ローテーション)・§8.4(テナント分離) を tenant_data 向けに**拡張**し、削除完全性のみ新規 `T-15` を採番する (P02 AD-6 で確定済み)。
- `packages/db/__tests__/` の内部 suite ID (`DMDB-T##`): 実行ファイル単位の識別子。既存最大は `DMDB-T14` (`releases-repo.test.ts` 系列)。本 task は `DMDB-T15`・`DMDB-T16` を新規採番する。

新規 ID の対応表:

| DMDB suite ID | ファイル (予定) | 対応する security-spec test ID |
|---|---|---|
| DMDB-T15 | `packages/db/__tests__/tenant-data-encryption.test.ts` | T-4 拡張・T-5 拡張 |
| DMDB-T16 | `packages/db/__tests__/tenant-data-deletion.test.ts` | T-15 (新規) |

テナント分離 (§8.4) は `packages/db/__tests__/tenant-isolation.test.ts` が `allTables` から `tenant_id` 列を持つ全テーブルをスキーマ駆動で自動列挙する実装になっており、P05/P08 で `tenant_data_objects` テーブルへ `tenant_id` 列を追加し `TENANT_SCOPE_EXEMPT` へ加えない限り、**新規テストコード不要で既存 T-3/§8.4 ゲートが自動的に対象化する**。本文書ではこの自動網羅を前提に、R2 prefix 分離という tenant_data 固有の追加観点のみ DMDB-T15 側へケースを足す。

## 2. Acceptance 3 件 → テストケース対応表

| # | Acceptance (逐語) | 対応テスト |
|---|---|---|
| 1 | テナント A の業務データがテナント B のいかなる authz role からも取得不可であること (テナント分離テストが PASS) | §8.4 テナント分離テスト (スキーマ駆動・自動拡張) + DMDB-T15 内の R2 prefix 分離ケース (TC-1) |
| 2 | 削除 API 実行後、R2 blob・DB row・backup 断面のいずれにも当該データの平文/暗号文が残存しないこと (削除完全性テストが PASS) | T-15 / DMDB-T16 (TC-6〜TC-9) |
| 3 | 保管された業務データが R2 上で平文として存在せず、テナント別 DEK で封筒暗号化されていること (暗号化検証テストが PASS) | T-4 拡張・T-5 拡張 / DMDB-T15 (TC-2〜TC-5) |

## 3. quality_constraints 6 件 → テストケース対応表

| id (requirements-baseline.md §5 準拠) | 対応テスト |
|---|---|
| c4-revision-tenant-data-retention-qa045-048-appr007 | §8.4 (スキーマ駆動自動拡張) + DMDB-T16 TC-6 (`tenant_data_objects` の実体不保持=DB は R2 参照+メタデータのみである列制約テスト) |
| tenant-data-envelope-encryption-numeric-contract | DMDB-T15 TC-2〜TC-5 (UNIQUE(tenant_id,purpose,key_version)・tenant/purpose ごと active=1・rotation) |
| immediate-full-deletion-r2-db-backup-contract | DMDB-T16 TC-6〜TC-9 |
| tenant-cross-boundary-read-prevention-t14-r2-prefix | DMDB-T15 TC-1 (R2 prefix 分離) + §8.4 |
| r2-usage-monitoring-alert-cron-extension | R2-USAGE-1〜R2-USAGE-3 (apps/hub 側、P05 で実装対象確定・stub は本 task の write scope 外のため P05 が新設する) |
| tenant-data-api-endpoint-detail-deferred-to-p02 | API-1〜API-5 (apps/hub 側 route ハンドラ、P05 で実装対象確定) |

## 4. テストケース詳細

### 4.1 DMDB-T15: tenant_data 封筒暗号化 (T-4 拡張・T-5 拡張)

`packages/db/__tests__/encryption.test.ts` (DMDB-T11) と同一の `ColumnCipher` round-trip パターンを、`purpose='tenant_data'` かつ `tenant_id` 付き DEK へ適用する。

| TC | 内容 | 検証観点 |
|---|---|---|
| TC-1 | 2 テナント (A/B) それぞれ upload → R2 key が `tenant/{tenant_id}/{workspace_id}/{kind}/{tenant_data_objects.id}` prefix で分離されること | AD-3 (行単位一意 R2 key) |
| TC-2 | テナント A と B が同一 `purpose=tenant_data` でも異なる DEK (`key_version` 単位) を持つこと | UNIQUE(tenant_id, purpose, key_version) |
| TC-3 | テナント A の DEK でテナント B の暗号文を復号しようとすると `EncryptionError` で失敗すること (cross-tenant unwrap 拒否) | AD-1 是正 C2 (tenant_id フィルタ必須) |
| TC-4 | AAD 材料に `tenant_id` を含めた場合とテナント違いの `tenant_id` を与えた場合とで復号結果が異なること (AAD 不一致検証) | AD-1 是正 C1 (`${purpose}:${tenantId}:v${keyVersion}`) |
| TC-5 | rotation 実行後、旧 `key_version` の既存暗号文が新 KEK 適用後も復号できること (T-5 パターンの tenant_data 版) | AD-1 rotation |
| TC-1 (既存 IV 検証流用) | 同一テナント内で同一平文を複数回 upload しても IV が毎回異なること | 既存 DMDB-T11 パターン踏襲、tenant_data purpose で再実施 |

既存 `packages/db/__tests__/encryption.test.ts` の `purpose が異なれば DEK も異なる` ケースパターンを、`tenant_id` 軸へ追加する形で再利用する。

### 4.2 DMDB-T16: tenant_data 削除完全性 (T-15 新規)

`security-spec.md` §1.3 T15 (削除不完全) の対策検証。4 点確認 (R2 実体・DB 行・backup tombstone・cache) を行う。

| TC | 内容 | 検証観点 |
|---|---|---|
| TC-6 | 削除 API 実行後、対象 `tenant_data_objects` 行が DB から即時に存在しないこと (soft delete 列を経由しないこと) | immediate-full-deletion 契約 |
| TC-7 | 削除 API 実行後、対応する R2 blob が存在しないこと (行単位で一意な key のため他行に影響しないことも同時確認) | AD-3 是正後の行単位 key 設計 |
| TC-8 | 削除対象を含む日次 export 由来の backup snapshot から restore しても、tombstone manifest 適用後は当該データが復元されないこと (暗号文も含め非復元) | AD-6 是正 (backup tombstone 同一 transaction/workflow) |
| TC-9 | 削除操作が `audit_events` へ 1 件記録され、soft delete 用の追加列を schema に持たないこと | immediate-full-deletion 契約 (監査 event のみ残す) |

### 4.3 API-1〜API-5: tenant_data API 契約テスト (apps/hub 側、P05 実装対象)

AD-4 (P02) で確定した 5 エンドポイントの境界値・異常系テスト。実装ファイルは P05 が確定するため、本 task では ID とケース概要のみ固定する。

| ID | エンドポイント | ケース概要 |
|---|---|---|
| API-1 | `POST /api/v1/tenant-data/objects` | multipart upload の zod スキーマ違反 (`.strict()`) が 400、rate limit (20 req/min) 超過が 429 |
| API-2 | `GET /api/v1/tenant-data/objects` | 自テナント分のみ一覧に含まれること (rate limit 120 req/min) |
| API-3 | `GET /api/v1/tenant-data/objects/:id` | 他テナントの `:id` 指定が 404 (T-12 存在秘匿パターン踏襲、403 を返さない)、rate limit 120 req/min |
| API-4 | `GET /api/v1/tenant-data/objects/:id/content` | 認可 MW 通過後にのみ復号されること、rate limit 60 req/min |
| API-5 | `DELETE /api/v1/tenant-data/objects/:id` | 削除実行が DMDB-T16 の TC-6〜TC-9 と整合すること、rate limit 20 req/min |

CI-5 (zod `.strict()`)・CI-9 (`withAuthz()` 経由必須) は既存の CI 禁止検査をそのまま適用し、本 feature 専用の新規 CI 番号は追加しない。

### 4.4 R2-USAGE-1〜R2-USAGE-3: R2 使用量監視アラートテスト (apps/hub 側、P05 実装対象)

既存 Turso 使用量監視 cron (`apps/hub/src/lib/scheduled/usage-monitor.ts`、日次 15:00 JST) への統合方式 (AD-5) の動作確認。

| ID | ケース概要 |
|---|---|
| R2-USAGE-1 | 既存 cron dispatch 一覧へ R2 監視ステップが②の直後に実登録されていること (dispatch registration 確認、モック cron trigger で全 4 ステップの呼出順序を検証) |
| R2-USAGE-2 | R2 使用量が 70% 到達時にアプリ内 admin 通知が送出されること (Turso 監視と同一閾値・同一通知経路) |
| R2-USAGE-3 | R2 使用量が 90% 到達時に保持期間導入の R4-reopen 起票を促す通知が送出されること |

## 5. 既存テストへの影響確認

- `packages/db/__tests__/encryption.test.ts` (DMDB-T11): `purpose` enum への `tenant_data` 追加後も、既存 `salary`/`idp_secret` の round-trip・IV・AAD・rotation ケースが無改修で PASS し続けること (migration 後方互換、AD §8 の P08 引き継ぎ要件)
- `packages/db/__tests__/tenant-isolation.test.ts` (DMDB-T03): `tenant_data_objects` テーブル追加後、`TENANT_SCOPE_EXEMPT` へ加えていないことをこのテスト自身が検出する (未追随なら自動 fail)

## 6. スタブ配置方針

本 task (P04) の write scope は `docs/features/feat-tenant-data-retention/test-design.md` と `packages/db` 配下のテストスタブに限定される (published task spec 記載の write scope)。ただし task spec が挙げる `packages/db/src/__tests__/tenant-data/` は本リポジトリの実レイアウト (`packages/db/__tests__/` フラット構成、`src/` prefix なし) と一致しないため、既存規約 (`packages/db/__tests__/*.test.ts` フラット・`DMDB-T##` 命名) に合わせて解決する。API-1〜API-5・R2-USAGE-1〜R2-USAGE-3 (apps/hub 側) は write scope 外のため、P05 が実装ファイルと同時にテストファイルを新設する。

`packages/db/__tests__/tenant-data-encryption.test.ts` と `packages/db/__tests__/tenant-data-deletion.test.ts` は、P05 が対象実装 (`encryption_keys` migration・`tenant-deks.ts`・`tenant-data-tombstones.ts`) を用意するまで `it.skip` で本文書の TC-1〜TC-9 をスタブ化する。

## 7. 転記元と検証

- 転記元: `docs/features/feat-tenant-data-retention/architecture-decision-record.md` (P02、P03 是正反映済み)、`docs/security-spec-assurance.md` §8.3/§8.4
- 本文書の受入条件 (P04 acceptance): acceptance 3 件と quality_constraints 6 件の全てに対応するテスト ID が本文書に記載され、`packages/db/__tests__/` にスタブが作成されていること
