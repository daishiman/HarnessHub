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

  it('DOCS-BLOG-001: category/tags/eyecatch/publish_at を作成・更新で保存・変換できる', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));

    const created = await repository.createDocument(context, {
      scope: 'tenant',
      title: 'ブログ項目つきドキュメント',
      bodyMarkdown: '本文',
      actorId: context.actorId ?? 'missing-actor',
      category: 'release-note',
      tagsJson: JSON.stringify(['a', 'b']),
      eyecatchImageUrl: 'https://example.com/eye.png',
      publishAt: 1_700_000_000_000,
    });
    expect(created.category).toBe('release-note');
    expect(created.tagsJson).toBe(JSON.stringify(['a', 'b']));
    expect(created.eyecatchImageUrl).toBe('https://example.com/eye.png');
    expect(created.publishAt).toBe(1_700_000_000_000);

    const filtered = await repository.listDocuments(context, { limit: 10, category: 'release-note' });
    expect(filtered.items.map((doc) => doc.id)).toContain(created.id);

    const updated = await repository.updateDocument(context, created.id, {
      actorId: context.actorId ?? 'missing-actor',
      category: null,
      tagsJson: null,
    });
    expect(updated.category).toBeNull();
    expect(updated.tagsJson).toBeNull();
    // 更新で触れていないフィールドは温存される
    expect(updated.eyecatchImageUrl).toBe('https://example.com/eye.png');
    expect(updated.publishAt).toBe(1_700_000_000_000);
  });

  it('DOCS-BLOG-002: publishScheduledDocuments は publish_at <= now の draft だけを published へ昇格する', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const now = 1_700_000_000_000;

    const due = await repository.createDocument(context, {
      scope: 'tenant',
      title: '予約公開対象',
      bodyMarkdown: '本文',
      actorId: context.actorId ?? 'missing-actor',
      publishAt: now - 1_000,
    });
    const notYetDue = await repository.createDocument(context, {
      scope: 'tenant',
      title: '未来の予約',
      bodyMarkdown: '本文',
      actorId: context.actorId ?? 'missing-actor',
      publishAt: now + 1_000_000,
    });
    const noSchedule = await repository.createDocument(context, {
      scope: 'tenant',
      title: '予約なし',
      bodyMarkdown: '本文',
      actorId: context.actorId ?? 'missing-actor',
    });

    const count = await repository.publishScheduledDocuments(now);
    expect(count).toBe(1);

    const dueAfter = await repository.getDocument(context, due.id);
    const notYetDueAfter = await repository.getDocument(context, notYetDue.id);
    const noScheduleAfter = await repository.getDocument(context, noSchedule.id);
    expect(dueAfter?.status).toBe('published');
    expect(notYetDueAfter?.status).toBe('draft');
    expect(noScheduleAfter?.status).toBe('draft');
  });
});
