// DDL 適用ヘルパ。restore drill が「空 DB へ schema 適用 → 復元」を行うための最小ユーティリティ。
// 文の生成は行わない (P06 は schema harness、P08 以降は canonical migration が供給する)。

import { sql } from 'drizzle-orm';
import type { CoreAdapter } from '../repository/db';

export async function applyDdlStatements(adapter: CoreAdapter, statements: readonly string[]): Promise<void> {
  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed.length === 0) continue;
    await adapter.client.run(sql.raw(trimmed));
  }
}

/** drizzle-kit が生成する migration SQL を statement 単位へ分割する。 */
export function splitMigrationSql(migrationSql: string): string[] {
  return migrationSql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
