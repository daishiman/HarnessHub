// RepositoryContext 生成境界の単体テスト。

import { describe, expect, it } from 'vitest';

import { createRepositoryContext } from './context';
import { RepositoryError } from './errors';

describe('createRepositoryContext', () => {
  it('tenantId のみで生成できる', () => {
    expect(createRepositoryContext({ tenantId: 't-1' })).toStrictEqual({ tenantId: 't-1' });
  });

  it('省略項目に undefined を渡してもキーを生やさない', () => {
    const context = createRepositoryContext({
      tenantId: 't-1',
      workspaceId: undefined,
      actorId: undefined,
    });
    expect(Object.keys(context)).toStrictEqual(['tenantId']);
  });

  it('workspaceId / actorId を保持する', () => {
    expect(createRepositoryContext({ tenantId: 't-1', workspaceId: 'w-1', actorId: 'u-1' })).toStrictEqual({
      tenantId: 't-1',
      workspaceId: 'w-1',
      actorId: 'u-1',
    });
  });

  it('空文字・空白のみの識別子を拒否する', () => {
    expect(() => createRepositoryContext({ tenantId: '' })).toThrow(RepositoryError);
    expect(() => createRepositoryContext({ tenantId: '   ' })).toThrow(/tenantId は空にできません/);
    expect(() => createRepositoryContext({ tenantId: 't-1', workspaceId: '' })).toThrow(/workspaceId は空にできません/);
  });

  it('生成した context は凍結される', () => {
    const context = createRepositoryContext({ tenantId: 't-1' });
    expect(Object.isFrozen(context)).toBe(true);
  });
});
