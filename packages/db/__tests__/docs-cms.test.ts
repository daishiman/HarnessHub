import { eq, sql } from 'drizzle-orm';
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
  it('CARD-MUTATION-DOCS-CAS-001: concurrent entity revision CAS accepts exactly one update', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const created = await repository.createDocument(context, {
      scope: 'tenant',
      title: 'CAS target',
      bodyMarkdown: 'first',
      actorId: context.actorId ?? 'missing-actor',
    });
    expect(created.entityRevision).toBe(1);

    const results = await Promise.all([
      repository.updateDocumentCas(
        context,
        created.id,
        { bodyMarkdown: 'winner a', actorId: context.actorId ?? 'missing-actor' },
        created.entityRevision,
      ),
      repository.updateDocumentCas(
        context,
        created.id,
        { bodyMarkdown: 'winner b', actorId: context.actorId ?? 'missing-actor' },
        created.entityRevision,
      ),
    ]);

    expect(results.filter((result) => result.outcome === 'updated')).toHaveLength(1);
    expect(results.filter((result) => result.outcome === 'conflict')).toHaveLength(1);
    expect(await repository.getDocument(context, created.id)).toMatchObject({ entityRevision: 2 });
    expect(results.find((result) => result.outcome === 'conflict')).toMatchObject({
      outcome: 'conflict',
      current: { entityRevision: 2 },
    });
  });

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
  it('DOCS-COUNT-001: 状態タブの件数は cursor と status を外した集合から数え、未知の状態は unknown に寄せる', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    const actorId = context.actorId ?? 'missing-actor';
    const published = await repository.createDocument(context, {
      scope: 'tenant',
      title: '公開済み',
      bodyMarkdown: '',
      actorId,
    });
    await repository.updateDocument(context, published.id, { status: 'published', actorId });
    await repository.createDocument(context, { scope: 'tenant', title: '下書き', bodyMarkdown: '', actorId });
    const legacy = await repository.createDocument(context, {
      scope: 'tenant',
      title: '旧形式',
      bodyMarkdown: '',
      actorId,
    });
    // 画面の状態写像に無い値を直接書く。過去データや将来の状態が published/draft へ
    // 紛れ込まないこと (受入条件 5) を、repository の集計側で固定する。
    // drizzle の型は enum に無い値を拒むので、ここだけ生 SQL で書く。
    // 型で書けない値こそが検証対象 (旧データ・将来の状態) なので、型を緩めずに経路を変える。
    await adapter.client.run(sql`update documents set status = 'archived' where id = ${legacy.id}`);

    const firstPage = await repository.listDocuments(context, { limit: 1 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.statusCounts).toEqual({ all: 3, published: 1, draft: 1, unknown: 1 });

    // 状態で絞っても他タブの件数は残る。ここが 0 になると絞り込み後に全タブが空に見える
    const draftOnly = await repository.listDocuments(context, { limit: 50, status: 'draft' });
    expect(draftOnly.items.map((row) => row.title)).toStrictEqual(['下書き']);
    expect(draftOnly.statusCounts).toEqual({ all: 3, published: 1, draft: 1, unknown: 1 });
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

  /**
   * 検索語 q は title / body / tags の OR で当てる (feat-card-list-shell 受入条件)。
   * 一覧のカードに出ているのはこの 3 つなので、「画面に見えている語で探して 0 件」を作らない。
   */
  async function seedSearchCorpus(context: Awaited<ReturnType<typeof seedActor>>) {
    const repository = createDocsCmsRepository(asCore(adapter));
    const make = (title: string, bodyMarkdown: string, tags: string[]) =>
      repository.createDocument(context, {
        scope: 'tenant',
        title,
        bodyMarkdown,
        actorId: context.actorId ?? 'missing-actor',
        tags: JSON.stringify(tags),
      });
    await make('題名で当たる納品物', '本文は無関係', ['無関係']);
    await make('無関係な題名 A', '本文に納品物が出てくる', ['無関係']);
    await make('無関係な題名 B', '本文も無関係', ['納品物']);
    await make('どこにも出てこない', '無関係', ['無関係']);
    return repository;
  }

  it('DOCS-SEARCH-001: q は title / body / tags のいずれかに当たる (どれか 1 つでも一致すれば返す)', async () => {
    const context = await seedActor();
    const repository = await seedSearchCorpus(context);

    const page = await repository.listDocuments(context, { limit: 50, query: '納品物' });

    // 3 件は title / body / tags のいずれかで一致し、4 件目はどこにも無いので落ちる。
    // 「title だけ検索」への退行は、この 3 件が 1 件へ減ることで検知できる。
    expect(page.items.map((row) => row.title).sort()).toStrictEqual([
      '無関係な題名 A',
      '無関係な題名 B',
      '題名で当たる納品物',
    ]);
    // 件数も同じ集合から数える。items だけ直して counts が古い、を起こさない。
    expect(page.statusCounts.all).toBe(3);
  });

  it('DOCS-SEARCH-002: q は他の絞り込みと AND で合成される (OR が外へ漏れない)', async () => {
    const context = await seedActor();
    const repository = await seedSearchCorpus(context);

    // tags で一致する行だけを別のタグ条件で外す。q の OR が括弧で閉じていないと、
    // tag 条件が OR の一項として扱われて件数が増える。
    const page = await repository.listDocuments(context, { limit: 50, query: '納品物', tag: '納品物' });

    expect(page.items.map((row) => row.title)).toStrictEqual(['無関係な題名 B']);
  });

  it('DOCS-SEARCH-003: tags 検索は要素単位で当て、JSON の構文文字や壊れた値に引っかからない', async () => {
    const context = await seedActor();
    const repository = createDocsCmsRepository(asCore(adapter));
    await repository.createDocument(context, {
      scope: 'tenant',
      title: 'タグつき',
      bodyMarkdown: '',
      actorId: context.actorId ?? 'missing-actor',
      tags: JSON.stringify(['設計', 'API']),
    });
    await repository.createDocument(context, {
      scope: 'tenant',
      title: '壊れたタグ',
      bodyMarkdown: '',
      actorId: context.actorId ?? 'missing-actor',
      tags: 'not-json',
    });

    // `","` は JSON 文字列としての区切りであってタグの中身ではない。列へ直接 LIKE を
    // 当てる実装ならタグを持つ全行に一致してしまう。
    expect((await repository.listDocuments(context, { limit: 50, query: '","' })).items).toStrictEqual([]);
    // LIKE のメタ文字はただの文字として扱う (`%` が全件一致にならない)。
    expect((await repository.listDocuments(context, { limit: 50, query: '%' })).items).toStrictEqual([]);
    // 壊れた tags は fail-closed で非一致。例外にもしない。
    expect((await repository.listDocuments(context, { limit: 50, query: 'not-json' })).items).toStrictEqual([]);
    // 正しいタグの部分一致は当たる (検索が全部を拒否して無意味になっていないことの確認)。
    expect(
      (await repository.listDocuments(context, { limit: 50, query: 'AP' })).items.map((row) => row.title),
    ).toStrictEqual(['タグつき']);
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
