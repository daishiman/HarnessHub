// DMDB-T03: テナント分離 (D4 / security-spec §8.4)。CI 必須ゲート。
// スキーマ駆動: barrel の coreTables から tenant_id 保有テーブルを実行時に列挙し、
// fixture が未追随の新テーブルや未宣言の非スコープテーブルを fail-closed で検出する。

import { eq, getTableColumns } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createScopedCrud } from '../repository/crud';
import { projects } from '../schema/core/catalog';
import { coreTables, TENANT_SCOPE_EXEMPT } from '../schema/index';
import { EntityNotFoundError } from '../src/errors';
import { seedTwoTenants, type TwoTenantsFixture } from './fixtures/two-tenants';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

let adapter: TursoAdapter;
let fixture: TwoTenantsFixture;

function tenantColumn(table: SQLiteTable): SQLiteColumn | undefined {
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  return Object.values(columns).find((c) => c.name === 'tenant_id');
}

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
  fixture = await seedTwoTenants(asCore(adapter), testCipher(asCore(adapter)));
}, 30_000);

afterAll(() => adapter.close());

describe('DMDB-T03 tenant isolation (schema-driven)', () => {
  it('tenant_id を持たないテーブルは TENANT_SCOPE_EXEMPT の宣言と完全一致する', () => {
    const undeclared: string[] = [];
    const staleDeclarations: string[] = [];
    for (const [name, table] of Object.entries(coreTables)) {
      const hasTenantId = tenantColumn(table) !== undefined;
      const declared = name in TENANT_SCOPE_EXEMPT;
      if (!hasTenantId && !declared) undeclared.push(name);
      if (hasTenantId && declared) staleDeclarations.push(name);
    }
    // 新テーブルが未宣言で tenant_id を欠く / 宣言が実スキーマと食い違う → fail-closed
    expect(undeclared).toStrictEqual([]);
    expect(staleDeclarations).toStrictEqual([]);
  });

  it('全 tenant-scoped テーブルに両テナントの fixture 行が存在する (網羅の担保)', async () => {
    for (const [name, table] of Object.entries(coreTables)) {
      const column = tenantColumn(table);
      if (column === undefined) continue;
      for (const tenantId of [fixture.a.tenantId, fixture.b.tenantId]) {
        const rows = (await adapter.client.select().from(table).where(eq(column, tenantId))) as unknown[];
        expect(rows.length, `${name} に tenant ${tenantId} の fixture 行が無い`).toBeGreaterThan(0);
      }
    }
  });

  it('tenant A のスコープから B の行が 1 件も返らない (全 tenant-scoped テーブル)', async () => {
    for (const [name, table] of Object.entries(coreTables)) {
      const column = tenantColumn(table);
      if (column === undefined) continue;
      const rows = (await adapter.client.select().from(table).where(eq(column, fixture.a.tenantId))) as Record<
        string,
        unknown
      >[];
      for (const row of rows) {
        expect(row.tenantId, `${name} の A スコープ読取に他 tenant の行が混入`).toBe(fixture.a.tenantId);
      }
    }
  });

  it('A のコンテキストから B のリソースへ update/delete が到達しない', async () => {
    const repo = createScopedCrud(asCore(adapter), projects);

    // read: B の project は A のコンテキストでは見えない
    expect(await repo.findById(fixture.a.context, fixture.b.projectId)).toBeNull();

    // update: 到達せず EntityNotFoundError
    await expect(repo.updateById(fixture.a.context, fixture.b.projectId, { name: 'hijacked' })).rejects.toThrow(
      EntityNotFoundError,
    );

    // delete: no-op (B 側から見ると行は残る)
    await repo.deleteById(fixture.a.context, fixture.b.projectId);
    const stillThere = await repo.findById(fixture.b.context, fixture.b.projectId);
    expect(stillThere).not.toBeNull();
  });
});
