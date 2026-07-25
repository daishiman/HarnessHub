// DMDB-T04: ULID PK とサーバ時刻 (qa-032)。クライアント申告の id/created_at が無視されることを含む。

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createScopedCrud } from '../repository/crud';
import { createTenantsRepo } from '../repository/tenants';
import { isUlid, newUlid, ULID_PATTERN } from '../repository/ulid';
import { createUsersRepo } from '../repository/users';
import { workspaces } from '../schema/core/identity';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

let adapter: TursoAdapter;
let context: RepositoryContext;

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
  const tenant = await createTenantsRepo(asCore(adapter)).create({ slug: 'ulid', name: 'U', plan: 'free' });
  context = createRepositoryContext({ tenantId: tenant.id });
});

afterAll(() => adapter.close());

describe('DMDB-T04 ULID / epoch server time', () => {
  it('ULID が 26 文字 Crockford Base32 で時系列単調', () => {
    const ids = Array.from({ length: 1000 }, () => newUlid());
    for (const id of ids) expect(id).toMatch(ULID_PATTERN);
    const sorted = [...ids].sort();
    expect(sorted).toStrictEqual(ids); // 生成順 = 辞書順 (時系列ソート可)
    expect(new Set(ids).size).toBe(ids.length); // 衝突なし
  });

  it('PK はサーバ側で ULID として発行され、クライアント指定の id は無視される', async () => {
    const repo = createScopedCrud(asCore(adapter), workspaces);
    const row = await repo.insert(context, { id: 'client-supplied-id', slug: 'w1', name: 'W1' });
    expect(row.id).not.toBe('client-supplied-id');
    expect(isUlid(row.id)).toBe(true);
  });

  it('created_at はサーバ時刻の epoch ms で、クライアント申告時刻は保存されない (SEC5)', async () => {
    const repo = createScopedCrud(asCore(adapter), workspaces);
    const before = Date.now();
    const row = await repo.insert(context, { createdAt: 12345, slug: 'w2', name: 'W2' });
    const after = Date.now();
    expect(row.createdAt).not.toBe(12345);
    expect(typeof row.createdAt).toBe('number');
    expect(row.createdAt as number).toBeGreaterThanOrEqual(before);
    expect(row.createdAt as number).toBeLessThanOrEqual(after);

    const users = createUsersRepo(asCore(adapter), testCipher(asCore(adapter)));
    const user = await users.insert(context, {
      idpSubject: 'server-owned-last-login',
      email: 'server-owned@example.com',
      name: 'Server Owned',
      role: 'member',
      status: 'active',
    });
    const loginBefore = Date.now();
    const loggedIn = await users.markLastLogin(context, user.id);
    const loginAfter = Date.now();
    expect(loggedIn.lastLoginAt).toBeGreaterThanOrEqual(loginBefore);
    expect(loggedIn.lastLoginAt).toBeLessThanOrEqual(loginAfter);
  });

  it('update で created_at を書き換えられない', async () => {
    const repo = createScopedCrud(asCore(adapter), workspaces);
    const row = await repo.insert(context, { slug: 'w3', name: 'W3' });
    const updated = await repo.updateById(context, row.id as string, {
      name: 'W3b',
      createdAt: 1,
    });
    expect(updated.createdAt).toBe(row.createdAt);
  });
});
