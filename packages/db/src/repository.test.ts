// repository 境界 (ページング正規化・factory 型・エラー語彙) の単体テスト。

import { describe, expect, it } from 'vitest';
import { EntityNotFoundError, RepositoryError } from './errors';
import type { Repository } from './repository';
import {
  DEFAULT_PAGE_SIZE,
  defineRepositoryFactory,
  emptyPage,
  MAX_PAGE_SIZE,
  normalizePageRequest,
} from './repository';
import type { RepositoryContext } from './types';

const context: RepositoryContext = { tenantId: 'tenant-1' };

describe('normalizePageRequest', () => {
  it('未指定なら既定サイズを使う', () => {
    expect(normalizePageRequest()).toStrictEqual({ limit: DEFAULT_PAGE_SIZE });
  });

  it('上限を超える limit は上限へ丸める', () => {
    expect(normalizePageRequest({ limit: 1000 })).toStrictEqual({ limit: MAX_PAGE_SIZE });
  });

  it('cursor は保持する', () => {
    expect(normalizePageRequest({ limit: 10, cursor: 'c1' })).toStrictEqual({
      limit: 10,
      cursor: 'c1',
    });
  });

  it('0 以下・非整数の limit を拒否する', () => {
    expect(() => normalizePageRequest({ limit: 0 })).toThrow(RepositoryError);
    expect(() => normalizePageRequest({ limit: 1.5 })).toThrow(/1 以上の整数/);
  });
});

describe('emptyPage', () => {
  it('items 空・nextCursor null を返す', () => {
    expect(emptyPage<string>()).toStrictEqual({ items: [], nextCursor: null });
  });
});

describe('Repository 境界', () => {
  interface Sample {
    readonly id: string;
    readonly name: string;
  }

  // この package はテーブル定義を持たないため、テストでは entity を局所的に与えて口の形だけを検証する。
  const createStubRepository = defineRepositoryFactory<Repository<Sample>>(() => ({
    findById: async (_context, id) => (id === 'a' ? { id: 'a', name: 'A' } : null),
    findMany: async () => emptyPage<Sample>(),
    insert: async (_context, values) => values,
    update: async (_context, id, values) => ({ id, name: values.name ?? '' }),
    delete: async () => undefined,
  }));

  const repository = createStubRepository({ driver: 'turso', schema: {}, client: null });

  it('全メソッドが RepositoryContext を必須で受け取る', async () => {
    await expect(repository.findById(context, 'a')).resolves.toStrictEqual({ id: 'a', name: 'A' });
    await expect(repository.findById(context, 'z')).resolves.toBeNull();
    await expect(repository.findMany(context)).resolves.toStrictEqual(emptyPage());
    await expect(repository.insert(context, { id: 'b', name: 'B' })).resolves.toStrictEqual({
      id: 'b',
      name: 'B',
    });
    await expect(repository.update(context, 'b', { name: 'B2' })).resolves.toStrictEqual({
      id: 'b',
      name: 'B2',
    });
    await expect(repository.delete(context, 'b')).resolves.toBeUndefined();
  });
});

describe('EntityNotFoundError', () => {
  it('entity と id を保持し code は not-found', () => {
    const error = new EntityNotFoundError('Plugin', 'p-1');
    expect(error).toBeInstanceOf(RepositoryError);
    expect(error.code).toBe('not-found');
    expect(error.entity).toBe('Plugin');
    expect(error.id).toBe('p-1');
  });
});
