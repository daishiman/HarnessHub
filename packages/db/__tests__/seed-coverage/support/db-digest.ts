// DB 状態のダイジェストをテスト側で独立に算出するヘルパ (test-design.md §3.3・§5 の C4)。
//
// 実装が返す自己申告のダイジェストは使わない。実装が壊れたときに自己申告も同時に壊れると、
// 2 回の実行で「同じ壊れ方」をした結果が一致してしまい、冪等性の検査が素通りする。

import { createHash } from 'node:crypto';

import { getTableColumns, getTableName, is, sql } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { TursoAdapter } from '../../../connection/turso';
import * as schema from '../../../schema/index';

/** schema が定義する全テーブル名。カラム名は列挙順に依存しないよう昇順で固定する。 */
export function schemaTables(): { table: string; columns: string[] }[] {
  const tables: { table: string; columns: string[] }[] = [];
  for (const exported of Object.values(schema)) {
    if (!is(exported, SQLiteTable)) continue;
    tables.push({
      table: getTableName(exported),
      columns: Object.values(getTableColumns(exported))
        .map((column) => column.name)
        .sort(),
    });
  }
  return tables.sort((a, b) => a.table.localeCompare(b.table));
}

/**
 * 全テーブルの内容をテーブル名 → SHA-256 の対応へ写す。
 * 行の並びは SQLite の返却順に依存しないよう、正規化した行文字列を昇順に並べてから畳み込む。
 */
export async function digestDatabase(adapter: TursoAdapter): Promise<Record<string, string>> {
  const digests: Record<string, string> = {};
  for (const { table, columns } of schemaTables()) {
    const rows = await adapter.client.all<Record<string, unknown>>(sql`SELECT * FROM ${sql.identifier(table)}`);
    // 区切りには本文へ現れない制御文字を使う。区切りなしで連結すると
    // ("ab" + "c") と ("a" + "bc") が同じ文字列へ潰れ、異なる状態が同じダイジェストになる。
    const canonical = rows
      .map((row) => columns.map((column) => `${column}=${String(row[column] ?? '')}`).join('\u0001'))
      .sort();
    digests[table] = createHash('sha256').update(canonical.join('\u0002')).digest('hex');
  }
  return digests;
}

/** テーブルごとの行数。ダイジェスト不一致時に「どこが違うか」を読めるようにするための補助。 */
export async function countAllTables(adapter: TursoAdapter): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const { table } of schemaTables()) {
    const row = await adapter.client.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM ${sql.identifier(table)}`);
    counts[table] = Number(row?.n ?? 0);
  }
  return counts;
}
