import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../connection/turso';
import { createCoreRepositories, createDocsCmsRepository } from '../repository/composition';
import { createScopedCrud } from '../repository/crud';
import { workspaces } from '../schema/core/identity';
import { createRepositoryContext } from '../src/context';
import { asCore, createLibsqlTestDb, TEST_KEK_B64 } from './support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => adapter.close());

async function seedActor() {
  const core = createCoreRepositories({ adapter: asCore(adapter), kekBase64: TEST_KEK_B64 });
  const tenant = await core.tenants.create({ slug: 'docs-cms', name: 'Docs CMS', plan: 'free' });
  const tenantContext = createRepositoryContext({ tenantId: tenant.id });
  const workspace = await createScopedCrud(asCore(adapter), workspaces).insert(tenantContext, {
    slug: 'docs',
    name: 'Docs',
  });
  const user = await core.users.insert(tenantContext, {
    idpSubject: 'docs-cms-subject',
    email: 'docs-cms@example.com',
    name: 'Docs administrator',
    department: 'Docs',
    role: 'workspace-admin',
    status: 'active',
  });
  return createRepositoryContext({ tenantId: tenant.id, workspaceId: workspace.id as string, actorId: user.id });
}

describe('DOCS-DB: documents repository', () => {
  it('DOCS-PAGE-001: ULID cursor advances without repeating the first page', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const created = await Promise.all(
      ['最初', '次', '最後'].map((title) =>
        repository.createDocument(context, {
          scope: 'tenant',
          title,
          bodyMarkdown: title,
          actorId: context.actorId ?? 'missing-actor',
        }),
      ),
    );

    const firstPage = await repository.listDocuments(context, { limit: 1 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).not.toBeNull();
    if (firstPage.nextCursor === null) throw new Error('first page must expose a cursor');

    const secondPage = await repository.listDocuments(context, { limit: 1, cursor: firstPage.nextCursor });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
    expect(secondPage.nextCursor).not.toBeNull();
    if (secondPage.nextCursor === null) throw new Error('second page must expose a cursor');

    const thirdPage = await repository.listDocuments(context, { limit: 1, cursor: secondPage.nextCursor });
    expect(thirdPage.nextCursor).toBeNull();
    expect(
      new Set([...firstPage.items, ...secondPage.items, ...thirdPage.items].map((document) => document.id)),
    ).toEqual(new Set(created.map((document) => document.id)));
  });

  it('DOCS-TAG-001: tag は JSON 配列要素の完全一致で絞り込む', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    await repository.createDocument(context, {
      scope: 'tenant',
      title: 'API ガイド',
      bodyMarkdown: '',
      actorId: context.actorId ?? 'missing-actor',
      tags: JSON.stringify(['API', '設計']),
    });
    await repository.createDocument(context, {
      scope: 'tenant',
      title: 'GraphAPI ガイド',
      bodyMarkdown: '',
      actorId: context.actorId ?? 'missing-actor',
      tags: JSON.stringify(['GraphAPI']),
    });
    await repository.createDocument(context, {
      scope: 'tenant',
      title: '旧形式の壊れたタグ',
      bodyMarkdown: '',
      actorId: context.actorId ?? 'missing-actor',
      tags: 'not-json',
    });

    const page = await repository.listDocuments(context, { limit: 50, tag: 'API' });

    expect(page.items.map((row) => row.title)).toStrictEqual(['API ガイド']);
  });
});
