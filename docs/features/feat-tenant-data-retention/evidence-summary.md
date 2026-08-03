---
status: confirmed
layer: feature-quality
task: SYS-TENANT-DATA-RETENTION-P11
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: [docs/features/feat-tenant-data-retention/test-run-results.md, docs/features/feat-tenant-data-retention/acceptance-record.md, docs/features/feat-tenant-data-retention/quality-assurance-report.md, docs/features/feat-tenant-data-retention/final-review-record.md]
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: []
---

# feat-tenant-data-retention P11 再現可能な証跡

- graph_node_id: `SYS-TENANT-DATA-RETENTION-P11`
- feature_context_digest: `sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`
- 位置づけ: P06 (test-run-results.md) / P07 (acceptance-record.md) / P09 (quality-assurance-report.md) /
  P10 (final-review-record.md) の証跡を集約し、quality_constraints 6 件それぞれについて再現コマンド列と
  結果を一元化する。

## quality_constraints 6 件の再現コマンドと結果

### 1. `c4-revision-tenant-data-retention-qa045-048-appr007` (DB は R2 参照+メタデータのみ保持)

```bash
pnpm --filter @harness-hub/db test -- tenant-data-deletion
```
結果: 4 tests pass (DMDB-T16 TC-6〜TC-9)。

### 2. `tenant-data-envelope-encryption-numeric-contract` (テナント別 DEK・UNIQUE 制約・rotation)

```bash
pnpm --filter @harness-hub/db test -- tenant-data-encryption
```
結果: 6 tests pass (DMDB-T15 TC-1〜TC-5)。

### 3. `immediate-full-deletion-r2-db-backup-contract` (R2 blob・DB row・backup tombstone の同一 transaction 更新)

```bash
pnpm --filter @harness-hub/db test -- tenant-data-deletion
```
結果: 上記 1 と同一テストファイルに含まれる (TC-8 が backup restore 後の非復元を検証)。

### 4. `tenant-cross-boundary-read-prevention-t14-r2-prefix` (テナント分離・R2 prefix 分離・存在秘匿・認可 MW 通過後復号)

```bash
pnpm --filter @harness-hub/db test -- tenant-isolation
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/tenant-data
```
結果: tenant-isolation 4 tests pass、tenant-data routes 20 tests pass (API-1〜API-5)。

### 5. `r2-usage-monitoring-alert-cron-extension` (既存 Turso cron dispatch への R2 monitor 実登録・70/90% 通知)

```bash
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/scheduled tests/worker/cron.test.ts
```
結果: 26 tests pass (usage-monitor 13 tests + cron dispatch 統合確認)。

### 6. `tenant-data-api-endpoint-detail-deferred-to-p02` (API-1〜API-5 の route 契約)

```bash
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/tenant-data
```
結果: 上記 4 と同一 (20 tests pass)。

## 全体ゲートの再現コマンド (P06 実測、退行なきことを P09/P10 まで維持)

```bash
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
pnpm --filter @harness-hub/db test
pnpm --filter @harness-hub/schemas test
pnpm --filter @harness-hub/hub exec tsc --noEmit
pnpm --filter @harness-hub/db exec tsc --noEmit
pnpm --filter @harness-hub/schemas exec tsc --noEmit
pnpm exec biome check
pnpm --filter @harness-hub/hub build
node apps/hub/scripts/check-single-authz-middleware.mjs
node packages/db/scripts/check-db-write-gate.mjs
node scripts/ci/check-shared-layer-duplicates.mjs
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-tenant-data-retention
```

結果一覧 (`test-run-results.md` P06 実測値):

| コマンド | 結果 |
| --- | --- |
| apps/hub vitest 全体 | 90 files / 1107 tests pass |
| `pnpm --filter @harness-hub/db test` | 35 files / 271 tests pass |
| `pnpm --filter @harness-hub/schemas test` | 6 files / 86 tests pass |
| tsc --noEmit (hub/db/schemas) | 全 pass |
| biome check | pass |
| hub build | pass |
| check-single-authz-middleware.mjs | pass (違反 0) |
| check-db-write-gate.mjs | pass (write 82 件、全て guardedWrite 経由) |
| check-shared-layer-duplicates.mjs | pass (違反 0) |
| system plan validation | pass、violations 0 |

## feature context の scope_in/acceptance 全件の P11 責務追跡

`feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327` の
scope_in は本ファイル (`evidence-summary.md`) 1 件のみであり、P11 の acceptance 2 件 (quality_constraints
6 件の再現コマンド列記載、feature context 全 scope_in の追跡) は本ファイルの上記節でともに充足する。

**未割当項目: 0 件。**

## まとめ

quality_constraints 6 件全てについて、単体で再実行可能なコマンドと直近の実測結果を確認した。全体ゲート
コマンド列も含め、P12 (文書化・runbook・引き継ぎ) へそのまま引き継ぐ。
