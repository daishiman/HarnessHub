// bootstrap-tenant の単体テスト — 本番へ向ける唯一の書き込み CLI なので、
// 「冪等」「既存を壊さない」「できなかったことを成功にしない」を経路ごとに固定する。
//
// dry-run が実際に無書き込みであることを行数で確かめるのが要点。宣言 (dryRun: true) を
// 信じるだけだと、書いてしまう実装でもテストが緑になる。

import { and, eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createAuditRepo } from '../repository/audit';
import { newUlid } from '../repository/ulid';
import { tenants, users, userWorkspaces, workspaces } from '../schema/core/identity';
import { type BootstrapDependencies, type BootstrapInput, bootstrapTenant } from '../scripts/bootstrap-tenant-core';
import { createRepositoryContext } from '../src/context';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;

const BASE: BootstrapInput = {
  tenantSlug: 'acme',
  tenantName: 'ACME 株式会社',
  plan: 'free',
  workspaceSlug: 'default',
  workspaceName: '既定 Workspace',
  apply: false,
};

function input(overrides: Partial<BootstrapInput> = {}): BootstrapInput {
  return { ...BASE, ...overrides };
}

const run = (overrides: Partial<BootstrapInput> = {}) => bootstrapTenant(asCore(adapter), input(overrides));
const runWithDependencies = (overrides: Partial<BootstrapInput>, dependencies: BootstrapDependencies) =>
  bootstrapTenant(asCore(adapter), input(overrides), dependencies);

/** JIT provisioning 相当。role は本番と同じく member 固定で作る。 */
async function seedJitUser(tenantId: string, email: string, role = 'member'): Promise<string> {
  const id = newUlid();
  await adapter.client.insert(users).values({
    id,
    tenantId,
    idpSubject: `sub-${id}`,
    email,
    name: '',
    role: role as 'member' | 'workspace-admin' | 'provider-admin',
    status: 'active',
    createdAt: Date.now(),
  });
  return id;
}

const countTenants = async () => (await adapter.client.select().from(tenants)).length;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
}, 30_000);

afterEach(() => adapter.close());

describe('dry-run', () => {
  it('既定は dry-run で、1 行も書かない', async () => {
    const report = await run();
    expect(report.dryRun).toBe(true);
    expect(report.ok).toBe(true);
    expect(report.tenant.outcome).toBe('planned');
    expect(report.workspace.outcome).toBe('planned');
    // 宣言ではなく実際の行数で確かめる。
    expect(await countTenants()).toBe(0);
    expect((await adapter.client.select().from(workspaces)).length).toBe(0);
  });

  it('tenant 未作成の dry-run では workspace の id を捏造しない', async () => {
    const report = await run();
    expect(report.tenant.id).toBeNull();
    expect(report.workspace.id).toBeNull();
  });
});

describe('apply', () => {
  it('tenant と workspace を作り、outcome を created として返す', async () => {
    const report = await run({ apply: true });
    expect(report.ok).toBe(true);
    expect(report.tenant.outcome).toBe('created');
    expect(report.workspace.outcome).toBe('created');
    expect(report.tenant.id).not.toBeNull();

    const row = (await adapter.client.select().from(tenants))[0];
    expect(row?.slug).toBe('acme');
    expect(row?.status).toBe('active');
  });

  it('再実行しても行が増えず existing になる (冪等)', async () => {
    const first = await run({ apply: true });
    const second = await run({ apply: true });

    expect(second.tenant.outcome).toBe('existing');
    expect(second.workspace.outcome).toBe('existing');
    expect(second.tenant.id).toBe(first.tenant.id);
    expect(second.workspace.id).toBe(first.workspace.id);
    expect(await countTenants()).toBe(1);
    expect((await adapter.client.select().from(workspaces)).length).toBe(1);
  });

  it('既存テナントの name / plan を上書きしない', async () => {
    await run({ apply: true });
    await run({ apply: true, tenantName: '別名に変えたい', plan: 'enterprise' });

    const row = (await adapter.client.select().from(tenants))[0];
    expect(row?.name).toBe('ACME 株式会社');
    expect(row?.plan).toBe('free');
  });
});

describe('最初の管理者の昇格', () => {
  it('未サインインの利用者は昇格できず ok=false になる', async () => {
    const report = await run({ apply: true, adminEmail: 'admin@acme.example' });
    expect(report.ok).toBe(false);
    expect(report.admin.outcome).toBe('user-not-found');
    // テナント枠は作れているので、本人のサインイン後に再実行すれば続きから進む。
    expect(report.tenant.outcome).toBe('created');
    expect(report.errors.join()).toContain('サインイン');
  });

  it('member を workspace-admin へ昇格し、所属と監査を残す', async () => {
    const created = await run({ apply: true });
    const tenantId = created.tenant.id as string;
    const userId = await seedJitUser(tenantId, 'admin@acme.example');

    const report = await run({ apply: true, adminEmail: 'admin@acme.example' });
    expect(report.ok).toBe(true);
    expect(report.admin.outcome).toBe('promoted');
    expect(report.admin.roleBefore).toBe('member');
    expect(report.admin.membership).toBe('created');

    const after = await adapter.client.select().from(users).where(eq(users.id, userId));
    expect(after[0]?.role).toBe('workspace-admin');

    const memberships = await adapter.client
      .select()
      .from(userWorkspaces)
      .where(and(eq(userWorkspaces.tenantId, tenantId), eq(userWorkspaces.userId, userId)));
    expect(memberships.length).toBe(1);

    const events = await createAuditRepo(asCore(adapter)).read(createRepositoryContext({ tenantId }));
    expect(events.map((event) => event.action)).toEqual(['user.role_change', 'user.workspace_membership_add']);
    expect(events[0]?.actorType).toBe('system');
  });

  it('監査 append が失敗したら role・所属を同じ transaction で rollback し、再実行で収束する', async () => {
    const created = await run({ apply: true });
    const tenantId = created.tenant.id as string;
    const userId = await seedJitUser(tenantId, 'admin@acme.example');

    await expect(
      runWithDependencies(
        { apply: true, adminEmail: 'admin@acme.example' },
        {
          appendAudit: async () => {
            throw new Error('injected audit failure');
          },
        },
      ),
    ).rejects.toThrow('injected audit failure');

    expect((await adapter.client.select().from(users).where(eq(users.id, userId)))[0]?.role).toBe('member');
    expect((await adapter.client.select().from(userWorkspaces)).length).toBe(0);
    expect((await createAuditRepo(asCore(adapter)).read(createRepositoryContext({ tenantId }))).length).toBe(0);

    const retry = await run({ apply: true, adminEmail: 'admin@acme.example' });
    expect(retry.admin.outcome).toBe('promoted');
    expect(retry.admin.membership).toBe('created');
    expect((await adapter.client.select().from(users).where(eq(users.id, userId)))[0]?.role).toBe('workspace-admin');
    expect((await adapter.client.select().from(userWorkspaces)).length).toBe(1);
  });

  it('dry-run では昇格せず planned を返す', async () => {
    const created = await run({ apply: true });
    const userId = await seedJitUser(created.tenant.id as string, 'admin@acme.example');

    const report = await run({ adminEmail: 'admin@acme.example' });
    expect(report.admin.outcome).toBe('planned');

    const after = await adapter.client.select().from(users).where(eq(users.id, userId));
    expect(after[0]?.role).toBe('member');
    expect((await adapter.client.select().from(userWorkspaces)).length).toBe(0);
  });

  it('既に workspace-admin なら据え置き、監査も積まない', async () => {
    const created = await run({ apply: true });
    const tenantId = created.tenant.id as string;
    await seedJitUser(tenantId, 'admin@acme.example', 'workspace-admin');

    const first = await run({ apply: true, adminEmail: 'admin@acme.example' });
    expect(first.admin.outcome).toBe('already-admin');
    expect(first.admin.membership).toBe('created');

    // 2 回目は所属も既存なので、変更が無い実行では監査が増えない。
    const second = await run({ apply: true, adminEmail: 'admin@acme.example' });
    expect(second.admin.membership).toBe('existing');
    const events = await createAuditRepo(asCore(adapter)).read(createRepositoryContext({ tenantId }));
    expect(events.length).toBe(1);
  });

  it('provider-admin を workspace-admin へ降格しない', async () => {
    const created = await run({ apply: true });
    const userId = await seedJitUser(created.tenant.id as string, 'owner@acme.example', 'provider-admin');

    const report = await run({ apply: true, adminEmail: 'owner@acme.example' });
    expect(report.admin.outcome).toBe('already-admin');
    const after = await adapter.client.select().from(users).where(eq(users.id, userId));
    expect(after[0]?.role).toBe('provider-admin');
  });

  it('同一 email が複数ある場合は誰も昇格せず失敗する', async () => {
    const created = await run({ apply: true });
    const tenantId = created.tenant.id as string;
    await seedJitUser(tenantId, 'dup@acme.example');
    await seedJitUser(tenantId, 'dup@acme.example');

    const report = await run({ apply: true, adminEmail: 'dup@acme.example' });
    expect(report.ok).toBe(false);
    expect(report.admin.outcome).toBe('ambiguous-email');
    const rows = await adapter.client.select().from(users).where(eq(users.tenantId, tenantId));
    expect(rows.every((row) => row.role === 'member')).toBe(true);
  });

  it('別テナントの同 email を掴まない', async () => {
    const acme = await run({ apply: true });
    const other = await run({ apply: true, tenantSlug: 'other', workspaceSlug: 'other-ws' });
    await seedJitUser(other.tenant.id as string, 'admin@acme.example');

    const report = await run({ apply: true, adminEmail: 'admin@acme.example' });
    expect(report.admin.outcome).toBe('user-not-found');
    expect(report.tenant.id).toBe(acme.tenant.id);
  });
});

describe('入力検証', () => {
  it.each([
    ['tenantSlug', { tenantSlug: '' }],
    ['tenantName', { tenantName: '  ' }],
    ['workspaceSlug', { workspaceSlug: '' }],
    ['workspaceName', { workspaceName: '' }],
    ['plan', { plan: '' }],
  ])('%s が空なら実行前に落とす', async (_label, overrides) => {
    await expect(run({ ...overrides, apply: true })).rejects.toThrow('必須');
    expect(await countTenants()).toBe(0);
  });

  it.each([
    ['tenantSlug', { tenantSlug: '../other' }],
    ['tenantSlug', { tenantSlug: 'Uppercase' }],
    ['workspaceSlug', { workspaceSlug: 'with space' }],
    ['adminEmail', { adminEmail: 'not-an-email' }],
  ])('%s の不正な形を DB 書き込み前に拒否する', async (_label, overrides) => {
    await expect(run({ ...overrides, apply: true })).rejects.toThrow('形式');
    expect(await countTenants()).toBe(0);
  });
});
