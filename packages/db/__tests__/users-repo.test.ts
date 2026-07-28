// users リポジトリの単体テスト — 成功パス・EntityNotFoundError・salary null 境界。
// salary は暗号文でしか保存・返却されないこと (security-spec §4.2) を経路ごとに確認する。

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createTenantsRepo } from '../repository/tenants';
import { createUsersRepo, type InsertUserInput, type UsersRepo } from '../repository/users';
import { createRepositoryContext } from '../src/context';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

const MISSING_ID = 'missing-user-id';

let adapter: TursoAdapter;
let repo: UsersRepo;
let context: RepositoryContext;

function input(overrides: Partial<InsertUserInput> = {}): InsertUserInput {
  return {
    idpSubject: 'subject-base',
    email: 'base@example.com',
    name: '基本ユーザー',
    role: 'member',
    status: 'active',
    ...overrides,
  };
}

/** 別テナントの context を作る (tenant scope が効いているかの対照用)。 */
async function otherTenantContext(): Promise<RepositoryContext> {
  const tenant = await createTenantsRepo(asCore(adapter)).create({ slug: 'users-other', name: 'Other', plan: 'free' });
  return createRepositoryContext({ tenantId: tenant.id });
}

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
  const core = asCore(adapter);
  const tenant = await createTenantsRepo(core).create({ slug: 'users-main', name: 'Main', plan: 'free' });
  context = createRepositoryContext({ tenantId: tenant.id });
  repo = createUsersRepo(core, testCipher(core));
}, 30_000);

afterEach(() => adapter.close());

describe('createUsersRepo insert', () => {
  it('salary を渡すと暗号文で保存され、平文が行に残らない', async () => {
    const user = await repo.insert(context, { ...input(), salary: 7_200_000 });

    expect(user.salary).not.toBeNull();
    expect(user.salary).not.toContain('7200000');
    expect(user.salary?.split(':')).toHaveLength(4);
    expect(await repo.decryptSalary(context, user.id)).toBe(7_200_000);
  });

  it('salary 省略時は null で保存され、lastLoginAt も null で始まる', async () => {
    const user = await repo.insert(context, input());

    expect(user.salary).toBeNull();
    expect(user.lastLoginAt).toBeNull();
    expect(user.department).toBeNull();
    expect(user.tenantId).toBe(context.tenantId);
    expect(user.createdAt).toBeGreaterThan(0);
  });

  it('salary に null を明示しても暗号化されず null で保存される', async () => {
    const user = await repo.insert(context, { ...input(), salary: null });
    expect(user.salary).toBeNull();
  });

  it('department を渡すとそのまま保存される', async () => {
    const user = await repo.insert(context, { ...input(), department: '開発部' });
    expect(user.department).toBe('開発部');
  });
});

describe('createUsersRepo findById / findByIdpSubject', () => {
  it('挿入した行を id で引ける', async () => {
    const user = await repo.insert(context, input());
    expect((await repo.findById(context, user.id))?.email).toBe('base@example.com');
  });

  it('存在しない id は null を返す', async () => {
    expect(await repo.findById(context, MISSING_ID)).toBeNull();
  });

  it('別テナントの context からは id で引けない', async () => {
    const user = await repo.insert(context, input());
    expect(await repo.findById(await otherTenantContext(), user.id)).toBeNull();
  });

  it('IdP subject で引ける', async () => {
    const user = await repo.insert(context, input({ idpSubject: 'subject-idp' }));
    expect((await repo.findByIdpSubject(context, 'subject-idp'))?.id).toBe(user.id);
  });

  it('未知の IdP subject は null を返す', async () => {
    await repo.insert(context, input({ idpSubject: 'subject-idp' }));
    expect(await repo.findByIdpSubject(context, 'subject-unknown')).toBeNull();
  });

  it('同じ IdP subject でも別テナントの context からは引けない', async () => {
    await repo.insert(context, input({ idpSubject: 'subject-shared' }));
    expect(await repo.findByIdpSubject(await otherTenantContext(), 'subject-shared')).toBeNull();
  });
});

describe('createUsersRepo list', () => {
  it('自テナントの行だけを返す', async () => {
    await repo.insert(context, input({ idpSubject: 'sub-a', email: 'a@example.com' }));
    await repo.insert(context, input({ idpSubject: 'sub-b', email: 'b@example.com' }));
    await repo.insert(await otherTenantContext(), input({ idpSubject: 'sub-a' }));

    const rows = await repo.list(context);
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.tenantId).toBe(context.tenantId);
  });

  it('limit で件数を絞れる', async () => {
    await repo.insert(context, input({ idpSubject: 'sub-a' }));
    await repo.insert(context, input({ idpSubject: 'sub-b' }));
    expect(await repo.list(context, { limit: 1 })).toHaveLength(1);
  });

  it('該当行が無ければ空配列を返す', async () => {
    expect(await repo.list(context)).toStrictEqual([]);
  });
});

describe('createUsersRepo update', () => {
  it('可変列をまとめて更新できる', async () => {
    const user = await repo.insert(context, { ...input(), department: '営業部' });

    const updated = await repo.update(context, user.id, {
      email: 'renamed@example.com',
      name: '改名ユーザー',
      department: '開発部',
      role: 'workspace-admin',
      status: 'inactive',
    });

    expect(updated.email).toBe('renamed@example.com');
    expect(updated.name).toBe('改名ユーザー');
    expect(updated.department).toBe('開発部');
    expect(updated.role).toBe('workspace-admin');
    expect(updated.status).toBe('inactive');
  });

  it('未指定の列は変更しない (部分更新)', async () => {
    const user = await repo.insert(context, { ...input(), department: '営業部', salary: 6_000_000 });

    const updated = await repo.update(context, user.id, { name: '名前だけ変更' });

    expect(updated.name).toBe('名前だけ変更');
    expect(updated.email).toBe(user.email);
    expect(updated.department).toBe('営業部');
    expect(updated.role).toBe(user.role);
    expect(updated.status).toBe(user.status);
    // salary は updateSalary の明示経路でしか変わらない
    expect(updated.salary).toBe(user.salary);
  });

  it('department に null を渡すと未設定へ戻せる', async () => {
    const user = await repo.insert(context, { ...input(), department: '営業部' });
    expect((await repo.update(context, user.id, { department: null })).department).toBeNull();
  });

  it('存在しない id は EntityNotFoundError になる', async () => {
    await expect(repo.update(context, MISSING_ID, { name: 'x' })).rejects.toThrow(EntityNotFoundError);
  });

  it('別テナントの context からは更新が届かない', async () => {
    const user = await repo.insert(context, input());
    await expect(repo.update(await otherTenantContext(), user.id, { name: 'hijacked' })).rejects.toThrow(
      EntityNotFoundError,
    );
  });
});

describe('createUsersRepo markLastLogin', () => {
  it('サーバー時刻で lastLoginAt を記録する', async () => {
    const user = await repo.insert(context, input());
    expect(user.lastLoginAt).toBeNull();

    const updated = await repo.markLastLogin(context, user.id);
    expect(updated.lastLoginAt).not.toBeNull();
    expect(updated.lastLoginAt as number).toBeGreaterThan(0);
  });

  it('存在しない id は EntityNotFoundError になる', async () => {
    await expect(repo.markLastLogin(context, MISSING_ID)).rejects.toThrow(EntityNotFoundError);
  });
});

describe('createUsersRepo updateSalary / decryptSalary', () => {
  it('数値を渡すと暗号文で保存され、復号で元の値に戻る', async () => {
    const user = await repo.insert(context, input());

    const updated = await repo.updateSalary(context, user.id, 8_400_000);
    expect(updated.salary).not.toBeNull();
    expect(updated.salary).not.toContain('8400000');
    expect(await repo.decryptSalary(context, user.id)).toBe(8_400_000);
  });

  it('null を渡すと暗号化せず null を保存し、復号は null を返す', async () => {
    const user = await repo.insert(context, { ...input(), salary: 5_000_000 });

    const cleared = await repo.updateSalary(context, user.id, null);
    expect(cleared.salary).toBeNull();
    expect(await repo.decryptSalary(context, user.id)).toBeNull();
  });

  it('updateSalary は存在しない id で EntityNotFoundError になる', async () => {
    await expect(repo.updateSalary(context, MISSING_ID, 1_000)).rejects.toThrow(EntityNotFoundError);
  });

  it('updateSalary は null 指定でも存在しない id なら EntityNotFoundError になる', async () => {
    await expect(repo.updateSalary(context, MISSING_ID, null)).rejects.toThrow(EntityNotFoundError);
  });

  it('decryptSalary は存在しない id で EntityNotFoundError になる', async () => {
    await expect(repo.decryptSalary(context, MISSING_ID)).rejects.toThrow(EntityNotFoundError);
  });

  it('decryptSalary は別テナントの context から到達できない', async () => {
    const user = await repo.insert(context, { ...input(), salary: 5_000_000 });
    await expect(repo.decryptSalary(await otherTenantContext(), user.id)).rejects.toThrow(EntityNotFoundError);
  });
});

describe('createUsersRepo deleteById', () => {
  it('削除後は findById が null を返す', async () => {
    const user = await repo.insert(context, input());
    await repo.deleteById(context, user.id);
    expect(await repo.findById(context, user.id)).toBeNull();
  });

  it('存在しない id の削除は no-op で例外にならない', async () => {
    await expect(repo.deleteById(context, MISSING_ID)).resolves.toBeUndefined();
  });

  it('別テナントの context からの削除は行に届かない', async () => {
    const user = await repo.insert(context, input());
    await repo.deleteById(await otherTenantContext(), user.id);
    expect(await repo.findById(context, user.id)).not.toBeNull();
  });
});
