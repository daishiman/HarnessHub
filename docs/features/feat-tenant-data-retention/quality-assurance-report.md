---
status: confirmed
layer: feature-design
task: SYS-TENANT-DATA-RETENTION-P09
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: [arch-harness-hub-security]
---

# feat-tenant-data-retention P09 品質保証レポート

- graph_node_id: `SYS-TENANT-DATA-RETENTION-P09`
- feature_context_digest: `sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`
- 判定: **T14/T15 の脅威対策・R2 使用量監視の運用確認・restore drill への確認項目追加、4 項目すべて確認済み**
- 実測日: **2026-08-03**

---

## 1. T14 (テナント越境読取防止) 確認結果

`security-spec-foundations.md` T14: 「テナント A のデータをテナント B の principal が (role に関わらず) 取得できる」

| 対策層 | 実装 | 検証 |
| --- | --- | --- |
| DB row-level | `tenant_data_objects` は全テーブル共通の `tenant_id` スキーマ駆動テストの対象 | `packages/db/__tests__/tenant-isolation.test.ts` — 4 tests pass。`TENANT_SCOPE_EXEMPT` へ未追加であることを自身が検出する設計のため、新規テーブル追加時の追随漏れが赤化する |
| 封筒暗号化 | `purpose='tenant_data'` の DEK が `UNIQUE(tenant_id, purpose, key_version)` でテナント別に分離 | `packages/db/__tests__/tenant-data-encryption.test.ts` — 6 tests pass (DMDB-T15 TC-2〜TC-5、cross-tenant unwrap 拒否・AAD 不一致検証を含む) |
| R2 prefix 分離 | R2 key が `tenant/{tenant_id}/{workspace_id}/{kind}/{id}` で行単位一意 | DMDB-T15 TC-1 |
| 認可 MW 通過後の復号 | `GET .../content` route は `withAuthz` 通過後にのみ `getContent()` を呼ぶ (先に復号してから認可判定する経路が無い) | `apps/hub/tests/tenant-data/routes.test.ts` API-4 |
| 存在秘匿 | 他テナントの `:id` 指定は 403 ではなく 404 (T-12 パターン踏襲、越境の事実自体を応答から推測させない) | API-3/API-4 |

**判定: 満たす。** 対策は DB・暗号化・R2 key・認可 MW の 4 層で独立に効いており、1 層の是正漏れが即全体崩壊にならない構成。

## 2. T15 (削除不完全対策) 確認結果

`security-spec-foundations.md` T15: 「削除不完全により、削除操作後も業務データが R2 実体・DB 行・バックアップ断面に残存する」

| 対策 | 実装 | 検証 |
| --- | --- | --- |
| 即時完全削除 (soft delete 不使用) | `tenant_data_objects` は soft delete 用の追加列を schema に持たず、削除 API は行を即時 DELETE する | DMDB-T16 TC-6 (`tenant-data-deletion.test.ts`) |
| R2 blob 削除 | 行単位一意 key のため、削除は他行の R2 blob に影響しない | DMDB-T16 TC-7 |
| 削除監査 event | 削除操作が `audit_events` へ 1 件記録される | DMDB-T16 TC-9 |
| backup 断面での非復元 | 日次 export の tombstone manifest (`tenant_data_tombstones`) を削除と同一呼び出し内で更新し、過去 backup から restore しても tombstone 適用後は復元されない | DMDB-T16 TC-8 |
| API 経路での整合 | `DELETE .../objects/:id` 実行後、一覧・取得の両方から即座に消える | `apps/hub/tests/tenant-data/routes.test.ts` API-5 |

**判定: 満たす。** `packages/db/__tests__/tenant-data-deletion.test.ts` (4 tests) が上記全経路を pass。

## 3. R2 使用量監視アラート運用確認

AD-5 (P06 で実装、P08 で R2 バケット分離の非破壊性を確認済み) の運用面の確認。

| 確認事項 | 結果 |
| --- | --- |
| 既存 Turso 使用量監視 cron dispatch へ R2 monitor が実登録されているか | `apps/hub/src/worker/cron.ts` の `DEFAULT_CRON_REGISTRY[DAILY_CRON]` の `turso-usage-monitor` スロットが `createUsageMonitorJob()` を返す (未実装スタブ `pendingJob` からの置き換え)。`apps/hub/tests/worker/cron.test.ts` のジョブ ID 列挙テストで確認 |
| R2 使用量 70%/90% で通知が送出されるか | `apps/hub/tests/scheduled/usage-monitor.test.ts` — R2 ストレージ 90% 超過で critical 通知、閾値未満は通知なしを確認 (13 tests pass) |
| PackageRegistry (`PACKAGES_BUCKET`) と業務データ (`TENANT_DATA_BUCKET`) の使用量が指標として分離されているか | 同テストで `kind` が `usage.r2_tenant_data_threshold` としてバケット別に送出されることを確認 (§2 参照) |
| 通知の到達経路 | `NotificationDispatcher` の `in_app` transport 経由。DB 保存・admin 画面一覧は別途通知基盤 feature のスコープ (Workers 構造化ログへの出力を最小実装として P06 で確定、`implementation-notes.md` 参照) |
| Turso Platform API secret の運用状態 | `TURSO_API_TOKEN`/`TURSO_ORG_SLUG`/`TURSO_DATABASE_NAME` は `scripts/ci/worker-secrets-registry.json` に `requirement: "planned"` として登録済み、未投入。実投入までは Turso 側 (rows_read/rows_written/storage_bytes) の監視はスキップされ、R2 側の監視のみ稼働する (binding は wrangler.jsonc に既存のため即時有効) |

**判定: 満たす。** ただし Turso Platform API token の実投入は本 feature のスコープ外の運用タスクとして残る (投入後は追加のコード変更なしで有効化される設計)。

## 4. 四半期 restore drill への削除済みデータ非復元確認項目追加

`infrastructure-spec.md` §10 の四半期 restore drill (「復元できないバックアップを成功と数えない」qa-019) は、
現状 salary / secret の暗号断面検査を主眼とする。本 feature が新設した `tenant_data_objects` /
`tenant_data_tombstones` についても、同じ drill の中で以下の確認項目を追加する必要があることをここに記録する。

| 追加確認項目 | 内容 | 技術的な裏付け |
| --- | --- | --- |
| 削除済みテナントデータの非復元確認 | drill で restore した一時 DB に対し、削除済み (tombstone 記録済み) の `tenant_data_objects` 行が復元されていないこと、および対応する R2 blob が存在しないことを確認する | DMDB-T16 TC-8 が単体テストレベルで同じ検証を実施済み (`tombstone manifest 適用後は当該データが復元されない`)。drill はこれを実データ・実 restore 手順で再確認する運用レイヤの確認 |

**write scope の注記**: `infrastructure-spec.md` §10 の restore drill runbook 本文の編集は本 task
(`resource_scope` に `docs/features/feat-tenant-data-retention/quality-assurance-report.md` のみを含み
`infrastructure-spec.md` は含まない) の write scope 外である。上記確認項目の追加は本レポートに記録し、
runbook 本体への反映は別途 follow-up として扱う。

## 5. 実行結果まとめ

| コマンド | 結果 |
| --- | --- |
| `pnpm --filter @harness-hub/db test -- tenant-isolation tenant-data-encryption tenant-data-deletion` | tenant-isolation 4 / tenant-data-encryption 6 / tenant-data-deletion 4、全 pass |
| `apps/hub` vitest (`tests/scheduled` + `tests/worker/cron.test.ts`) | 26 tests pass |
| `apps/hub` vitest (`tests/tenant-data`) | 20 tests pass |
| `pnpm --filter @harness-hub/db test` (全体) | 35 files / 271 tests pass |

再現コマンドは `test-run-results.md` (P06) を参照。
