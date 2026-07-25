// tenant-scoped 汎用 CRUD ファクトリ (D4 row-level scope)。
// 全操作が RepositoryContext を第 1 引数に取り、WHERE tenant_id を強制注入する (security-spec §3.6)。
// tenant を受け取らないリポジトリ関数を作らない。

import { and, eq, getTableColumns, getTableName } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

/** immutable 契約 (I3/S-D6) のテーブルは汎用 update/delete を持たせない。 */
const GENERIC_CRUD_FORBIDDEN = new Set(['releases', 'audit_events']);

export interface ScopedCrudRepo {
  insert(context: RepositoryContext, values: Record<string, unknown>): Promise<Record<string, unknown>>;
  findById(context: RepositoryContext, id: string): Promise<Record<string, unknown> | null>;
  list(context: RepositoryContext, options?: { readonly limit?: number }): Promise<Record<string, unknown>[]>;
  updateById(context: RepositoryContext, id: string, values: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteById(context: RepositoryContext, id: string): Promise<void>;
}

/**
 * `id` PK + `tenant_id` NOT NULL を持つテーブル向けの汎用 CRUD。
 * id と created_at は常にサーバ側で発行し、入力値は無視する (qa-032: クライアント申告時刻を保存しない)。
 */
export function createScopedCrud(adapter: CoreAdapter, table: SQLiteTable): ScopedCrudRepo {
  const tableName = getTableName(table);
  if (GENERIC_CRUD_FORBIDDEN.has(tableName)) {
    throw new RepositoryError(
      'invalid-context',
      `${tableName} は immutable 契約のため汎用 CRUD を生成できません (専用リポジトリを使うこと)`,
    );
  }
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  const entryByDbName = (dbName: string): [string, SQLiteColumn] | undefined =>
    Object.entries(columns).find(([, c]) => c.name === dbName);

  const idEntry = entryByDbName('id');
  const tenantEntry = entryByDbName('tenant_id');
  if (idEntry === undefined || tenantEntry === undefined) {
    throw new RepositoryError(
      'invalid-context',
      `${tableName} は id/tenant_id を持たないため汎用 scoped CRUD の対象外です`,
    );
  }
  const [idKey, idCol] = idEntry;
  const [tenantKey, tenantCol] = tenantEntry;
  const createdAtEntry = entryByDbName('created_at');

  const scopeWhere = (context: RepositoryContext, id?: string) =>
    id === undefined ? eq(tenantCol, context.tenantId) : and(eq(tenantCol, context.tenantId), eq(idCol, id));

  return {
    async insert(context, values) {
      const row: Record<string, unknown> = { ...values };
      row[idKey] = newUlid();
      row[tenantKey] = context.tenantId;
      if (createdAtEntry !== undefined) row[createdAtEntry[0]] = serverNow();
      const inserted = await adapter.client.insert(table).values(row).returning();
      return (inserted as Record<string, unknown>[])[0] as Record<string, unknown>;
    },

    async findById(context, id) {
      const rows = await adapter.client.select().from(table).where(scopeWhere(context, id)).limit(1);
      return (rows as Record<string, unknown>[])[0] ?? null;
    },

    async list(context, options) {
      const rows = await adapter.client
        .select()
        .from(table)
        .where(scopeWhere(context))
        .limit(options?.limit ?? 100);
      return rows as Record<string, unknown>[];
    },

    async updateById(context, id, values) {
      const patch: Record<string, unknown> = { ...values };
      delete patch[idKey];
      delete patch[tenantKey];
      if (createdAtEntry !== undefined) delete patch[createdAtEntry[0]];
      if (Object.keys(patch).length === 0) {
        throw new RepositoryError('invalid-context', '更新対象の列がありません');
      }
      const rows = await adapter.client.update(table).set(patch).where(scopeWhere(context, id)).returning();
      const updated = (rows as Record<string, unknown>[])[0];
      if (updated === undefined) throw new EntityNotFoundError(tableName, id);
      return updated;
    },

    async deleteById(context, id) {
      await adapter.client.delete(table).where(scopeWhere(context, id));
    },
  };
}
