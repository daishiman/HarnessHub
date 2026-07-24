// DMDB-T01: 同一スキーマに対する libSQL / D1 双方の接続で CRUD が成功する (acceptance A1 / D2 ヘッジ)。

import { type CoreAdapter, createScopedCrud, createTenantsRepo, createUsersRepo } from '@harness-hub/db/repository';
import { workspaces } from '@harness-hub/db/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { createRepositoryContext } from '../src/context';
import { asCore, createD1TestDb, createLibsqlTestDb, testCipher } from './support/test-db';

async function exerciseCrud(adapter: CoreAdapter): Promise<void> {
  const tenants = createTenantsRepo(adapter);
  const tenant = await tenants.create({ slug: 'crud-tenant', name: 'CRUD', plan: 'free' });
  const context = createRepositoryContext({ tenantId: tenant.id });

  // create / read / update / delete — 汎用 scoped CRUD 経由
  const repo = createScopedCrud(adapter, workspaces);
  const created = await repo.insert(context, { slug: 'ws-1', name: 'Workspace 1' });
  expect(created.tenantId).toBe(tenant.id);

  const found = await repo.findById(context, created.id as string);
  expect(found?.name).toBe('Workspace 1');

  const updated = await repo.updateById(context, created.id as string, { name: 'Workspace 1b' });
  expect(updated.name).toBe('Workspace 1b');

  await repo.deleteById(context, created.id as string);
  expect(await repo.findById(context, created.id as string)).toBeNull();

  // 暗号化列を含む users も両 driver で動作する
  const users = createUsersRepo(adapter, testCipher(adapter));
  const user = await users.insert(context, {
    idpSubject: 'subject-1',
    email: 'user@example.com',
    name: 'User',
    salary: 5_000_000,
    role: 'member',
    status: 'active',
  });
  expect(user.salary).not.toContain('5000000');
  expect(await users.decryptSalary(context, user.id)).toBe(5_000_000);

  // tenants 側の update / delete
  const renamed = await tenants.update(tenant.id, { name: 'CRUD2' });
  expect(renamed.name).toBe('CRUD2');
}

describe('DMDB-T01 dialect compatibility', () => {
  const closers: Array<() => void> = [];
  afterEach(() => {
    for (const close of closers.splice(0)) close();
  });

  it('libSQL (Turso primary) 接続で CRUD が成功する', async () => {
    const adapter = await createLibsqlTestDb();
    closers.push(() => adapter.close());
    await exerciseCrud(asCore(adapter));
  });

  it('D1 (hedge) 接続で同一スキーマ・同一リポジトリ関数の CRUD が成功する', async () => {
    const { adapter, raw } = await createD1TestDb();
    closers.push(() => raw.close());
    await exerciseCrud(asCore(adapter));
  });
});
