// 日次 export ライブラリ (qa-019 / ADR §9)。
// 成果物は決定論的 JSONL (テーブル名順 → PK 順)。exported_at 以外は同一 DB 状態から同一バイト列になる。
// 暗号化列 (users.salary / idp_connections.client_secret_enc) は暗号文のまま転写する —
// 復号処理を export 経路に置かないことで、平文が断面に存在しえない構造にする (§4.2)。

import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig, type SQLiteColumn, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { canonicalJson } from '../repository/bytes';
import type { CoreAdapter } from '../repository/db';
import { coreTables } from '../schema/index';

export const EXPORT_FORMAT = 'harness-hub-control-plane-export';
export const EXPORT_FORMAT_VERSION = 1;

export interface ExportHeader {
  readonly type: 'header';
  readonly format: typeof EXPORT_FORMAT;
  readonly format_version: number;
  readonly exported_at: number;
  readonly tables: Readonly<Record<string, number>>;
}

/** PK の TS プロパティ名を求める (行の決定論的順序付けに使う)。 */
function pkKeys(table: SQLiteTable): string[] {
  const config = getTableConfig(table);
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  const byDbName = new Map(Object.entries(columns).map(([key, col]) => [col.name, key]));
  const composite = config.primaryKeys[0];
  const dbNames =
    composite !== undefined
      ? composite.columns.map((c) => c.name)
      : config.columns.filter((c) => c.primary).map((c) => c.name);
  return dbNames.map((n) => byDbName.get(n) as string);
}

function compareByKeys(keys: readonly string[]) {
  return (a: Record<string, unknown>, b: Record<string, unknown>): number => {
    for (const key of keys) {
      const av = String(a[key] ?? '');
      const bv = String(b[key] ?? '');
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  };
}

/** control-plane DB 全体を JSONL 文字列へ export する。 */
export async function exportControlPlane(adapter: CoreAdapter): Promise<string> {
  const tableNames = Object.keys(coreTables).sort();
  const counts: Record<string, number> = {};
  const rowLines: string[] = [];

  for (const name of tableNames) {
    const table = coreTables[name] as SQLiteTable;
    const rows = (await adapter.client.select().from(table)) as Record<string, unknown>[];
    rows.sort(compareByKeys(pkKeys(table)));
    counts[name] = rows.length;
    for (const row of rows) {
      rowLines.push(canonicalJson({ type: 'row', table: name, data: row }));
    }
  }

  const header: ExportHeader = {
    type: 'header',
    format: EXPORT_FORMAT,
    format_version: EXPORT_FORMAT_VERSION,
    exported_at: Date.now(),
    tables: counts,
  };
  return [canonicalJson(header), ...rowLines].join('\n');
}

export interface ParsedArtifact {
  readonly header: ExportHeader;
  readonly rowsByTable: ReadonlyMap<string, Record<string, unknown>[]>;
}

/** JSONL artifact を検証つきで parse する。形式不正は即エラー (fail-closed)。 */
export function parseExportArtifact(artifact: string): ParsedArtifact {
  const lines = artifact.split('\n').filter((line) => line.trim().length > 0);
  const headerLine = lines[0];
  if (headerLine === undefined) throw new Error('export artifact が空です');
  const header = JSON.parse(headerLine) as ExportHeader;
  if (header.type !== 'header' || header.format !== EXPORT_FORMAT) {
    throw new Error('export artifact の header が不正です');
  }
  if (header.format_version !== EXPORT_FORMAT_VERSION) {
    throw new Error(`未対応の format_version: ${header.format_version}`);
  }
  if (!Number.isSafeInteger(header.exported_at) || header.exported_at < 0) {
    throw new Error('export artifact の exported_at が不正です');
  }
  if (header.tables === null || typeof header.tables !== 'object' || Array.isArray(header.tables)) {
    throw new Error('export artifact の tables が不正です');
  }

  const expectedTables = Object.keys(coreTables).sort();
  const actualTables = Object.keys(header.tables).sort();
  if (
    expectedTables.length !== actualTables.length ||
    expectedTables.some((tableName, index) => tableName !== actualTables[index])
  ) {
    throw new Error(
      `export artifact のテーブル集合が不正です (expected=${expectedTables.join(',')} actual=${actualTables.join(',')})`,
    );
  }
  for (const tableName of expectedTables) {
    const count = header.tables[tableName];
    if (!Number.isSafeInteger(count) || (count as number) < 0) {
      throw new Error(`export artifact の行数が不正です (table=${tableName})`);
    }
  }

  const rowsByTable = new Map<string, Record<string, unknown>[]>();
  for (const line of lines.slice(1)) {
    const parsed = JSON.parse(line) as { type: string; table: string; data: Record<string, unknown> };
    if (parsed.type !== 'row') throw new Error(`不正な行 type: ${parsed.type}`);
    if (!Object.hasOwn(header.tables, parsed.table)) {
      throw new Error(`未知のテーブル: ${parsed.table}`);
    }
    if (parsed.data === null || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      throw new Error(`不正な行 data (table=${parsed.table})`);
    }
    const bucket = rowsByTable.get(parsed.table) ?? [];
    bucket.push(parsed.data);
    rowsByTable.set(parsed.table, bucket);
  }
  for (const tableName of expectedTables) {
    const expected = header.tables[tableName] as number;
    const actual = rowsByTable.get(tableName)?.length ?? 0;
    if (actual !== expected) {
      throw new Error(`行数不一致: ${tableName} expected=${expected} actual=${actual}`);
    }
  }
  return { header, rowsByTable };
}

/** テーブル名 → drizzle table の解決 (restore が使う)。未知テーブルは fail-closed。 */
export function resolveTable(name: string): SQLiteTable {
  const table = coreTables[name];
  if (table === undefined) throw new Error(`未知のテーブル: ${name}`);
  return table;
}

export { getTableName };
