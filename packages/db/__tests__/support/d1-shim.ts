// D1Database 構造互換 shim (DMDB-T01)。
// `node:sqlite` (実 SQLite エンジン) を裏に持ち、drizzle-orm/d1 driver が生成する SQL を
// 実エンジンで実行することで SQLite 方言互換 (D2) を検証する。D1 本体は CI から接続できない。

import type { DatabaseSync } from 'node:sqlite';
import type { D1DatabaseLike, D1PreparedStatementLike, D1ResultLike } from '../../connection/d1';

type SqlValue = null | number | bigint | string | Uint8Array;

function normalizeParam(value: unknown): SqlValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value as SqlValue;
}

class ShimStatement implements D1PreparedStatementLike {
  private params: SqlValue[] = [];

  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatementLike {
    this.params = values.map(normalizeParam);
    return this;
  }

  private isQuery(): boolean {
    return /^\s*(select|with|pragma)/i.test(this.sql) || /returning/i.test(this.sql);
  }

  run(): Promise<D1ResultLike> {
    const stmt = this.db.prepare(this.sql);
    if (this.isQuery()) {
      const results = stmt.all(...this.params) as unknown[];
      return Promise.resolve({ results, success: true, meta: {} });
    }
    const info = stmt.run(...this.params);
    return Promise.resolve({
      results: [],
      success: true,
      meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) },
    });
  }

  all(): Promise<D1ResultLike> {
    const stmt = this.db.prepare(this.sql);
    if (!this.isQuery()) {
      const info = stmt.run(...this.params);
      return Promise.resolve({
        results: [],
        success: true,
        meta: { changes: Number(info.changes) },
      });
    }
    const results = stmt.all(...this.params) as unknown[];
    return Promise.resolve({ results, success: true, meta: {} });
  }

  raw(): Promise<unknown[][]> {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.all(...this.params) as Record<string, unknown>[];
    return Promise.resolve(rows.map((row) => Object.values(row)));
  }

  first(colName?: string): Promise<unknown> {
    const stmt = this.db.prepare(this.sql);
    const row = (stmt.all(...this.params) as Record<string, unknown>[])[0];
    if (row === undefined) return Promise.resolve(null);
    return Promise.resolve(colName === undefined ? row : row[colName]);
  }
}

export function createD1Shim(db: DatabaseSync): D1DatabaseLike {
  return {
    prepare(sql: string): D1PreparedStatementLike {
      return new ShimStatement(db, sql);
    },
    async batch(statements: D1PreparedStatementLike[]): Promise<D1ResultLike[]> {
      const results: D1ResultLike[] = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    },
  };
}
