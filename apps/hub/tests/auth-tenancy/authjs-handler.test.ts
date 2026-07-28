/**
 * Auth.js 本番 adapter の直接検査 (HarnessHub-b7ng AC-1 / AC-2)。
 *
 * 設定オブジェクトだけを検査すると、`@auth/core` へ渡したときの basePath・cookie 名・JWT bridge の
 * 食い違いを見逃す。このテストは実際の `Auth()` を通し、外部 IdP への通信が不要な
 * providers/session endpoint で route 結線と session の共通検証経路を確かめる。
 */

import { describe, expect, it } from 'vitest';
import { tenantOidcSigninAction } from '../../src/app/[tenant_slug]/signin/tenant-oidc-action.js';
import { createAuthjsHandler, SESSION_COOKIE_NAME, signSessionToken } from '../../src/lib/auth/index.js';
import { createInMemoryOidcConnections, createInMemoryUsers, createMutableClock } from './support/in-memory-ports.js';

const SESSION_SECRET = 'test-session-secret-at-least-32-bytes';
const CANONICAL_ORIGIN = 'https://hub.example.com';
const NOW_SECONDS = 1_800_000_000;

function createHandler() {
  const oidcConnections = createInMemoryOidcConnections([
    {
      tenantId: 'tenant-acme',
      tenantSlug: 'acme',
      issuer: 'https://idp.acme.example.com',
      clientId: 'client-acme',
      displayName: 'Acme ID',
      enabled: true,
    },
  ]);

  return createAuthjsHandler({
    config: {
      oidcConnections,
      clientSecretFor: async (tenantId) => (tenantId === 'tenant-acme' ? 'client-secret-acme' : null),
    },
    users: createInMemoryUsers(),
    clock: createMutableClock(NOW_SECONDS),
    sessionSecret: SESSION_SECRET,
    canonicalOrigin: CANONICAL_ORIGIN,
  });
}

describe('Auth.js route 結線 (AC-1)', () => {
  it('テナント別サインイン画面を handler と同じ tenant path へ接続する', () => {
    expect(tenantOidcSigninAction('acme')).toBe('/api/auth/acme/signin/tenant-oidc');
    expect(tenantOidcSigninAction('tenant/subpath')).toBe('/api/auth/tenant%2Fsubpath/signin/tenant-oidc');
  });

  it('tenant 別 provider を実 Auth.js endpoint から返し、callback origin を正規値へ固定する', async () => {
    const response = await createHandler()(new Request('https://forged-host.example/api/auth/acme/providers'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      'tenant-oidc': {
        id: 'tenant-oidc',
        name: 'Acme ID',
        type: 'oidc',
        signinUrl: `${CANONICAL_ORIGIN}/api/auth/acme/signin/tenant-oidc`,
        callbackUrl: `${CANONICAL_ORIGIN}/api/auth/acme/callback/tenant-oidc`,
      },
    });
  });

  it('tenant の無い path と未登録 tenant を既定 provider へ落とさず拒否する', async () => {
    const handler = createHandler();

    const missing = await handler(new Request(`${CANONICAL_ORIGIN}/api/auth/session`));
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({ error: 'tenant_slug_required' });

    const unknown = await handler(new Request(`${CANONICAL_ORIGIN}/api/auth/unknown/providers`));
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toMatchObject({ error: 'tenant_oidc_not_configured' });
  });
});

describe('Auth.js session bridge (AC-2)', () => {
  it('既存 signSessionToken の cookie を Auth.js session endpoint が同じ claims として認識する', async () => {
    const claims = {
      sub: 'user-acme',
      tenant_id: 'tenant-acme',
      role: 'member' as const,
      status: 'active' as const,
      workspace_ids: ['workspace-acme'],
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 3600,
    };
    const token = await signSessionToken(claims, SESSION_SECRET);

    const response = await createHandler()(
      new Request(`${CANONICAL_ORIGIN}/api/auth/acme/session`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      harnessHub: {
        userId: claims.sub,
        tenantId: claims.tenant_id,
        role: claims.role,
        status: claims.status,
        workspaceIds: claims.workspace_ids,
      },
    });
  });

  it('別鍵で署名された cookie は session として認識しない', async () => {
    const forged = await signSessionToken(
      {
        sub: 'user-acme',
        tenant_id: 'tenant-acme',
        role: 'workspace-admin',
        status: 'active',
        workspace_ids: ['workspace-acme'],
        iat: NOW_SECONDS,
        exp: NOW_SECONDS + 3600,
      },
      'different-session-secret-at-least-32-bytes',
    );

    const response = await createHandler()(
      new Request(`${CANONICAL_ORIGIN}/api/auth/acme/session`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${forged}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });
});
