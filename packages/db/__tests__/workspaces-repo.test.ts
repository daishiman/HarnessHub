// user_workspaces リポジトリの単体テスト — 所属の追加/削除・add の冪等性・列挙順序。
// 順序は session claims の再現性に効くため、逆順に add してから昇順で返ることを確認する。

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createScopedCrud } from '../repository/crud';
import { createTenantsRepo } from '../repository/tenants';
import { createUsersRepo } from '../repository/users';
import { createUserWorkspacesRepo, type UserWorkspacesRepo } from '../repository/workspaces';
import { workspaces } from '../schema/core/identity';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

let adapter: TursoAdapter;
let repo: UserWorkspacesRepo;
let context: RepositoryContext;

async function newWorkspaceId(target: RepositoryContext = context, slug = `ws-${Math.random()}`): Promise<string> {
  const created = await createScopedCrud(asCore(adapter), workspaces).insert(target, { slug, name: slug });
  return created.id as string;
}

async function newUserId(target: RepositoryContext = context, subject = `sub-${Math.random()}`): Promise<string> {
  const core = asCore(adapter);
  const user = await createUsersRepo(core, testCipher(core)).insert(target, {
    idpSubject: subject,
    email: `${subject}@example.com`,
    name: subject,
    role: 'member',
    status: 'active',
  });
  return user.id;
}

async function otherTenantContext(): Promise<RepositoryContext> {
  const tenant = await createTenantsRepo(asCore(adapter)).create({ slug: 'ws-other', name: 'Other', plan: 'free' });
  return createRepositoryContext({ tenantId: tenant.id });
}

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
  const core = asCore(adapter);
  const tenant = await createTenantsRepo(core).create({ slug: 'ws-main', name: 'Main', plan: 'free' });
  context = createRepositoryContext({ tenantId: tenant.id });
  repo = createUserWorkspacesRepo(core);
}, 30_000);

afterEach(() => adapter.close());

describe('createUserWorkspacesRepo add', () => {
  it('所属を追加すると両方向の列挙に現れる', async () => {
    const userId = await newUserId();
    const workspaceId = await newWorkspaceId();

    await repo.add(context, { userId, workspaceId });

    expect(await repo.listWorkspaceIdsForUser(context, userId)).toStrictEqual([workspaceId]);
    expect(await repo.listUserIdsForWorkspace(context, workspaceId)).toStrictEqual([userId]);
  });

  it('同じ組合せを 2 回 add しても重複しない (冪等)', async () => {
    const userId = await newUserId();
    const workspaceId = await newWorkspaceId();

    await repo.add(context, { userId, workspaceId });
    await repo.add(context, { userId, workspaceId });
    await repo.add(context, { userId, workspaceId });

    expect(await repo.listWorkspaceIdsForUser(context, userId)).toStrictEqual([workspaceId]);
    expect(await repo.listUserIdsForWorkspace(context, workspaceId)).toStrictEqual([userId]);
  });

  it('user と workspace の ID が同じでもテナントが違えば別の所属になる', async () => {
    const other = await otherTenantContext();
    const userId = await newUserId();
    const workspaceId = await newWorkspaceId();

    await repo.add(context, { userId, workspaceId });
    await repo.add(other, { userId, workspaceId });

    expect(await repo.listWorkspaceIdsForUser(context, userId)).toStrictEqual([workspaceId]);
    expect(await repo.listWorkspaceIdsForUser(other, userId)).toStrictEqual([workspaceId]);
  });
});

describe('createUserWorkspacesRepo listWorkspaceIdsForUser', () => {
  it('逆順に add しても workspaceId の昇順で返る', async () => {
    const userId = await newUserId();
    const workspaceIds = [await newWorkspaceId(), await newWorkspaceId(), await newWorkspaceId()];

    for (const workspaceId of [...workspaceIds].reverse()) {
      await repo.add(context, { userId, workspaceId });
    }

    expect(await repo.listWorkspaceIdsForUser(context, userId)).toStrictEqual([...workspaceIds].sort());
  });

  it('所属が無い利用者には空配列を返す', async () => {
    expect(await repo.listWorkspaceIdsForUser(context, await newUserId())).toStrictEqual([]);
  });

  it('他の利用者の所属は混ざらない', async () => {
    const [userA, userB] = [await newUserId(), await newUserId()];
    const [workspaceA, workspaceB] = [await newWorkspaceId(), await newWorkspaceId()];

    await repo.add(context, { userId: userA, workspaceId: workspaceA });
    await repo.add(context, { userId: userB, workspaceId: workspaceB });

    expect(await repo.listWorkspaceIdsForUser(context, userA)).toStrictEqual([workspaceA]);
  });

  it('別テナントの context からは所属が見えない', async () => {
    const userId = await newUserId();
    await repo.add(context, { userId, workspaceId: await newWorkspaceId() });

    expect(await repo.listWorkspaceIdsForUser(await otherTenantContext(), userId)).toStrictEqual([]);
  });
});

describe('createUserWorkspacesRepo listWorkspacesForUser', () => {
  it('名前つきで、listWorkspaceIdsForUser と同じ順序で返る', async () => {
    const userId = await newUserId();
    const first = await newWorkspaceId(context, 'ws-aaa');
    const second = await newWorkspaceId(context, 'ws-bbb');

    for (const workspaceId of [second, first]) {
      await repo.add(context, { userId, workspaceId });
    }

    const memberships = await repo.listWorkspacesForUser(context, userId);
    expect(memberships.map((membership) => membership.workspaceId)).toStrictEqual(
      await repo.listWorkspaceIdsForUser(context, userId),
    );
    expect(memberships.map((membership) => membership.name).sort()).toStrictEqual(['ws-aaa', 'ws-bbb']);
  });

  /**
   * 名前が引けない所属を落とすと、この一覧から導いた到達可否が
   * listWorkspaceIdsForUser より狭くなる。**名前の有無を権限にしない**ことを固定する。
   */
  it('workspaces 行が無い所属も落とさず、名前だけ空文字で返す', async () => {
    const userId = await newUserId();
    await repo.add(context, { userId, workspaceId: 'ws-dangling' });

    expect(await repo.listWorkspacesForUser(context, userId)).toStrictEqual([{ workspaceId: 'ws-dangling', name: '' }]);
  });

  it('別テナントの context からは所属が見えない', async () => {
    const userId = await newUserId();
    await repo.add(context, { userId, workspaceId: await newWorkspaceId() });

    expect(await repo.listWorkspacesForUser(await otherTenantContext(), userId)).toStrictEqual([]);
  });
});

describe('createUserWorkspacesRepo listUserIdsForWorkspace', () => {
  it('逆順に add しても userId の昇順で返る', async () => {
    const workspaceId = await newWorkspaceId();
    const userIds = [await newUserId(), await newUserId(), await newUserId()];

    for (const userId of [...userIds].reverse()) {
      await repo.add(context, { userId, workspaceId });
    }

    expect(await repo.listUserIdsForWorkspace(context, workspaceId)).toStrictEqual([...userIds].sort());
  });

  it('所属者が居ない Workspace には空配列を返す', async () => {
    expect(await repo.listUserIdsForWorkspace(context, await newWorkspaceId())).toStrictEqual([]);
  });
});

describe('createUserWorkspacesRepo remove', () => {
  it('指定した所属だけを削除する', async () => {
    const userId = await newUserId();
    const [keep, drop] = [await newWorkspaceId(), await newWorkspaceId()];

    await repo.add(context, { userId, workspaceId: keep });
    await repo.add(context, { userId, workspaceId: drop });
    await repo.remove(context, { userId, workspaceId: drop });

    expect(await repo.listWorkspaceIdsForUser(context, userId)).toStrictEqual([keep]);
    expect(await repo.listUserIdsForWorkspace(context, drop)).toStrictEqual([]);
  });

  it('存在しない組合せの削除は no-op で例外にならない', async () => {
    await expect(repo.remove(context, { userId: 'unknown-user', workspaceId: 'unknown-ws' })).resolves.toBeUndefined();
  });

  it('別テナントの context からの削除は所属に届かない', async () => {
    const userId = await newUserId();
    const workspaceId = await newWorkspaceId();
    await repo.add(context, { userId, workspaceId });

    await repo.remove(await otherTenantContext(), { userId, workspaceId });

    expect(await repo.listWorkspaceIdsForUser(context, userId)).toStrictEqual([workspaceId]);
  });

  it('remove 後に同じ組合せを add し直せる', async () => {
    const userId = await newUserId();
    const workspaceId = await newWorkspaceId();

    await repo.add(context, { userId, workspaceId });
    await repo.remove(context, { userId, workspaceId });
    await repo.add(context, { userId, workspaceId });

    expect(await repo.listWorkspaceIdsForUser(context, userId)).toStrictEqual([workspaceId]);
  });
});
