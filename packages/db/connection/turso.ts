// Turso (libSQL) 接続ファクトリ — primary 経路 (D2)。
// 返す型は feat-hub-foundation が確立した adapter 境界 (src/adapter.ts) に従い、
// アプリ層は driver 差をこの境界の裏に隠したまま扱う。

import { type Client, createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '../schema/index';
import type { DatabaseAdapter, TransactionalAdapter } from '../src/adapter';

export type CoreSchema = typeof schema;
export type TursoDatabase = LibSQLDatabase<CoreSchema>;

export interface TursoEnv {
  /** `libsql://…` (Turso) または `file:…` / `:memory:` (ローカル/テスト・restore drill 用)。 */
  readonly url: string;
  readonly authToken?: string | undefined;
}

export interface TursoAdapter extends TransactionalAdapter<CoreSchema, TursoDatabase> {
  /** CLI・テストでファイルハンドルを解放するための明示 close。Workers 常駐時は呼ばない。 */
  close(): void;
}

/** libSQL 接続を生成する。スキーマは常に barrel (schema/index.ts) を束ねる。 */
export function createTursoClient(env: TursoEnv): TursoAdapter {
  const raw: Client = createClient(
    env.authToken === undefined ? { url: env.url } : { url: env.url, authToken: env.authToken },
  );
  const db = drizzle(raw, { schema });

  const adapter: TursoAdapter = {
    driver: 'turso',
    schema,
    client: db,
    async transaction<TResult>(
      run: (tx: DatabaseAdapter<CoreSchema, TursoDatabase>) => Promise<TResult>,
    ): Promise<TResult> {
      // 監査 append 等の read-modify-write を直列化するため immediate で begin する (ADR §7)。
      return db.transaction(async (tx) => run({ driver: 'turso', schema, client: tx as unknown as TursoDatabase }), {
        behavior: 'immediate',
      });
    },
    close(): void {
      raw.close();
    },
  };
  return adapter;
}
