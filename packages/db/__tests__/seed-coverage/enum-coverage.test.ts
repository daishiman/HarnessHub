// T2: ドメイン enum 全値の網羅 (test-design.md §3.2)。
//
// schema の enum は `enum: ['a','b']` のリテラルと `enum: BUILD_STAGES` の定数参照が混在するため、
// ソースの静的 grep では 40 カラム中 19 しか拾えない。drizzle の実行時 API で読むこと。
import { getTableColumns, getTableName, is, sql } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../../connection/turso';
import * as schema from '../../schema/index';
import { asCore, createLibsqlTestDb } from '../support/test-db';
import { loadPendingModule } from './support/pending-module';

/** ADR §10 の実測値。 */
const EXPECTED_ENUM_COLUMNS = 40;
const EXPECTED_ENUM_VALUES = 129;

interface EnumColumn {
  table: string;
  column: string;
  values: readonly string[];
}

/** schema から enum カラムを実測する。実装側の宣言に依存しない独立の出所。 */
function measureSchemaEnums(): EnumColumn[] {
  const measured: EnumColumn[] = [];
  for (const exported of Object.values(schema)) {
    if (!is(exported, SQLiteTable)) continue;
    const tableName = getTableName(exported);
    for (const column of Object.values(getTableColumns(exported))) {
      const values = (column as { enumValues?: readonly string[] }).enumValues;
      if (!Array.isArray(values) || values.length === 0) continue;
      measured.push({ table: tableName, column: column.name, values });
    }
  }
  return measured;
}

function key(entry: { table: string; column: string }): string {
  return `${entry.table}.${entry.column}`;
}

/**
 * enum カラムの値ごとの行数を数える。
 * adapter.client は生の libSQL client ではなく drizzle インスタンスであるため、
 * `execute({sql, args})` ではなく `sql` テンプレート + `get/all` を使う (connection/turso.ts)。
 * テーブル名・カラム名は値としてバインドできないので sql.identifier で識別子として埋める。
 */
async function countRows(adapter: TursoAdapter, table: string, column: string, value: string): Promise<number> {
  const row = await adapter.client.get<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${value}`,
  );
  return Number(row?.n ?? 0);
}

/** 状態値ごとの行数をまとめて数える。テーブル名は schema から取り、テスト側に書き写さない (C3)。 */
async function countByStatus(adapter: TursoAdapter, table: string, column: string): Promise<Record<string, number>> {
  const rows = await adapter.client.all<{ value: string; n: number }>(
    sql`SELECT ${sql.identifier(column)} AS value, COUNT(*) AS n FROM ${sql.identifier(table)} GROUP BY ${sql.identifier(column)}`,
  );
  return Object.fromEntries(rows.map((row) => [String(row.value), Number(row.n)]));
}

let declared: EnumColumn[];
let seedDemoCoverage: (options: { adapter: unknown }) => Promise<unknown>;

beforeAll(async () => {
  const enums = await loadPendingModule<{ DOMAIN_ENUMS: EnumColumn[] }>('scripts/demo-coverage/enums.ts', [
    'DOMAIN_ENUMS',
  ]);
  declared = enums.DOMAIN_ENUMS;
  const seed = await loadPendingModule<{ seedDemoCoverage: typeof seedDemoCoverage }>('scripts/demo-coverage/seed.ts', [
    'seedDemoCoverage',
  ]);
  seedDemoCoverage = seed.seedDemoCoverage;
});

describe('T2: enum 全値網羅 (定義)', () => {
  it('T2-1: 宣言が 40 カラム / 129 値である', () => {
    expect(declared).toHaveLength(EXPECTED_ENUM_COLUMNS);
    expect(declared.reduce((total, entry) => total + entry.values.length, 0)).toBe(EXPECTED_ENUM_VALUES);
  });

  it('T2-1: schema の実測も 40 カラム / 129 値である (ADR §10 の前提が今も成り立つ)', () => {
    const measured = measureSchemaEnums();
    expect(measured).toHaveLength(EXPECTED_ENUM_COLUMNS);
    expect(measured.reduce((total, entry) => total + entry.values.length, 0)).toBe(EXPECTED_ENUM_VALUES);
  });

  it('T2-2: 宣言の値集合が schema の実定義と一致する', () => {
    const measured = new Map(measureSchemaEnums().map((entry) => [key(entry), [...entry.values].sort()]));
    const mismatches: string[] = [];
    for (const entry of declared) {
      const actual = measured.get(key(entry));
      if (actual === undefined) {
        mismatches.push(`${key(entry)}: schema に存在しない`);
        continue;
      }
      const expectedValues = [...entry.values].sort();
      if (JSON.stringify(actual) !== JSON.stringify(expectedValues)) {
        mismatches.push(`${key(entry)}: schema=${actual.join('/')} 宣言=${expectedValues.join('/')}`);
      }
      measured.delete(key(entry));
    }
    for (const remaining of measured.keys()) {
      mismatches.push(`${remaining}: schema にあるが宣言に無い`);
    }
    expect(mismatches).toEqual([]);
  });
});

describe('T2: enum 全値網羅 (投入後)', () => {
  let adapter: TursoAdapter;

  beforeEach(async () => {
    adapter = await createLibsqlTestDb();
  });
  afterEach(() => adapter.close());

  it('T2-3: 各 enum 値が seed 後の DB に 1 行以上存在する', async () => {
    await seedDemoCoverage({ adapter: asCore(adapter) });
    const missing: string[] = [];
    for (const entry of declared) {
      for (const value of entry.values) {
        if ((await countRows(adapter, entry.table, entry.column, value)) === 0) {
          missing.push(`${key(entry)}=${value}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('T2-4: サインイン経路と衝突する enum 値が別行として投入される (ADR §10.1)', async () => {
    await seedDemoCoverage({ adapter: asCore(adapter) });

    // 主テナントは active のまま残り、停止状態は別テナント行として存在する。
    const tenantCounts = await countByStatus(adapter, getTableName(schema.tenants), 'status');
    expect(tenantCounts.active).toBeGreaterThanOrEqual(1);
    expect(tenantCounts.suspended).toBeGreaterThanOrEqual(1);

    // サインインに使う利用者は active のまま、非活性は別行。
    const userCounts = await countByStatus(adapter, getTableName(schema.users), 'status');
    expect(userCounts.active).toBeGreaterThanOrEqual(1);
    expect(userCounts.inactive).toBeGreaterThanOrEqual(1);

    // 認証連携も同様に、有効な行と disabled の行が併存する。
    const connectionCounts = await countByStatus(adapter, getTableName(schema.idpConnections), 'credential_status');
    expect(connectionCounts.active).toBeGreaterThanOrEqual(1);
    expect(connectionCounts.disabled).toBeGreaterThanOrEqual(1);
  });
});
