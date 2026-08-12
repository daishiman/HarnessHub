// 汎用 scoped CRUD ファクトリのガード条件 (D4 / I3)。
// 生成できないテーブルは「生成時に落ちる」ことを、更新の異常系は実 DB で確認する。

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createScopedCrud } from '../repository/crud';
import { createTenantsRepo } from '../repository/tenants';
import { projects, releases } from '../schema/core/catalog';
import { workspaces } from '../schema/core/identity';
import { idempotencyLedger } from '../schema/core/publish';
import { auditEvents, sessionRevocations } from '../schema/core/security';
import { createRepositoryContext } from '../src/context';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;
let context: RepositoryContext;

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
  const tenant = await createTenantsRepo(asCore(adapter)).create({ slug: 'crud', name: 'CRUD', plan: 'free' });
  context = createRepositoryContext({ tenantId: tenant.id });
});

afterAll(() => adapter.close());

describe('createScopedCrud の生成ガード', () => {
  it('immutable 契約のテーブル (releases / audit_events) では生成できない', () => {
    for (const table of [releases, auditEvents]) {
      expect(() => createScopedCrud(asCore(adapter), table)).toThrow(RepositoryError);
      expect(() => createScopedCrud(asCore(adapter), table)).toThrow(/immutable/);
    }
  });

  it('自然キー PK で id/tenant_id を持たないテーブルでは生成できない', () => {
    // session_revocations は tenant_id が PK で id を持たない、idempotency_ledger は (scope, key) が PK。
    for (const table of [sessionRevocations, idempotencyLedger]) {
      expect(() => createScopedCrud(asCore(adapter), table)).toThrow(/id\/tenant_id を持たない/);
    }
  });

  it('生成失敗は RepositoryError の invalid-context として投げられる', () => {
    try {
      createScopedCrud(asCore(adapter), releases);
      expect.unreachable('生成が成功してはならない');
    } catch (error) {
      expect(error).toBeInstanceOf(RepositoryError);
      expect((error as RepositoryError).code).toBe('invalid-context');
    }
  });
});

describe('updateById の異常系', () => {
  it('patch が空なら更新対象の列が無いとして落とす', async () => {
    const repo = createScopedCrud(asCore(adapter), workspaces);
    const created = await repo.insert(context, { slug: 'ws-empty', name: 'WS empty' });
    await expect(repo.updateById(context, created.id as string, {})).rejects.toThrow('更新対象の列がありません');
  });

  it('サーバ発行列 (id / tenant_id / created_at) だけの patch も空扱いにする', async () => {
    const repo = createScopedCrud(asCore(adapter), workspaces);
    const created = await repo.insert(context, { slug: 'ws-server-cols', name: 'WS server cols' });
    await expect(
      repo.updateById(context, created.id as string, { id: 'spoofed', tenantId: 'other', createdAt: 0 }),
    ).rejects.toThrow('更新対象の列がありません');

    // 落ちた後も元の行が書き換わっていないこと
    const found = await repo.findById(context, created.id as string);
    expect(found?.id).toBe(created.id);
    expect(found?.tenantId).toBe(context.tenantId);
  });

  it('存在しない id は EntityNotFoundError になる', async () => {
    const repo = createScopedCrud(asCore(adapter), workspaces);
    await expect(repo.updateById(context, 'missing-id', { name: 'NG' })).rejects.toThrow(EntityNotFoundError);
    await expect(repo.updateById(context, 'missing-id', { name: 'NG' })).rejects.toThrow(/workspaces が見つかりません/);
  });
});

describe('Workspace scope の強制', () => {
  it('workspaceId を指定すると同じ tenant の別 Workspace の Project を返さない', async () => {
    const workspaceRepo = createScopedCrud(asCore(adapter), workspaces);
    const projectRepo = createScopedCrud(asCore(adapter), projects);
    const workspaceA = await workspaceRepo.insert(context, { slug: 'crud-ws-a', name: 'CRUD Workspace A' });
    const workspaceB = await workspaceRepo.insert(context, { slug: 'crud-ws-b', name: 'CRUD Workspace B' });
    const projectA = await projectRepo.insert(context, {
      workspaceId: workspaceA.id,
      slug: 'crud-project-a',
      name: 'CRUD Project A',
      description: '',
      ownerUserId: 'owner-a',
      status: 'active',
    });
    const projectB = await projectRepo.insert(context, {
      workspaceId: workspaceB.id,
      slug: 'crud-project-b',
      name: 'CRUD Project B',
      description: '',
      ownerUserId: 'owner-b',
      status: 'active',
    });
    const workspaceAContext = createRepositoryContext({
      tenantId: context.tenantId,
      workspaceId: workspaceA.id as string,
    });

    expect(await projectRepo.findById(workspaceAContext, projectA.id as string)).not.toBeNull();
    expect(await projectRepo.findById(workspaceAContext, projectB.id as string)).toBeNull();
    expect((await projectRepo.list(workspaceAContext)).map((row) => row.id)).toEqual([projectA.id]);
    await expect(
      projectRepo.updateById(workspaceAContext, projectB.id as string, { name: '越境更新' }),
    ).rejects.toThrow(EntityNotFoundError);
  });

  it('workspaceId 未指定なら従来どおり tenant 全体を読み、列が無い表への指定は拒否する', async () => {
    const workspaceRepo = createScopedCrud(asCore(adapter), workspaces);
    const allWorkspaces = await workspaceRepo.list(context);
    expect(allWorkspaces.length).toBeGreaterThanOrEqual(2);

    const impossibleContext = createRepositoryContext({ tenantId: context.tenantId, workspaceId: 'workspace-a' });
    await expect(workspaceRepo.list(impossibleContext)).rejects.toThrow(/workspace_id を持たない/);
  });
});
