// tenants リポジトリ — テナント境界のルート。tenant_id 列を持たない唯一のテーブル (行 = テナント)。
// アプリ層での呼出しは provider-admin 経路に限る (認可は単一 MW の責務)。

import { eq } from 'drizzle-orm';
import { tenants } from '../schema/core/identity';
import { EntityNotFoundError } from '../src/errors';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export interface TenantRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly plan: string;
  readonly status: 'active' | 'suspended';
  readonly createdAt: number;
}

export interface TenantsRepo {
  create(input: { readonly slug: string; readonly name: string; readonly plan: string }): Promise<TenantRow>;
  findById(id: string): Promise<TenantRow | null>;
  findBySlug(slug: string): Promise<TenantRow | null>;
  list(): Promise<TenantRow[]>;
  update(
    id: string,
    input: { readonly name?: string; readonly plan?: string; readonly status?: 'active' | 'suspended' },
  ): Promise<TenantRow>;
  deleteById(id: string): Promise<void>;
}

export function createTenantsRepo(adapter: CoreAdapter): TenantsRepo {
  return {
    async create(input) {
      const rows = await adapter.client
        .insert(tenants)
        .values({
          id: newUlid(),
          slug: input.slug,
          name: input.name,
          plan: input.plan,
          status: 'active',
          createdAt: serverNow(),
        })
        .returning();
      return rows[0] as TenantRow;
    },

    async findById(id) {
      const rows = await adapter.client.select().from(tenants).where(eq(tenants.id, id)).limit(1);
      return (rows[0] as TenantRow | undefined) ?? null;
    },

    async findBySlug(slug) {
      const rows = await adapter.client.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
      return (rows[0] as TenantRow | undefined) ?? null;
    },

    async list() {
      const rows = await adapter.client.select().from(tenants);
      return rows as TenantRow[];
    },

    async update(id, input) {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.plan !== undefined) patch.plan = input.plan;
      if (input.status !== undefined) patch.status = input.status;
      const rows = await adapter.client.update(tenants).set(patch).where(eq(tenants.id, id)).returning();
      const updated = rows[0] as TenantRow | undefined;
      if (updated === undefined) throw new EntityNotFoundError('tenants', id);
      return updated;
    },

    async deleteById(id) {
      await adapter.client.delete(tenants).where(eq(tenants.id, id));
    },
  };
}
