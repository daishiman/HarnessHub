// P04 → P05 昇格版 (SYS-USER-ORG-ADMIN-P04 / P03 申し送り事項2)
// UOA-METRICS-*: 個別ダッシュボード (S17, AD-2) が読む metrics_rollups (dim=user) の consumer 契約。
//
// design-review-notes.md 指摘事項4: AD-2 の個別ダッシュボードは `metrics_rollups` (dim=user) の
// 読取りを前提としているが、owner は feat-metrics-tracking であり本 feature は算出しない。
// AD-4 (`tenant_coefficients`) と同型の cross-feature 依存である。
//
// 旧版は「実装がまだ無い」ことを固定する不在確認テストだった。feat-metrics-tracking の P05 実装が
// 着地したので、本ファイルは自身の docblock の指示どおり **実 port を消費する契約テスト**へ昇格した。
// ここで固定するのは 2 点:
//   1. `@harness-hub/db` の公開入口から dim=user の rollup を読む port が取れ、実 DB 往復で
//      テナント境界 (D4) を越えないこと。
//   2. 本 feature が rollup を **算出しない** こと (集計は feat-metrics-tracking の cron の責務)。
//      「読むだけ」の境界がコードで守られていることを走査で確かめる。

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDdlStatements,
  createMetricsTrackingRepository,
  createRepositoryContext,
  createTursoClient,
  splitMigrationSql,
} from '@harness-hub/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const DB_SCHEMA_DIR = path.join(REPO_ROOT, 'packages/db/schema');
const DB_REPOSITORY_DIR = path.join(REPO_ROOT, 'packages/db/repository');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'packages/db/migrations');
const USER_ORG_ADMIN_FEATURE_DIR = path.join(REPO_ROOT, 'apps/hub/src/features/user-org-admin');

/** ディレクトリ配下 (再帰) のファイル内に needle への言及があるか。無ければ空配列。 */
function findFilesContaining(dir: string, needle: string): string[] {
  if (!existsSync(dir)) return [];
  const hits: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...findFilesContaining(full, needle));
      continue;
    }
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
    const content = readFileSync(full, 'utf8');
    if (content.includes(needle)) hits.push(path.relative(REPO_ROOT, full));
  }
  return hits;
}

describe('契約: metrics_rollups の実装確認 (P03 指摘事項4 / cross-feature 依存)', () => {
  it('UOA-METRICS-001: packages/db/schema に metrics_rollups の定義が存在する', () => {
    expect(findFilesContaining(DB_SCHEMA_DIR, 'metrics_rollups').length).toBeGreaterThan(0);
  });

  it('UOA-METRICS-002: packages/db/repository に metrics_rollups を読む repository が存在する', () => {
    // repository 層は drizzle のテーブルシンボル (`metricsRollups`) 経由で参照するため、
    // DB 上の物理名ではなくシンボル名で走査する (物理名で探すと常に 0 件になり検査が空振りする)。
    expect(findFilesContaining(DB_REPOSITORY_DIR, 'metricsRollups').length).toBeGreaterThan(0);
  });

  it('UOA-METRICS-003 (Goodhart対策): 走査対象ディレクトリ自体は実在し、既存の別テーブル定義も検出できる', () => {
    expect(existsSync(DB_SCHEMA_DIR)).toBe(true);
    // tenant_coefficients (AD-4) が同じ走査ロジックで見つかることで、上の 2 件の「> 0」が
    // 走査の当たり判定そのものの緩さではないことを示す。
    expect(findFilesContaining(DB_SCHEMA_DIR, 'tenant_coefficients').length).toBeGreaterThan(0);
  });
});

describe('契約: 個別ダッシュボード (S17) の rollup 消費 port', () => {
  let tempDir: string;
  let adapter: ReturnType<typeof createTursoClient>;

  beforeEach(async () => {
    // `:memory:` は使わない (@libsql/client は transaction ごとに別接続を開くため
    // in-memory だと transaction 内からスキーマが見えない)。support/real-db.ts と同じ制約。
    tempDir = mkdtempSync(path.join(tmpdir(), 'hub-uoa-metrics-rollup-'));
    adapter = createTursoClient({ url: `file:${path.join(tempDir, 'test.db')}` });
    // metrics 系テーブルは 0008 で導入され、他 migration への依存 (FK) を持たないので単独で載せる。
    await applyDdlStatements(adapter, [
      'PRAGMA journal_mode=WAL',
      ...splitMigrationSql(
        readFileSync(path.join(MIGRATIONS_DIR, '0008_metrics-tracking-and-build-stage-events.sql'), 'utf8'),
      ),
    ]);
  });

  afterEach(() => {
    adapter.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('UOA-METRICS-101: 公開入口から dim=user の rollup を読み、自テナントの行だけが返る (AD-4 と同型: 消費のみ)', async () => {
    const repository = createMetricsTrackingRepository(adapter);
    const periodStart = Date.UTC(2026, 0, 5);
    const periodEnd = periodStart + 7 * 24 * 60 * 60 * 1000;

    for (const tenantId of ['tenant-alpha', 'tenant-beta']) {
      await repository.upsertRollups(createRepositoryContext({ tenantId }), [
        {
          workspaceId: `ws-${tenantId}`,
          period: 'weekly',
          dimension: 'user',
          dimensionKey: `user-${tenantId}`,
          periodStart,
          periodEnd,
          runCount: 4,
          savedMinutes: 60,
          savedAmount: 5_000,
        },
      ]);
    }

    const rows = await repository.listRollups(createRepositoryContext({ tenantId: 'tenant-alpha' }), {
      period: 'weekly',
      dimension: 'user',
      periodStart,
      periodEnd,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tenantId).toBe('tenant-alpha');
    expect(rows[0]?.dimensionKey).toBe('user-tenant-alpha');
    // 金額は cron が算出済みの値をそのまま持つ。個別ダッシュボードは再計算しない。
    expect(rows[0]?.savedAmount).toBe(5_000);
  });

  it('UOA-METRICS-102: 本 feature は rollup を算出せず読むだけである (集計処理を持ち込まない境界)', () => {
    // 集計の実装 (upsert / aggregate) が user-org-admin 側へ漏れていないことを走査で固定する。
    // 読取 (`listRollups`) は許可され、書込・集計 (`upsertRollups` / `aggregateMetricsRollup`) は禁止。
    expect(findFilesContaining(USER_ORG_ADMIN_FEATURE_DIR, 'upsertRollups')).toStrictEqual([]);
    expect(findFilesContaining(USER_ORG_ADMIN_FEATURE_DIR, 'aggregateMetricsRollup')).toStrictEqual([]);
  });
});
