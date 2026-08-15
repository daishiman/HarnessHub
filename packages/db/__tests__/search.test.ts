/**
 * 一覧検索の共通条件 (repository/search.ts) の振る舞い固定。
 *
 * ここで守りたいのは「検索語は検索語であって書式ではない」の 1 点。
 * 素の `like(column, '%' + 入力 + '%')` に戻ると、利用者が入力した `%` や `_` が
 * ワイルドカードとして働き、**例外を出さずに違う行が返る**。落ちないので気付けない。
 * そのため実 DB へ問い合わせて、当たる行そのものを検査する。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../connection/turso';
import { createCoreRepositories, createDocsCmsRepository } from '../repository/composition';
import { toContainsPattern } from '../repository/search';
import { createRepositoryContext } from '../src/context';
import { asCore, createLibsqlTestDb, TEST_KEK_B64 } from './support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => adapter.close());

async function seedTenantContext() {
  const core = createCoreRepositories({ adapter: asCore(adapter), kekBase64: TEST_KEK_B64 });
  const tenant = await core.tenants.create({ slug: 'search', name: '検索', plan: 'free' });
  return { core, context: createRepositoryContext({ tenantId: tenant.id }) };
}

describe('SEARCH-PATTERN: LIKE パターンの組立て', () => {
  it('SEARCH-PATTERN-001: ワイルドカードとエスケープ文字を打ち消す', () => {
    expect(toContainsPattern('50%')).toBe('%50\\%%');
    expect(toContainsPattern('AI_job')).toBe('%AI\\_job%');
    // エスケープ文字自身も対象。これを漏らすと `\%` が「エスケープされた %」に化ける。
    expect(toContainsPattern('a\\b')).toBe('%a\\\\b%');
  });

  it('SEARCH-PATTERN-002: 通常の語は素通しする (余計な加工をしない)', () => {
    expect(toContainsPattern('請求書')).toBe('%請求書%');
  });
});

describe('SEARCH-DB: 実クエリでのワイルドカード無効化', () => {
  it('SEARCH-DB-001: `%` は任意長ではなくそのままの文字として扱う', async () => {
    const { context } = await seedTenantContext();
    const repository = createDocsCmsRepository(asCore(adapter));
    // 囮は「50 を含むが 50% ではない」行にする。単に無関係な行を置くだけでは、
    // エスケープを外しても落ちない (= 壊れを検出できない) テストになる。
    for (const title of ['割引率 50% の根拠', '販売数 500 件の内訳']) {
      await repository.createDocument(context, { scope: 'tenant', title, bodyMarkdown: '', actorId: 'seed' });
    }

    const page = await repository.listDocuments(context, { limit: 50, query: '50%' });

    // 素の LIKE だと `%50%%` = 「50 を含む何か」になり、囮まで返る。
    expect(page.items.map((row) => row.title)).toStrictEqual(['割引率 50% の根拠']);
  });

  it('SEARCH-DB-002: `_` は任意 1 文字ではなくそのままの文字として扱う', async () => {
    const { context } = await seedTenantContext();
    const repository = createDocsCmsRepository(asCore(adapter));
    for (const title of ['AI_job の設計', 'AIxjob の設計']) {
      await repository.createDocument(context, { scope: 'tenant', title, bodyMarkdown: '', actorId: 'seed' });
    }

    const page = await repository.listDocuments(context, { limit: 50, query: 'AI_job' });

    expect(page.items.map((row) => row.title)).toStrictEqual(['AI_job の設計']);
  });

  it('SEARCH-DB-003: 語を渡さなければ絞り込まない (条件なしと 0 件一致を混同しない)', async () => {
    const { context } = await seedTenantContext();
    const repository = createDocsCmsRepository(asCore(adapter));
    await repository.createDocument(context, { scope: 'tenant', title: '一覧', bodyMarkdown: '', actorId: 'seed' });

    const page = await repository.listDocuments(context, { limit: 50 });

    expect(page.items).toHaveLength(1);
  });

  it('SEARCH-DB-004: docs の検索対象は title / body / tags で、それ以外の列は含まない', async () => {
    const { context } = await seedTenantContext();
    const repository = createDocsCmsRepository(asCore(adapter));
    await repository.createDocument(context, {
      scope: 'tenant',
      title: '経費精算の手引き',
      bodyMarkdown: '出張旅費についての記載',
      actorId: 'seed',
      category: '経理',
    });

    // かつては title だけを見ていた。「一覧に出ていない文字列で行が出ると、なぜ出たかが
    // 読み取れない」という理由だったが、カード一覧では body 由来の要約とタグがカード面に
    // 出るため前提が変わった (feat-card-list-shell)。見えている情報では引けるようにする。
    expect((await repository.listDocuments(context, { limit: 50, query: '出張旅費' })).items).toHaveLength(1);
    // 一方で category はカードの絞り込み条件であって全文検索の対象ではない。
    // 専用の filter があるものを q へ混ぜると、絞り込みと検索の役割が曖昧になる。
    expect((await repository.listDocuments(context, { limit: 50, query: '経理' })).items).toStrictEqual([]);
  });

  it('SEARCH-DB-005: users は氏名と部署で引ける。email では引けない', async () => {
    const { core, context } = await seedTenantContext();
    await core.users.insert(context, {
      idpSubject: 'subject-1',
      email: 'hanako@example.com',
      name: '山田 花子',
      department: '経理部',
      role: 'member',
      status: 'active',
    });
    await core.users.insert(context, {
      idpSubject: 'subject-2',
      email: 'taro@example.com',
      name: '鈴木 太郎',
      department: '営業部',
      role: 'member',
      status: 'active',
    });

    expect((await core.users.list(context, { query: '花子' })).map((row) => row.name)).toStrictEqual(['山田 花子']);
    expect((await core.users.list(context, { query: '経理' })).map((row) => row.name)).toStrictEqual(['山田 花子']);
    // email は一覧 DTO (userListItemSchema) に無いので検索対象にもしない。
    expect(await core.users.list(context, { query: 'hanako@example.com' })).toStrictEqual([]);
  });
});
