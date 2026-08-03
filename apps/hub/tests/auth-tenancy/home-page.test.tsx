// spec: harness-hub-post-signin-workspace-scope-addendum §C (AC3: 認証済み session で / を開くと既定着地へ redirect)
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME, signSessionToken } from '../../src/lib/auth/index.js';
import { DEFAULT_LANDING_PATH } from '../../src/lib/routing/post-signin-landing.js';

const SESSION_SECRET = 'home-page-test-secret';
const NOW_SECONDS = 1_800_000_000;

const { redirect, headers, authRuntime } = vi.hoisted(() => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
  headers: vi.fn(),
  authRuntime: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/headers', () => ({ headers }));
vi.mock('../../src/lib/authz/index.js', () => ({ authRuntime }));

const HomePage = (await import('../../src/app/page.js')).default;

function withCookie(cookieHeader: string | null): void {
  headers.mockResolvedValue({ get: (name: string) => (name === 'cookie' ? cookieHeader : null) });
}

function withRuntime(): void {
  authRuntime.mockReturnValue({
    authz: { sessionSecret: SESSION_SECRET, revocation: { isRevoked: async () => false } },
    ports: { clock: { nowSeconds: () => NOW_SECONDS } },
  });
}

describe('/ (root) の session-aware redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirect.mockImplementation((target: string) => {
      throw new Error(`NEXT_REDIRECT:${target}`);
    });
  });

  it('AC3: 認証済み session なら既定着地へ redirect する', async () => {
    withRuntime();
    const token = await signSessionToken(
      {
        sub: 'user-1',
        tenant_id: 'tenant-a',
        role: 'member',
        status: 'active',
        workspace_ids: ['ws-1'],
        iat: NOW_SECONDS,
        exp: NOW_SECONDS + 3600,
      },
      SESSION_SECRET,
    );
    withCookie(`${SESSION_COOKIE_NAME}=${token}`);

    await expect(HomePage()).rejects.toThrow(`NEXT_REDIRECT:${DEFAULT_LANDING_PATH}`);
  });

  it('未認証なら稼働状況ページをそのまま表示する (redirect しない)', async () => {
    withRuntime();
    withCookie(null);

    const element = await HomePage();
    expect(redirect).not.toHaveBeenCalled();
    expect(element).not.toBeNull();
  });

  it('認証基盤が未結線でも稼働状況ページの表示を続ける (fail-open で落とさない)', async () => {
    authRuntime.mockImplementation(() => {
      throw new Error('AUTH_SESSION_SECRET が未設定です');
    });
    withCookie(`${SESSION_COOKIE_NAME}=irrelevant`);

    const element = await HomePage();
    expect(redirect).not.toHaveBeenCalled();
    expect(element).not.toBeNull();
  });
});
