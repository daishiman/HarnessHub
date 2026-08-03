/**
 * TID-SCOPE-01〜05: 明示ヘッダー系統 (explicit) と session 系統 (session) の合流真理値表。
 * TID-INT-01〜03: `/` (HomePage) の redirect 結線 (middleware より前段、SSR での session 検証)。
 * TID-INT-04: 業務画面 6 種に session scope のみで通常アクセスしても 403 にならないこと。
 * TID-INT-05: 着地先解決の結果 path にも通常の authorize() が適用されること (迂回路にしない)。
 *
 * feat-post-signin-scope-routing P06 (docs/features/feat-post-signin-scope-routing/test-design.md)
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTIVE_WORKSPACE_COOKIE_NAME } from '../../src/lib/auth/session.js';
import { authorize } from '../../src/middleware/authz.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../src/middleware/scope.js';
import type { Principal } from '../../src/shared/auth/index.js';

const principal: Principal = {
  subject: 'user-1',
  tenantId: 'tenant-a',
  // 2 workspace 所属にして「cookie 無しで自動確定しない」(TID-BIND-04) を scope 解決へも反映させる
  workspaceIds: ['ws-1', 'ws-2'],
  roles: ['member'],
};

function headers(entries: Record<string, string>): ReadonlyMap<string, string> {
  return new Map(Object.entries(entries));
}

function cookie(workspaceId: string): string {
  return `${ACTIVE_WORKSPACE_COOKIE_NAME}=${workspaceId}`;
}

const { getCookie, redirectMock, verifySessionToken } = vi.hoisted(() => ({
  getCookie: vi.fn(),
  redirectMock: vi.fn(),
  verifySessionToken: vi.fn(),
}));

// HomePage (src/app/page.tsx) は cookies()/redirect() を next/headers・next/navigation から呼ぶ
// server component なので、signin-page.test.tsx と同じく mock を hoist してから dynamic import する。
vi.mock('next/headers', () => ({ cookies: async () => ({ get: getCookie }) }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error('NEXT_REDIRECT');
  },
}));
vi.mock('../../src/lib/auth/index.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/auth/index.js')>('../../src/lib/auth/index.js');
  return { ...actual, verifySessionToken };
});

const HomePage = (await import('../../src/app/page.js')).default;

async function renderHome(): Promise<string> {
  return renderToStaticMarkup(await HomePage());
}

describe('TID-INT-01〜03: `/` (HomePage) の session redirect 結線', () => {
  const ORIGINAL_SECRET = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SESSION_SECRET = 'test-secret';
    getCookie.mockReturnValue(undefined);
  });

  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.AUTH_SESSION_SECRET;
    } else {
      process.env.AUTH_SESSION_SECRET = ORIGINAL_SECRET;
    }
  });

  it('TID-INT-01/TID-INT-03: 未認証 (session cookie 無し) では稼働確認表示のまま redirect しない', async () => {
    const html = await renderHome();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain('稼働状況');
  });

  it('TID-INT-02: 認証済み session で `/` を開くと既定着地 (/sheets) へ redirect される', async () => {
    getCookie.mockReturnValue({ value: 'valid-token' });
    verifySessionToken.mockResolvedValue({
      ok: true,
      claims: { sub: 'user-1', tenant_id: 'tenant-a', role: 'member', status: 'active', workspace_ids: ['ws-1'] },
    });

    await expect(renderHome()).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectMock).toHaveBeenCalledExactlyOnceWith('/sheets');
  });

  it('session token が不正 (期限切れ等) なら redirect せず稼働確認表示のまま', async () => {
    getCookie.mockReturnValue({ value: 'expired-token' });
    verifySessionToken.mockResolvedValue({ ok: false, reason: 'expired' });

    const html = await renderHome();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(html).toContain('稼働状況');
  });
});

describe('TID-SCOPE: 明示ヘッダーと session の合流真理値表', () => {
  it('TID-SCOPE-01: explicit なし・session なし -> missing_tenant_scope (deny-by-default 非退行)', () => {
    const decision = authorize({ pathname: '/api/documents', headers: headers({}), principal });
    expect(decision).toMatchObject({ allowed: false, reason: 'missing_tenant_scope', status: 403 });
  });

  it('TID-SCOPE-02: explicit あり(正)・session なし -> explicit を採用', () => {
    const decision = authorize({
      pathname: '/api/documents',
      headers: headers({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-1' }),
      principal,
    });
    expect(decision).toMatchObject({ allowed: true, scope: { tenantId: 'tenant-a', workspaceId: 'ws-1' } });
  });

  it('TID-SCOPE-03: explicit なし・session あり(正) -> session を採用', () => {
    const decision = authorize({
      pathname: '/api/documents',
      headers: headers({ cookie: cookie('ws-2') }),
      principal,
    });
    expect(decision).toMatchObject({ allowed: true, scope: { tenantId: 'tenant-a', workspaceId: 'ws-2' } });
  });

  it('TID-SCOPE-04: explicit・session が tenantId/workspaceId とも一致 -> 一致した scope を採用', () => {
    const decision = authorize({
      pathname: '/api/documents',
      headers: headers({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-1', cookie: cookie('ws-1') }),
      principal,
    });
    expect(decision).toMatchObject({ allowed: true, scope: { tenantId: 'tenant-a', workspaceId: 'ws-1' } });
  });

  it('TID-SCOPE-05: explicit・session が不一致 -> ambiguous_scope (推測で片方を優先しない)', () => {
    const decision = authorize({
      pathname: '/api/documents',
      headers: headers({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-1', cookie: cookie('ws-2') }),
      principal,
    });
    expect(decision).toMatchObject({ allowed: false, reason: 'ambiguous_scope', status: 403 });
  });
});

describe('TID-INT-04: 業務画面 6 種は session scope のみで 403 missing_tenant_scope にならない', () => {
  const businessScreens = [
    '/sheets',
    '/sheets/new',
    '/sheets/sheet-1',
    '/catalog',
    '/catalog/releases',
    '/catalog/project-1',
  ];

  it.each(businessScreens)('%s へ session scope のみで到達できる', (pathname) => {
    const decision = authorize({
      pathname,
      headers: headers({ cookie: cookie('ws-1') }),
      principal,
    });
    expect(decision.allowed).toBe(true);
  });
});

describe('TID-INT-05: 着地先解決の結果 path にも通常の authorize() が適用される (redirect を迂回路にしない)', () => {
  it('解決済み着地先 (/sheets) は session scope 無しでは missing_tenant_scope のまま', () => {
    const decision = authorize({ pathname: '/sheets', headers: headers({}), principal });
    expect(decision).toMatchObject({ allowed: false, reason: 'missing_tenant_scope', status: 403 });
  });

  it('解決済み着地先 (/sheets) は所属外 workspace への session cookie では workspace_not_member', () => {
    const decision = authorize({
      pathname: '/sheets',
      headers: headers({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-9' }),
      principal,
    });
    expect(decision).toMatchObject({ allowed: false, reason: 'workspace_not_member', status: 403 });
  });
});
