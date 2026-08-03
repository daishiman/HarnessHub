// tenant_data 一覧取得の cursor pagination (feat-tenant-data-retention AD-4)。
// 対応: docs/features/feat-tenant-data-retention/test-design.md の GET 一覧 API 契約。

import type { TursoAdapter } from '@harness-hub/db/connection';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenantDataRegistry } from '../registry/tenant-data';
import { createAuditRepo } from '../repository/audit';
import { createTenantDataRepo } from '../repository/tenant-data';
import { createRepositoryContext } from '../src/context';
import { createFakeTenantDataBucket } from './support/r2-fake';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

let adapter: TursoAdapter;

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
});

afterAll(() => adapter.close());

function setup() {
  const core = asCore(adapter);
  const cipher = testCipher(core);
  const bucket = createFakeTenantDataBucket();
  const registry = createTenantDataRegistry(bucket);
  const audit = createAuditRepo(core);
  return createTenantDataRepo(core, cipher, registry, audit);
}

describe('tenant_data 一覧の cursor pagination', () => {
  it('workspace 内のオブジェクトを新しい順に返し、limit 超過時は nextCursor を持つ', async () => {
    const repo = setup();
    const ctx = createRepositoryContext({ tenantId: 'tenant-list-1' });
    const uploaded = [];
    for (let i = 0; i < 3; i++) {
      uploaded.push(
        await repo.upload(ctx, {
          workspaceId: 'ws-1',
          kind: 'knowledge_doc',
          title: `doc-${i}`,
          plaintext: new TextEncoder().encode(`plain-${i}`),
          uploadedBy: 'user',
        }),
      );
    }

    const firstPage = await repo.list(ctx, { workspaceId: 'ws-1', limit: 2 });
    expect(firstPage.items.map((row) => row.id)).toStrictEqual([uploaded[2]?.id, uploaded[1]?.id]);
    expect(firstPage.nextCursor).toBe(uploaded[1]?.id);

    const secondPage = await repo.list(
      ctx,
      firstPage.nextCursor === null
        ? { workspaceId: 'ws-1', limit: 2 }
        : { workspaceId: 'ws-1', limit: 2, cursor: firstPage.nextCursor },
    );
    expect(secondPage.items.map((row) => row.id)).toStrictEqual([uploaded[0]?.id]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('他 workspace / 他 tenant のオブジェクトを含めない', async () => {
    const repo = setup();
    const ctx = createRepositoryContext({ tenantId: 'tenant-list-2' });
    const other = createRepositoryContext({ tenantId: 'tenant-list-2-other' });
    const target = await repo.upload(ctx, {
      workspaceId: 'ws-a',
      kind: 'run_input',
      title: 'target',
      plaintext: new TextEncoder().encode('a'),
      uploadedBy: 'user',
    });
    await repo.upload(ctx, {
      workspaceId: 'ws-b',
      kind: 'run_input',
      title: 'other-workspace',
      plaintext: new TextEncoder().encode('b'),
      uploadedBy: 'user',
    });
    await repo.upload(other, {
      workspaceId: 'ws-a',
      kind: 'run_input',
      title: 'other-tenant',
      plaintext: new TextEncoder().encode('c'),
      uploadedBy: 'user',
    });

    const page = await repo.list(ctx, { workspaceId: 'ws-a', limit: 50 });
    expect(page.items.map((row) => row.id)).toStrictEqual([target.id]);
  });

  it('kind でフィルタする', async () => {
    const repo = setup();
    const ctx = createRepositoryContext({ tenantId: 'tenant-list-3' });
    const doc = await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'knowledge_doc',
      title: 'doc',
      plaintext: new TextEncoder().encode('a'),
      uploadedBy: 'user',
    });
    await repo.upload(ctx, {
      workspaceId: 'ws',
      kind: 'run_output',
      title: 'output',
      plaintext: new TextEncoder().encode('b'),
      uploadedBy: 'user',
    });

    const page = await repo.list(ctx, { workspaceId: 'ws', kind: 'knowledge_doc', limit: 50 });
    expect(page.items.map((row) => row.id)).toStrictEqual([doc.id]);
  });
});
