/**
 * HarnessHub-6o0r: GET /catalog へのハードナビゲーション到達性の確定 (issue-hub-catalog-scope-unreachable-20260802)。
 *
 * 通常の session を持つブラウザのページ遷移はカスタムヘッダを送れない。
 * そのため単一 workspace 所属の session は server 側で active scope を安全に解決し、
 * 実際の Next.js middleware を通っても業務画面へ到達できることを固定する。
 * `?tenant=&workspace=` は middleware の認可入力ではなく、query string で scope を
 * 偽装できないことも同時に確認する。
 *
 * `__cwv_probe` を使う短命・署名済みの CWV 計測経路は別物であり、
 * `apps/hub/tests/security/middleware-entry.test.ts` がその到達性と閉域性を検証する。
 */
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../lib/auth/config.js';
import { buildSessionClaims, type DirectoryUser, signSessionToken } from '../../lib/auth/index.js';
import { authorize } from '../../middleware-contract.js';
import type { Principal } from '../../shared/auth/index.js';

const SESSION_SECRET = 'catalog-hard-navigation-test-secret';
const user: DirectoryUser = {
  id: 'user-1',
  tenantId: 'tenant-a',
  idpSubject: 'idp-user-1',
  name: '',
  email: '',
  workspaceIds: ['workspace-a1'],
  role: 'member',
  status: 'active',
};
const loggedInPrincipal: Principal = {
  subject: user.id,
  tenantId: user.tenantId,
  workspaceIds: user.workspaceIds,
  roles: [user.role],
};

const environmentKeys = [
  'AUTH_SESSION_SECRET',
  'AUTH_CANONICAL_ORIGIN',
  'CWV_PROBE_SECRET',
  'CWV_PROBE_TENANT_ID',
  'CWV_PROBE_WORKSPACE_ID',
] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));

type MiddlewareModule = typeof import('../../middleware.js');

function restoreEnvironment(): void {
  for (const key of environmentKeys) {
    const original = originalEnvironment.get(key);
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
}

async function loadSessionMiddleware(): Promise<MiddlewareModule> {
  vi.resetModules();
  process.env.AUTH_SESSION_SECRET = SESSION_SECRET;
  for (const key of environmentKeys.slice(1)) delete process.env[key];
  return import('../../middleware.js');
}

async function sessionCookie(directoryUser: DirectoryUser = user): Promise<string> {
  const claims = buildSessionClaims(directoryUser, Math.floor(Date.now() / 1000));
  return `${SESSION_COOKIE_NAME}=${await signSessionToken(claims, SESSION_SECRET)}`;
}

function requestFor(pathname: string, cookie: string): NextRequest {
  return new NextRequest(new URL(`https://hub.example.test${pathname}`), { headers: { cookie } });
}

afterEach(() => {
  restoreEnvironment();
  vi.resetModules();
});

describe('HH-6o0r / GET /catalog のハードナビゲーション到達性', () => {
  it('単一 workspace 所属の通常 session はクエリなし GET でも middleware を通過できる', async () => {
    const { middleware } = await loadSessionMiddleware();
    const response = await middleware(requestFor('/catalog', await sessionCookie()));

    expect(response.status).toBe(200);
  });

  it('query string の tenant/workspace は scope に使わず、session の安全な scope だけを使う', async () => {
    const { middleware } = await loadSessionMiddleware();
    const response = await middleware(
      requestFor('/catalog?tenant=tenant-b&workspace=workspace-b1', await sessionCookie()),
    );

    expect(response.status).toBe(200);
  });

  it('複数 workspace 所属で active workspace が未選択なら middleware で 403 のまま', async () => {
    const { middleware } = await loadSessionMiddleware();
    const response = await middleware(
      requestFor('/catalog', await sessionCookie({ ...user, workspaceIds: ['workspace-a1', 'workspace-a2'] })),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'missing_tenant_scope' });
  });

  it('明示ヘッダーで宣言した scope も従来どおり受け取る', () => {
    const decision = authorize({
      pathname: '/catalog',
      headers: new Map([
        ['x-harness-tenant-id', 'tenant-a'],
        ['x-harness-workspace-id', 'workspace-a1'],
      ]),
      principal: loggedInPrincipal,
    });

    expect(decision.allowed).toBe(true);
  });
});
