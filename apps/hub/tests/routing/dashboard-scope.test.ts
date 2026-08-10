/**
 * TID-DSCOPE-01〜07: `resolveDashboardScope` (ログイン直後の URL クエリ無しフォールバック) の入力分類。
 *
 * middleware の `resolveSessionScope` (src/middleware/authz.ts) をそのまま呼ぶ実装であるため、
 * ここでは「呼び出し前段の分岐 (secret 未設定・token 無し・検証失敗・無効化ユーザー)」と
 * 「resolveSessionScope の結果をそのまま素通しすること (ペアで解決/ペアで諦める契約の遵守)」を検証する。
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { ACTIVE_WORKSPACE_COOKIE_NAME } from '../../src/lib/auth/session.js';

const { getCookie, cookies, verifySessionToken } = vi.hoisted(() => {
  const getCookie = vi.fn();
  return {
    getCookie,
    cookies: vi.fn(async () => ({ get: getCookie })),
    verifySessionToken: vi.fn(),
  };
});

vi.mock('next/headers', () => ({ cookies }));
vi.mock('../../src/lib/auth/session.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/auth/session.js')>('../../src/lib/auth/session.js');
  return { ...actual, verifySessionToken };
});

const { resolveDashboardScope } = await import('../../src/lib/routing/dashboard-scope.js');

function baseClaims(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sub: 'user-1',
    tenant_id: 'tenant-a',
    role: 'member',
    status: 'active',
    workspace_ids: ['ws-1'],
    ...overrides,
  };
}

describe('TID-DSCOPE: resolveDashboardScope の入力分類', () => {
  const ORIGINAL_SECRET = process.env.AUTH_SESSION_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SESSION_SECRET = 'test-secret';
    getCookie.mockImplementation((name: string) => (name === SESSION_COOKIE_NAME ? { value: 'token' } : undefined));
  });

  afterAll(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.AUTH_SESSION_SECRET;
    } else {
      process.env.AUTH_SESSION_SECRET = ORIGINAL_SECRET;
    }
  });

  it('TID-DSCOPE-01: AUTH_SESSION_SECRET 未設定 -> 空 scope', async () => {
    delete process.env.AUTH_SESSION_SECRET;

    await expect(resolveDashboardScope()).resolves.toEqual({ tenantId: null, workspaceId: null });
  });

  it('TID-DSCOPE-08: secret 未設定でも cookies() へ到達する (呼び出し元 page が静的化されない)', async () => {
    delete process.env.AUTH_SESSION_SECRET;

    await resolveDashboardScope();

    // Next.js は「実行時に動的 API へ到達したか」で route を静的化する。secret 未設定のビルド環境で
    // cookies() の手前に early return が入ると、呼び出し元の page が静的化され本番で DYNAMIC_SERVER_USAGE (500) になる
    // (2026-08-08 の `/` の障害と同型)。判定順を戻したらここで落とす。
    expect(cookies).toHaveBeenCalled();
  });

  it('TID-DSCOPE-02: session cookie 無し -> 空 scope', async () => {
    getCookie.mockReturnValue(undefined);

    await expect(resolveDashboardScope()).resolves.toEqual({ tenantId: null, workspaceId: null });
  });

  it('TID-DSCOPE-03: 署名検証失敗 (期限切れ等) -> 空 scope', async () => {
    verifySessionToken.mockResolvedValue({ ok: false, reason: 'expired' });

    await expect(resolveDashboardScope()).resolves.toEqual({ tenantId: null, workspaceId: null });
  });

  it('TID-DSCOPE-04: claims.status が active でない (無効化ユーザー) -> 空 scope (session-provider.ts と同じ基準)', async () => {
    verifySessionToken.mockResolvedValue({ ok: true, claims: baseClaims({ status: 'disabled' }) });

    await expect(resolveDashboardScope()).resolves.toEqual({ tenantId: null, workspaceId: null });
  });

  it('TID-DSCOPE-05: 単一 workspace 所属・active workspace cookie 無し -> 自動確定した scope を返す', async () => {
    verifySessionToken.mockResolvedValue({ ok: true, claims: baseClaims({ workspace_ids: ['ws-1'] }) });

    await expect(resolveDashboardScope()).resolves.toEqual({ tenantId: 'tenant-a', workspaceId: 'ws-1' });
  });

  it('TID-DSCOPE-06: 複数 workspace 所属・active workspace cookie 無し -> workspaceId を確定できないため tenantId もペアで空にする', async () => {
    verifySessionToken.mockResolvedValue({
      ok: true,
      claims: baseClaims({ workspace_ids: ['ws-1', 'ws-2'] }),
    });

    // resolveSessionScope と同じ「ペアで解決/ペアで諦める」契約: workspaceId が不定なら tenantId も返さない。
    // ここが崩れると、tenantId だけ入って workspace 未指定のままテナント全体スコープで通ってしまう回帰になる。
    await expect(resolveDashboardScope()).resolves.toEqual({ tenantId: null, workspaceId: null });
  });

  it('TID-DSCOPE-07: 複数 workspace 所属・active workspace cookie あり -> cookie が指す workspace で確定', async () => {
    getCookie.mockImplementation((name: string) => {
      if (name === SESSION_COOKIE_NAME) return { value: 'token' };
      if (name === ACTIVE_WORKSPACE_COOKIE_NAME) return { value: 'ws-2' };
      return undefined;
    });
    verifySessionToken.mockResolvedValue({
      ok: true,
      claims: baseClaims({ workspace_ids: ['ws-1', 'ws-2'] }),
    });

    await expect(resolveDashboardScope()).resolves.toEqual({ tenantId: 'tenant-a', workspaceId: 'ws-2' });
  });
});
