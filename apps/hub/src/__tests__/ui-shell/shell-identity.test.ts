/**
 * UIS-ID-*: シェルが表示する「誰としてサインインしているか」と「いまどの画面か」の解決。
 *
 * 表示に使う値でも、判定規則は認証層と同じ厳しさで揃える必要がある。
 * ゆるいと「失効済みなのに役職が出ている」といった、利用者に誤った安心を与える表示になる。
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../lib/auth/config.js';
import { PATHNAME_HEADER } from '../../lib/routing/pathname-header.js';

const { getCookie, getHeader, verifySessionToken } = vi.hoisted(() => ({
  getCookie: vi.fn(),
  getHeader: vi.fn(),
  verifySessionToken: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: getCookie }),
  headers: async () => ({ get: getHeader }),
}));
vi.mock('../../lib/auth/session.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/auth/session.js')>('../../lib/auth/session.js');
  return { ...actual, verifySessionToken };
});

const { resolveShellIdentity } = await import('../../lib/routing/shell-identity.js');
const { resolveShellProps } = await import('../../components/shell/resolve-shell-props.js');

// 所属一覧は切替 UI の表示判定に使うため、匿名時は空 = 切替させない (fail-closed)
const ANONYMOUS = { subject: null, role: null, workspaceIds: [] };

function claims(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'user-1',
    tenant_id: 'tenant-a',
    role: 'workspace-admin',
    status: 'active',
    workspace_ids: ['ws-1'],
    ...overrides,
  };
}

describe('UIS-ID: resolveShellIdentity の入力分類', () => {
  const ORIGINAL_SECRET = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SESSION_SECRET = 'test-secret';
    getCookie.mockImplementation((name: string) => (name === SESSION_COOKIE_NAME ? { value: 'token' } : undefined));
    getHeader.mockReturnValue(null);
  });

  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = ORIGINAL_SECRET;
  });

  it('UIS-ID-001: AUTH_SESSION_SECRET 未設定 -> 匿名', async () => {
    delete process.env.AUTH_SESSION_SECRET;

    await expect(resolveShellIdentity()).resolves.toStrictEqual(ANONYMOUS);
  });

  it('UIS-ID-002: session cookie 無し -> 匿名', async () => {
    getCookie.mockReturnValue(undefined);

    await expect(resolveShellIdentity()).resolves.toStrictEqual(ANONYMOUS);
  });

  it('UIS-ID-003: 署名検証に失敗 -> 匿名', async () => {
    verifySessionToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_signature',
    });

    await expect(resolveShellIdentity()).resolves.toStrictEqual(ANONYMOUS);
  });

  it('UIS-ID-004: status が active でない -> 匿名 (失効済みの役職を表示しない)', async () => {
    verifySessionToken.mockResolvedValue({
      ok: true,
      claims: claims({ status: 'disabled' }),
    });

    await expect(resolveShellIdentity()).resolves.toStrictEqual(ANONYMOUS);
  });

  it('UIS-ID-005: 有効な session -> subject と role と所属一覧を返す', async () => {
    verifySessionToken.mockResolvedValue({ ok: true, claims: claims() });

    await expect(resolveShellIdentity()).resolves.toStrictEqual({
      subject: 'user-1',
      role: 'workspace-admin',
      workspaceIds: ['ws-1'],
    });
  });

  it('UIS-ID-006: 所属 2 件の session はそのまま一覧を渡す (切替 UI の表示条件の入力)', async () => {
    verifySessionToken.mockResolvedValue({ ok: true, claims: claims({ workspace_ids: ['ws-1', 'ws-2'] }) });

    await expect(resolveShellIdentity()).resolves.toMatchObject({ workspaceIds: ['ws-1', 'ws-2'] });
  });
});

describe('UIS-PATH: resolveShellProps の現在地解決', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SESSION_SECRET = 'test-secret';
    getCookie.mockImplementation((name: string) => (name === SESSION_COOKIE_NAME ? { value: 'token' } : undefined));
    verifySessionToken.mockResolvedValue({ ok: true, claims: claims() });
  });

  it('UIS-PATH-001: middleware が付けた header から現在地を読む', async () => {
    getHeader.mockImplementation((name: string) => (name === PATHNAME_HEADER ? '/sheets/hs-1' : null));

    await expect(resolveShellProps()).resolves.toMatchObject({
      currentHref: '/sheets/hs-1',
    });
  });

  it('UIS-PATH-002: header が無ければ現在地は undefined (誤った強調をしない)', async () => {
    getHeader.mockReturnValue(null);

    await expect(resolveShellProps()).resolves.toMatchObject({
      currentHref: undefined,
    });
  });

  it('UIS-PATH-003: 空文字の header も現在地なしとして扱う', async () => {
    getHeader.mockReturnValue('');

    await expect(resolveShellProps()).resolves.toMatchObject({
      currentHref: undefined,
    });
  });

  it('UIS-PATH-004: scope の null は空文字へ畳んでリンク生成側の分岐を 1 つにする', async () => {
    getHeader.mockReturnValue('/sheets');

    const props = await resolveShellProps();

    expect(typeof props.scope.tenantId).toBe('string');
    expect(typeof props.scope.workspaceId).toBe('string');
  });
});
