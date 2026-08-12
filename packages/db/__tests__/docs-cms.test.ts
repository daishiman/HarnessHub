import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../connection/turso';
import {
  createCoreRepositories,
  createDocsCmsRepository,
  ExternalDocumentPreconditionError,
} from '../repository/composition';
import { createScopedCrud } from '../repository/crud';
import { workspaces } from '../schema/core/identity';
import { documents } from '../schema/docs-cms/schema';
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

  it('DOCS-SCHEDULE-001: 未来だけを予約でき、明示公開と実際の本文変更は予約を解除する', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const firstSchedule = Date.now() + 60_000;
    const created = await repository.createDocument(context, {
      scope: 'tenant',
      title: '予約文書',
      bodyMarkdown: '初版',
      actorId: context.actorId ?? 'missing-actor',
      publishAt: firstSchedule,
    });
    expect(created).toMatchObject({ status: 'draft', publishAt: firstSchedule });

    const edited = await repository.updateDocument(context, created.id, {
      bodyMarkdown: '改訂版',
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(edited.publishAt).toBeNull();

    const secondSchedule = Date.now() + 120_000;
    const rescheduled = await repository.updateDocument(context, created.id, {
      publishAt: secondSchedule,
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(rescheduled).toMatchObject({ status: 'draft', publishAt: secondSchedule });

    const manuallyPublished = await repository.updateDocument(context, created.id, {
      status: 'published',
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(manuallyPublished).toMatchObject({ status: 'published', publishAt: null });

    await expect(
      repository.updateDocument(context, created.id, {
        publishAt: Date.now() - 1,
        actorId: context.actorId ?? 'missing-actor',
      }),
    ).rejects.toMatchObject({ code: 'invalid-context' });
    await expect(
      repository.updateDocument(context, created.id, {
        status: 'published',
        publishAt: Date.now() + 60_000,
        actorId: context.actorId ?? 'missing-actor',
      }),
    ).rejects.toMatchObject({ code: 'invalid-context' });
    await expect(
      repository.createDocument(context, {
        scope: 'tenant',
        title: '過去予約',
        bodyMarkdown: '',
        actorId: context.actorId ?? 'missing-actor',
        publishAt: Date.now(),
      }),
    ).rejects.toMatchObject({ code: 'invalid-context' });
  });

  it('DOCS-SCHEDULE-002: tenantをまたぐdue行を安定順・上限付きでCAS公開し、再実行しても安全', async () => {
    const firstContext = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const core = createCoreRepositories({ adapter: asCore(adapter), kekBase64: TEST_KEK_B64 });
    const secondTenant = await core.tenants.create({
      slug: 'docs-scheduled-other',
      name: 'Scheduled Other',
      plan: 'free',
    });
    const secondContext = createRepositoryContext({ tenantId: secondTenant.id, actorId: 'scheduled-other-admin' });
    const base = Date.now() + 60_000;

    const later = await repository.createDocument(firstContext, {
      scope: 'tenant',
      title: '後の予約',
      bodyMarkdown: '',
      actorId: firstContext.actorId ?? 'missing-actor',
      publishAt: base + 2_000,
    });
    const earlier = await repository.createDocument(secondContext, {
      scope: 'tenant',
      title: '先の予約',
      bodyMarkdown: '',
      actorId: 'scheduled-other-admin',
      publishAt: base + 1_000,
    });

    const firstBatch = await repository.publishDueDocuments(base + 3_000, 1);
    expect(firstBatch).toEqual({
      publishedCount: 1,
      hasMore: true,
      publishedDocuments: [{ id: earlier.id, tenantId: secondTenant.id }],
    });
    expect(await repository.getDocument(secondContext, earlier.id)).toMatchObject({
      status: 'published',
      publishAt: null,
    });
    expect(await repository.getDocument(firstContext, later.id)).toMatchObject({
      status: 'draft',
      publishAt: base + 2_000,
    });

    const secondBatch = await repository.publishDueDocuments(base + 3_000, 1);
    expect(secondBatch).toEqual({
      publishedCount: 1,
      hasMore: false,
      publishedDocuments: [{ id: later.id, tenantId: firstContext.tenantId }],
    });
    await expect(repository.publishDueDocuments(base + 3_000, 1)).resolves.toEqual({
      publishedCount: 0,
      hasMore: false,
      publishedDocuments: [],
    });
  });

  it('DOCS-EXT-001: 同じ外部keyの再送は重複せず、変更時だけIf-Matchを要求する', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const input = {
      source: 'claude-code',
      externalDocumentId: 'a'.repeat(64),
      title: '外部ドキュメント',
      bodyMarkdown: '# 最初',
      autoThumbnailUrl: null,
      autoExcerpt: '最初',
      assetSummary: '{"imageCount":0,"hasTable":false,"hasCode":false}',
      actorId: context.actorId ?? 'missing-actor',
    };

    const created = await repository.syncExternalDocument(context, input);
    expect(created.outcome).toBe('created');
    expect(created.document).toMatchObject({
      scope: 'tenant',
      status: 'draft',
      externalRevision: 1,
      externalSource: 'claude-code',
      excerpt: '最初',
      excerptSource: 'auto',
    });

    const unchanged = await repository.syncExternalDocument(context, input);
    expect(unchanged.outcome).toBe('unchanged');
    expect(unchanged.document.id).toBe(created.document.id);
    expect(unchanged.document.externalRevision).toBe(1);

    await expect(repository.syncExternalDocument(context, { ...input, bodyMarkdown: '# 更新' })).rejects.toMatchObject({
      reason: 'required',
    });
    const updated = await repository.syncExternalDocument(context, {
      ...input,
      bodyMarkdown: '# 更新',
      autoExcerpt: '更新',
      expectedRevision: 1,
    });
    expect(updated.outcome).toBe('updated');
    expect(updated.document.externalRevision).toBe(2);
    expect(updated.document.bodyMarkdown).toBe('# 更新');
    expect(updated.document.excerpt).toBe('更新');

    await expect(
      repository.syncExternalDocument(context, { ...input, bodyMarkdown: '# 古い更新', expectedRevision: 1 }),
    ).rejects.toBeInstanceOf(ExternalDocumentPreconditionError);
  });

  it('DOCS-EXT-004: 削除済みETagでは文書を復活させず、新規同期だけを許可する', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const input = {
      source: 'claude-code',
      externalDocumentId: 'd'.repeat(64),
      title: '削除競合',
      bodyMarkdown: '# 初版',
      autoThumbnailUrl: null,
      autoExcerpt: '初版',
      assetSummary: '{"imageCount":0,"hasTable":false,"hasCode":false}',
      actorId: context.actorId ?? 'missing-actor',
    };
    const created = await repository.syncExternalDocument(context, input);
    await adapter.client.delete(documents).where(eq(documents.id, created.document.id));

    await expect(repository.syncExternalDocument(context, { ...input, expectedRevision: 1 })).rejects.toMatchObject({
      reason: 'missing',
      current: null,
    });
    await expect(repository.syncExternalDocument(context, input)).resolves.toMatchObject({ outcome: 'created' });
  });

  it('DOCS-EXT-002: Hub側の手動編集・公開はdirty化してrevisionを進める', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const created = await repository.syncExternalDocument(context, {
      source: 'codex',
      externalDocumentId: 'b'.repeat(64),
      title: '同期文書',
      bodyMarkdown: '外部版',
      autoThumbnailUrl: null,
      autoExcerpt: '外部版',
      assetSummary: '{"imageCount":0,"hasTable":false,"hasCode":false}',
      actorId: context.actorId ?? 'missing-actor',
    });

    const manuallyEdited = await repository.updateDocument(context, created.document.id, {
      bodyMarkdown: 'Hubで編集',
      thumbnailUrl: 'https://example.com/manual.png',
      thumbnailSource: 'manual',
      excerpt: '手動要約',
      excerptSource: 'manual',
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(manuallyEdited.externalContentHash).toBeNull();
    expect(manuallyEdited.externalRevision).toBe(2);
    const published = await repository.updateDocument(context, created.document.id, {
      status: 'published',
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(published).toMatchObject({ status: 'published', externalContentHash: null, externalRevision: 3 });
    const publishAt = Date.now() + 60_000;
    const scheduled = await repository.updateDocument(context, created.document.id, {
      publishAt,
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(scheduled).toMatchObject({
      status: 'draft',
      publishAt,
      externalContentHash: null,
      externalRevision: 4,
    });
    const resynced = await repository.syncExternalDocument(context, {
      source: 'codex',
      externalDocumentId: 'b'.repeat(64),
      title: '同期文書',
      bodyMarkdown: '外部改訂版',
      autoThumbnailUrl: 'https://example.com/auto.png',
      autoExcerpt: '自動要約',
      assetSummary: '{"imageCount":1,"hasTable":false,"hasCode":false}',
      actorId: context.actorId ?? 'missing-actor',
      expectedRevision: 4,
    });
    expect(resynced.document).toMatchObject({
      status: 'draft',
      publishAt: null,
      externalRevision: 5,
      thumbnailUrl: 'https://example.com/manual.png',
      thumbnailSource: 'manual',
      excerpt: '手動要約',
      excerptSource: 'manual',
      assetSummary: '{"imageCount":1,"hasTable":false,"hasCode":false}',
    });

    const noOp = await repository.updateDocument(context, created.document.id, {
      title: resynced.document.title,
      bodyMarkdown: resynced.document.bodyMarkdown,
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(noOp).toMatchObject({ externalRevision: 5, externalContentHash: resynced.document.externalContentHash });

    const cronPublishAt = Date.now() + 120_000;
    const scheduledAgain = await repository.updateDocument(context, created.document.id, {
      publishAt: cronPublishAt,
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(scheduledAgain).toMatchObject({ externalRevision: 6, externalContentHash: null });
    await expect(repository.publishDueDocuments(cronPublishAt + 1, 1)).resolves.toMatchObject({
      publishedCount: 1,
      hasMore: false,
    });
    expect(await repository.getExternalDocument(context, 'codex', 'b'.repeat(64))).toMatchObject({
      status: 'published',
      publishAt: null,
      externalContentHash: null,
      externalRevision: 7,
    });
  });

  it('DOCS-EXT-003: 同じ外部keyでもtenantが違えば独立した文書になる', async () => {
    const firstContext = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const core = createCoreRepositories({ adapter: asCore(adapter), kekBase64: TEST_KEK_B64 });
    const otherTenant = await core.tenants.create({ slug: 'docs-other', name: 'Docs Other', plan: 'free' });
    const otherContext = createRepositoryContext({ tenantId: otherTenant.id, actorId: 'other-admin' });
    const input = {
      source: 'claude-code',
      externalDocumentId: 'c'.repeat(64),
      title: '同じkey',
      bodyMarkdown: 'tenant別',
      autoThumbnailUrl: null,
      autoExcerpt: 'tenant別',
      assetSummary: '{"imageCount":0,"hasTable":false,"hasCode":false}',
      actorId: firstContext.actorId ?? 'missing-actor',
    };

    const first = await repository.syncExternalDocument(firstContext, input);
    const second = await repository.syncExternalDocument(otherContext, { ...input, actorId: 'other-admin' });
    expect(first.document.id).not.toBe(second.document.id);
    expect(await repository.getExternalDocument(firstContext, input.source, input.externalDocumentId)).toMatchObject({
      id: first.document.id,
    });
    expect(await repository.getExternalDocument(otherContext, input.source, input.externalDocumentId)).toMatchObject({
      id: second.document.id,
    });
  });
});
