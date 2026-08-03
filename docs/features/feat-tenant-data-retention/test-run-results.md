---
status: pass
layer: feature-test-evidence
task: SYS-TENANT-DATA-RETENTION-P06
feature_package_id: feature-package/feat-tenant-data-retention
source: docs/features/feat-tenant-data-retention/implementation-notes.md
source_digest: sha256:7e3a0438c372fe8a0974be74189b243d468f0327476281422e59d48c1db126e8
executed_at: 2026-08-03
---

# feat-tenant-data-retention テスト実行報告

## 結論

test-design.md (P04) が定義した API-1〜API-5 の route 契約テストを新規に 20 件追加し、全て pass。
既存テストへの回帰は 0 件だが、実行の過程で P05 実装が見落としていた 2 件の不具合
(既存 real-db harness の migration 未追従、`EXPECTED_MATRIX` の新規 action 未登録) を発見し、
本フェーズのスコープとして修正した。加えて型チェックで 1 件 (`exactOptionalPropertyTypes` 違反)、
カスタム品質ゲートで 1 件 (テスト説明文への認可判定語彙の混入) を検出・修正済み。

さらに、P05 時点では前提 (既存 Turso 監視 cron) が実在せず見送っていた AD-5 (R2/Turso 使用量監視) を
本フェーズで実装し、通知の閾値判定・cron 統合・R2 使用量監視アラートテストまで実施した
(通知の永続化は別途通知基盤 feature のスコープとする。詳細は下記「R2/Turso 使用量監視 (AD-5) の結果」参照)。

## API-1〜API-5 の結果

| ID | 判定 | 主なテスト (`apps/hub/tests/tenant-data/routes.test.ts`) |
|---|---|---|
| API-1 (upload) | pass | 201 契約・workspaceId 不一致 400・file 無し 400・kind enum 外 422・rate limit 429・member 許可 |
| API-2 (list) | pass | 自テナント分のみ返す・workspaceId 不一致 400・rate limit 429 |
| API-3 (detail) | pass | 自テナント 200・他テナント 404 (存在秘匿)・存在しない id 404・rate limit 429 |
| API-4 (content) | pass | 認可 MW 通過後の復号済み本体 200・他テナント 404・rate limit 429 |
| API-5 (delete) | pass | 削除後に一覧・取得から消える 204・member 拒否 403・存在しない id 404・rate limit 429 |

## R2/Turso 使用量監視 (AD-5) の結果

`apps/hub/src/lib/scheduled/usage-monitor.ts` を新規実装し、`apps/hub/src/worker/cron.ts` の
`turso-usage-monitor` スロット (これまで未実装スタブ `pendingJob('turso-usage-monitor')` だった) を
実ジョブへ差し替えた。テストは `apps/hub/tests/scheduled/usage-monitor.test.ts` に 13 件。

| 検証観点 | 判定 | 内容 |
|---|---|---|
| 閾値判定 (`evaluateUsageRatio`) | pass | 70% 未満 ok・70%以上90%未満 warning・90%以上 critical・limit<=0 は ok (ゼロ割回避) |
| R2 ストレージ集計 (`measureR2StorageBytes`) | pass | `bucket.list()` のページングを辿って size を積算・空バケットは 0 |
| Turso Platform API 連携 (`fetchTursoUsage`) | pass | secret 未投入は null でスキップ・正常応答を rows_read/rows_written/storage_bytes へ写す・HTTP エラーは status のみを含む例外にする (接続情報を漏らさない) |
| cron 統合 (`createUsageMonitorJob`) | pass | 閾値未満は通知なし・R2 ストレージ 90% 超過でバケット別 critical 通知・Turso 読取行数 70% 超過で warning 通知・R2 binding 未設定環境ではその指標だけ静かにスキップ |

**実装スコープの絞り込み (ユーザー確認済み)**: 通知の DB 保存・admin 画面での一覧表示は別途通知基盤
feature のスコープとし、本フェーズでは `NotificationDispatcher` の `in_app` transport を Workers の
構造化ログ出力 (`console.log`) として最小実装した。閾値判定・cron 統合・R2/Turso 使用量取得自体は
ADR (AD-5) 通り実装している。判断根拠は `implementation-notes.md` の「追記 (P06 で AD-5 を実装)」を参照。

Turso Platform API 用の secret (`TURSO_API_TOKEN` / `TURSO_ORG_SLUG` / `TURSO_DATABASE_NAME`) は未投入
のため `scripts/ci/worker-secrets-registry.json` へ `requirement: "planned"` として登録した
(`wrangler.jsonc` の `secrets.required` へは未追加。実投入後に required へ移す)。

`apps/hub/src/shared/notification` (notification-dispatch 共通層) を app 本体から初めて呼び出したため、
`apps/hub/tests/shared-layers/contract.in-app-layers.test.ts` の `WIRED_IN_APP_LAYERS` と
`scripts/ci/shared-layer-registry.json` の `app_wiring` 宣言を実態に合わせて更新した (pending 解除)。

## 本フェーズで発見・修正した不具合

| 不具合 | 検出方法 | 修正内容 |
|---|---|---|
| `apps/hub/tests/auth-tenancy/support/real-db.ts` の `MIGRATIONS` に P05 で追加した `0005`/`0006` が未登録。`encryption_keys.tenant_id` が無く既存 real-db harness 4 ファイルが `no such column` で失敗 | apps/hub 全体 vitest 実行 | `MIGRATIONS` 配列へ 2 件追加。理由をコメントに明記 |
| `authz-decision-matrix.test.ts` の `EXPECTED_MATRIX` に `tenant-data.*` 5 action が未登録 (P05 で `rules.ts` に action を追加した際の記載漏れ) | `Object.keys(ACTION_RULES).sort()).toEqual(...)` の網羅性検証テスト失敗 | `EXPECTED_MATRIX` へ 5 行追加 (upload/list/read/read_content=MEMBER_UP、delete=ADMIN_UP) |
| `packages/db/__tests__/tenant-data-list.test.ts` が `cursor: value ?? undefined` を渡し `exactOptionalPropertyTypes: true` に違反 | `tsc --noEmit` (`packages/db`) | cursor が `null` のときはプロパティ自体を渡さない形へ書き換え |
| `apps/hub/tests/tenant-data/routes.test.ts` の `it()` 説明文に `minRole=...` という認可判定語彙が混入 | `check-single-authz-middleware.mjs` | 説明文から `minRole=...` 表記を削除・言い換え |
| `apps/hub/src/lib/scheduled/usage-monitor.ts` / `usage-monitor.test.ts` が `exactOptionalPropertyTypes: true` に違反 (未定義値を明示的にプロパティへ渡す形) | `tsc --noEmit` (`apps/hub`) | プロパティの有無自体を三項演算子で切り替える形へ書き換え (2 箇所) |

いずれも既存テストの pass/fail 自体を書き換える性質の修正ではなく、既存テストを正しく通す・見落としを埋める修正である。

## 実行結果

| コマンド | 結果 |
|---|---|
| `apps/hub` vitest (node --experimental-vm-modules 経由 vitest.mjs run) | 90 files / 1107 tests pass、skip 1 |
| `apps/hub/tests/tenant-data` (route 契約テスト) | 1 file / 20 tests pass |
| `apps/hub/tests/scheduled` + `tests/worker/cron.test.ts` (使用量監視 + cron 統合) | 2 files / 26 tests pass |
| `apps/hub/tests/shared-layers` (共通層契約) | pass (notification-dispatch 結線を反映) |
| `pnpm --filter @harness-hub/db test` | 35 files / 271 tests pass |
| `pnpm --filter @harness-hub/schemas test` | 6 files / 86 tests pass |
| `pnpm --filter @harness-hub/hub exec tsc --noEmit` | pass |
| `pnpm --filter @harness-hub/db exec tsc --noEmit` | pass |
| `pnpm --filter @harness-hub/schemas exec tsc --noEmit` | pass |
| `pnpm exec biome check` (変更ファイル) | pass |
| `pnpm --filter @harness-hub/hub build` | pass (`/api/v1/tenant-data/objects` 系 3 route を含め全 route 登録を確認) |
| `node apps/hub/scripts/check-single-authz-middleware.mjs` | pass (走査 276 ファイル / 違反 0 / route 例外 5 件が期待集合と一致) |
| `node packages/db/scripts/check-db-write-gate.mjs` | pass (26 ファイル / write 82 件、全て guardedWrite 経由) |
| `node scripts/ci/check-worker-secrets.mjs` | pass (台帳 16 件と wrangler.jsonc 宣言 10 件が一致) |
| `node scripts/ci/check-shared-layer-duplicates.mjs` | pass (共通層 12 件 + 運用機構 4 件、違反 0) |
| system plan validation | pass、violations 0 |

todo・skip は意図的な 1 件 (feat-tenant-data-retention とは無関係な既存 skip) を除き 0 件である。

## 再現コマンド

```bash
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/tenant-data
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/scheduled tests/worker/cron.test.ts tests/shared-layers
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
pnpm --filter @harness-hub/db test
pnpm --filter @harness-hub/schemas test
pnpm --filter @harness-hub/hub exec tsc --noEmit
pnpm --filter @harness-hub/db exec tsc --noEmit
pnpm --filter @harness-hub/schemas exec tsc --noEmit
pnpm --filter @harness-hub/hub build
node apps/hub/scripts/check-single-authz-middleware.mjs
node packages/db/scripts/check-db-write-gate.mjs
node scripts/ci/check-worker-secrets.mjs
node scripts/ci/check-shared-layer-duplicates.mjs
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-tenant-data-retention
```
