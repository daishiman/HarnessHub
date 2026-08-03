/**
 * HarnessHub-6o0r: GET /catalog へのハードナビゲーション到達性の確定 (issue-hub-catalog-scope-unreachable-20260802)。
 *
 * 通常の session を持つブラウザのページ遷移はカスタムヘッダを送れない。
 * session 由来の tenant scope を middleware が補完するため、実際の Next.js middleware
 * まで通しても `/catalog` に到達できることを固定する。`?tenant=&workspace=` は
 * middleware の認可入力ではないため、session 由来の結果を変えない。
 *
 * `__cwv_probe` を使う短命・署名済みの CWV 計測経路は別物であり、
 * `apps/hub/tests/security/middleware-entry.test.ts` がその到達性と閉域性を検証する。
 */
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../lib/auth/config.js';
import { buildSessionClaims, type DirectoryUser, signSessionToken } from '../../lib/auth/index.js';
import { authorize } from '../../middleware/index.js';
import type { Principal } from '../../shared/auth/index.js';

const SESSION_SECRET = 'catalog-hard-navigation-test-secret';
const user: DirectoryUser = {
  id: 'user-1',
  tenantId: 'tenant-a',
  idpSubject: 'idp-user-1',
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

async function sessionCookie(): Promise<string> {
  const claims = buildSessionClaims(user, Math.floor(Date.now() / 1000));
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
  it('通常 session のクエリなし GET は session scope 補完により middleware を通過する', async () => {
    const { middleware } = await loadSessionMiddleware();
    const response = await middleware(requestFor('/catalog', await sessionCookie()));

    expect(response.status).toBe(200);
  });

  it('?tenant=&workspace= は認可入力にせず、通常 session の GET は同じく通過する', async () => {
    const { middleware } = await loadSessionMiddleware();
    const response = await middleware(
      requestFor('/catalog?tenant=tenant-a&workspace=workspace-a1', await sessionCookie()),
    );

    expect(response.status).toBe(200);
  });

  it('通常の認可層は path / header の宣言済み scope だけを受け取る', () => {
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
