// T6: 大量パターンとページング境界 (test-design.md §3.6)。
//
// 境界値 (100 / 10) はテストに書き写さない。実コードの定数定義を読み取って照合する (§5 の C3)。
// 書き写すと、実コードが変わったときにテストが古い値を守り続けてしまう。
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { sql } from 'drizzle-orm';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../../connection/turso';
import { asCore, createLibsqlTestDb } from '../support/test-db';
import { loadPendingModule, REPO_ROOT } from './support/pending-module';

/** ADR §5.2 の下限。区切りの有無に依らず 50 件以上を要求する。 */
const MIN_BULK_COUNT = 50;

interface DisplayBoundary {
  limit: number;
  sourcePath: string;
  constantName: string;
}
interface BulkCount {
  key: string;
  table: string;
  count: number;
  boundary: string | null;
}

/** 定義ファイルが指し示す場所から `const <名前> = <数値>` を読み取る。 */
function readConstant(sourcePath: string, constantName: string): number {
  const source = readFileSync(path.join(REPO_ROOT, sourcePath), 'utf8');
  const matched = source.match(new RegExp(`const\\s+${constantName}\\s*=\\s*(\\d+)`));
  if (matched === null) {
    throw new Error(`${sourcePath} に const ${constantName} = <数値> が見つからない`);
  }
  return Number(matched[1]);
}

/** 件数が表示区切りを跨ぐか。limit 件ちょうどまでは 1 画面に収まる。 */
function crossesBoundary(count: number, limit: number): boolean {
  return count > limit;
}

let boundaries: Record<string, DisplayBoundary>;
let bulkCounts: BulkCount[];
let seedDemoCoverage: (options: { adapter: unknown }) => Promise<unknown>;

beforeAll(async () => {
  const loaded = await loadPendingModule<{ DISPLAY_BOUNDARIES: typeof boundaries }>(
    'scripts/demo-coverage/boundaries.ts',
    ['DISPLAY_BOUNDARIES'],
  );
  boundaries = loaded.DISPLAY_BOUNDARIES;
  const fixtures = await loadPendingModule<{ BULK_COUNTS: BulkCount[] }>('scripts/demo-coverage/fixtures.ts', [
    'BULK_COUNTS',
  ]);
  bulkCounts = fixtures.BULK_COUNTS;
  const seed = await loadPendingModule<{ seedDemoCoverage: typeof seedDemoCoverage }>('scripts/demo-coverage/seed.ts', [
    'seedDemoCoverage',
  ]);
  seedDemoCoverage = seed.seedDemoCoverage;
});

describe('T6: 境界値と件数 (定義)', () => {
  it('T6-1: 宣言した境界値が実コードの定数と一致する', () => {
    expect(Object.keys(boundaries).length).toBeGreaterThan(0);
    const mismatches: string[] = [];
    for (const [key, boundary] of Object.entries(boundaries)) {
      const actual = readConstant(boundary.sourcePath, boundary.constantName);
      if (actual !== boundary.limit) {
        mismatches.push(`${key}: 宣言 ${boundary.limit} / 実コード ${actual} (${boundary.sourcePath})`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('T6-2: 件数が ADR §5.2 の規則を満たす', () => {
    const violations: string[] = [];
    for (const entry of bulkCounts) {
      if (entry.count < MIN_BULK_COUNT) {
        violations.push(`${entry.key}: ${entry.count} 件 (最小 ${MIN_BULK_COUNT})`);
      }
      if (entry.boundary === null) continue;
      const boundary = boundaries[entry.boundary];
      if (boundary === undefined) {
        violations.push(`${entry.key}: 未知の境界 ${entry.boundary}`);
        continue;
      }
      if (!crossesBoundary(entry.count, boundary.limit)) {
        violations.push(`${entry.key}: ${entry.count} 件では境界 ${boundary.limit} を跨がない`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('T6-3: /builds 対象の件数がカーソルページング境界を超える', () => {
    const entries = bulkCounts.filter((entry) => entry.boundary === 'buildsPage');
    expect(entries.length).toBeGreaterThan(0);
    // 境界の欠落を暗黙の undefined で素通りさせず、読み取れなかったこと自体を失敗として出す。
    const boundary = boundaries.buildsPage;
    if (boundary === undefined) {
      throw new Error('buildsPage の境界を実コードから読み取れませんでした');
    }
    const limit = boundary.limit;
    for (const entry of entries) {
      expect(entry.count).toBeGreaterThan(limit);
    }
  });

  it('T6-4: 境界の前後 3 点で跨ぎ判定が 跨がない / 跨がない / 跨ぐ となる', () => {
    for (const [key, boundary] of Object.entries(boundaries)) {
      const limit = boundary.limit;
      expect(
        [crossesBoundary(limit - 1, limit), crossesBoundary(limit, limit), crossesBoundary(limit + 1, limit)],
        key,
      ).toEqual([false, false, true]);
    }
  });
});

describe('T6: 投入後の実件数', () => {
  let adapter: TursoAdapter;

  beforeEach(async () => {
    adapter = await createLibsqlTestDb();
  });
  afterEach(() => adapter.close());

  it('T6-5: 投入後の実レコード数が宣言値以上である', async () => {
    await seedDemoCoverage({ adapter: asCore(adapter) });
    const shortfalls: string[] = [];
    for (const entry of bulkCounts) {
      const row = await adapter.client.get<{ n: number }>(
        sql`SELECT COUNT(*) AS n FROM ${sql.identifier(entry.table)}`,
      );
      const actual = Number(row?.n ?? 0);
      // 同じテーブルへ複数の大量パターンが載ることがあるため、一致ではなく下限で見る。
      if (actual < entry.count) {
        shortfalls.push(`${entry.key} (${entry.table}): 実 ${actual} 件 / 宣言 ${entry.count} 件`);
      }
    }
    expect(shortfalls).toEqual([]);
  });
});
