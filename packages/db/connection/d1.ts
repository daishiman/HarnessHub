// Cloudflare D1 接続ファクトリ — hedge 経路 (D2)。
// workers-types への hard 依存を避けるため、drizzle-orm/d1 が実際に呼ぶ表面だけを構造型で受ける。
// D1 には interactive transaction が無いため TransactionalAdapter は返さない —
// 原子性が要る操作は「単一 SQL 文の原子性 + UNIQUE 制約 + 再試行」で両 driver 共通に成立させる (ADR §3/§7)。

import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1';
import * as schema from '../schema/index';
import type { DatabaseAdapter } from '../src/adapter';

export type CoreSchema = typeof schema;
export type D1Database = DrizzleD1Database<CoreSchema>;

/** drizzle-orm/d1 の session が呼ぶ prepared statement 表面 (bind/run/all/raw/first)。 */
export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  run(): Promise<D1ResultLike>;
  all(): Promise<D1ResultLike>;
  raw(options?: { columnNames?: boolean }): Promise<unknown[][]>;
  first(colName?: string): Promise<unknown>;
}

export interface D1ResultLike {
  readonly results: unknown[];
  readonly success: boolean;
  readonly meta?: Record<string, unknown>;
}

/** D1Database の構造互換型。実バインディング (Workers) とテスト shim の双方が満たす。 */
export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<D1ResultLike[]>;
}

export type D1Adapter = DatabaseAdapter<CoreSchema, D1Database>;

/** D1 接続を生成する。スキーマは常に barrel (schema/index.ts) を束ねる。 */
export function createD1Client(binding: D1DatabaseLike): D1Adapter {
  const db = drizzle(binding as Parameters<typeof drizzle>[0], { schema }) as D1Database;
  return { driver: 'd1', schema, client: db };
}
