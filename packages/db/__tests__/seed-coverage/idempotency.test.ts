// T3: 冪等性と決定論 (test-design.md §3.3)。
//
// 「2 回実行しても同じ状態になる」は、実装の自己申告ではなくテスト側で算出した
// ダイジェストの一致で判定する (§5 の C4)。
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../../connection/turso';
import { asCore, createLibsqlTestDb } from '../support/test-db';
import { countAllTables, digestDatabase } from './support/db-digest';
import { loadPendingModule } from './support/pending-module';

/** ADR §3.2 R2: Crockford Base32 の 26 文字。ULID と同じ字面にする。 */
const CROCKFORD_BASE32_26 = /^[0-9A-HJKMNP-TV-Z]{26}$/;

interface SeedSummary {
  counts: Record<string, number>;
}

let seedId: (logicalKey: string) => string;
let logicalKeys: readonly string[];
let seedDemoCoverage: (options: { adapter: unknown }) => Promise<SeedSummary>;

beforeAll(async () => {
  const id = await loadPendingModule<{ seedId: typeof seedId }>('scripts/demo-coverage/seed-id.ts', ['seedId']);
  seedId = id.seedId;
  const fixtures = await loadPendingModule<{ LOGICAL_KEYS: readonly string[] }>('scripts/demo-coverage/fixtures.ts', [
    'LOGICAL_KEYS',
  ]);
  logicalKeys = fixtures.LOGICAL_KEYS;
  const seed = await loadPendingModule<{ seedDemoCoverage: typeof seedDemoCoverage }>('scripts/demo-coverage/seed.ts', [
    'seedDemoCoverage',
  ]);
  seedDemoCoverage = seed.seedDemoCoverage;
});

describe('T3: 決定論 ID (実行なし)', () => {
  it('T3-3: 同じ論理キーが同じ ID を返し、Crockford Base32 26 文字である', () => {
    const violations: string[] = [];
    for (const logicalKey of logicalKeys) {
      const first = seedId(logicalKey);
      const second = seedId(logicalKey);
      if (first !== second) {
        violations.push(`${logicalKey}: ${first} != ${second}`);
      }
      if (!CROCKFORD_BASE32_26.test(first)) {
        violations.push(`${logicalKey}: 字面が不正 (${first})`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('T3-4: 論理キーが重複せず、導出 ID も衝突しない', () => {
    // 論理キー自体の重複は衝突ではないので先に分ける。両者を混ぜると原因が読めない。
    expect(new Set(logicalKeys).size).toBe(logicalKeys.length);

    const byId = new Map<string, string[]>();
    for (const logicalKey of logicalKeys) {
      const id = seedId(logicalKey);
      byId.set(id, [...(byId.get(id) ?? []), logicalKey]);
    }
    const collisions = [...byId.entries()]
      .filter(([, keys]) => keys.length > 1)
      .map(([id, keys]) => `${id}: ${keys.join(' / ')}`);
    expect(collisions).toEqual([]);
  });
});

describe('T3: 冪等性 (2 回実行)', () => {
  let adapter: TursoAdapter;

  beforeEach(async () => {
    adapter = await createLibsqlTestDb();
  });
  afterEach(() => adapter.close());

  it('T3-1: 2 回実行後の全テーブルのダイジェストが 1 回目と一致する', async () => {
    await seedDemoCoverage({ adapter: asCore(adapter) });
    const firstDigest = await digestDatabase(adapter);
    const firstCount = await countAllTables(adapter);

    await seedDemoCoverage({ adapter: asCore(adapter) });
    const secondDigest = await digestDatabase(adapter);
    const secondCount = await countAllTables(adapter);

    // 件数を先に見る。ダイジェスト不一致だけでは「増えたのか変わったのか」が読めない。
    expect(secondCount).toEqual(firstCount);
    expect(secondDigest).toEqual(firstDigest);
  });

  it('T3-2: 2 回目の SeedSummary の件数が 1 回目と一致する', async () => {
    const first = await seedDemoCoverage({ adapter: asCore(adapter) });
    const second = await seedDemoCoverage({ adapter: asCore(adapter) });
    expect(second.counts).toEqual(first.counts);
  });

  it('T3-5: 投入された時刻列が実行時刻に依存しない', async () => {
    await seedDemoCoverage({ adapter: asCore(adapter) });
    const firstDigest = await digestDatabase(adapter);

    // 実行時刻を跨がせる。Date.now() 由来の値が混ざっていれば、この待ちでダイジェストが動く。
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const other = await createLibsqlTestDb();
    try {
      await seedDemoCoverage({ adapter: asCore(other) });
      expect(await digestDatabase(other)).toEqual(firstDigest);
    } finally {
      await other.close();
    }
  });
});
