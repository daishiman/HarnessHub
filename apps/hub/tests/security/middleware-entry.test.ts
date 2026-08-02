// HF-QA-TENANT-005: Next.js middleware エントリ (src/middleware.ts) の配線を検証する。
// 判定そのものは authz-deny-by-default.test.ts が持つので、ここは
// 「秘密の有無で provider 結線が変わるか」と「decision が NextResponse へ写るか」に絞る。
import { NextRequest } from 'next/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { buildSessionClaims, type DirectoryUser, signJwt, signSessionToken } from '../../src/lib/auth/index.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../src/middleware/scope.js';

const SESSION_SECRET = 'middleware-entry-test-secret';
const ACCESS_TOKEN_SECRET = 'middleware-entry-access-token-secret';
const ORIGINAL_SECRET = process.env.AUTH_SESSION_SECRET;
const ORIGINAL_ACCESS_TOKEN_SECRET = process.env.AUTH_ACCESS_TOKEN_SECRET;
const ORIGINAL_CANONICAL_ORIGIN = process.env.AUTH_CANONICAL_ORIGIN;
const ORIGINAL_CWV_PROBE_SECRET = process.env.CWV_PROBE_SECRET;
const ORIGINAL_CWV_PROBE_TENANT_ID = process.env.CWV_PROBE_TENANT_ID;
const ORIGINAL_CWV_PROBE_WORKSPACE_ID = process.env.CWV_PROBE_WORKSPACE_ID;

const USER: DirectoryUser = {
  id: 'user-1',
  tenantId: 'tenant-a',
  idpSubject: 'idp-user-1',
  role: 'member',
  status: 'active',
  workspaceIds: ['ws-1'],
};

type MiddlewareModule = typeof import('../../src/middleware.js');

/**
 * middleware.ts は**モジュール評価時**に AUTH_SESSION_SECRET を読む。
 * 秘密の有無による分岐を見るには、環境変数を差し替えてから読み直すしかない。
 */
async function loadMiddleware(
  secret: string | undefined,
  accessTokenSecret: string | undefined,
): Promise<MiddlewareModule> {
  vi.resetModules();
  if (secret === undefined) delete process.env.AUTH_SESSION_SECRET;
  else process.env.AUTH_SESSION_SECRET = secret;
  if (accessTokenSecret === undefined) delete process.env.AUTH_ACCESS_TOKEN_SECRET;
  else process.env.AUTH_ACCESS_TOKEN_SECRET = accessTokenSecret;
  return import('../../src/middleware.js');
}

async function loadCwvProbeMiddleware(): Promise<MiddlewareModule> {
  vi.resetModules();
  process.env.AUTH_CANONICAL_ORIGIN = 'https://hub.example.com';
  process.env.CWV_PROBE_SECRET = 'cwv-probe-secret';
  process.env.CWV_PROBE_TENANT_ID = USER.tenantId;
  process.env.CWV_PROBE_WORKSPACE_ID = USER.workspaceIds[0] ?? '';
  return import('../../src/middleware.js');
}

// 読み直しは 1 回 1〜8 秒かかるので、秘密の設定ごとに 1 度だけ行って使い回す。
// 評価済みモジュールは自分の authAdapter を閉じ込めているので、後から env を戻しても挙動は変わらない
const loaded = {} as Record<'denyAll' | 'emptySecret' | 'secured', MiddlewareModule>;

beforeAll(async () => {
  try {
    loaded.denyAll = await loadMiddleware(undefined, undefined);
    loaded.emptySecret = await loadMiddleware('', '');
    loaded.secured = await loadMiddleware(SESSION_SECRET, ACCESS_TOKEN_SECRET);
  } finally {
    if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = ORIGINAL_SECRET;
    if (ORIGINAL_ACCESS_TOKEN_SECRET === undefined) delete process.env.AUTH_ACCESS_TOKEN_SECRET;
    else process.env.AUTH_ACCESS_TOKEN_SECRET = ORIGINAL_ACCESS_TOKEN_SECRET;
    vi.resetModules();
  }
});

function requestFor(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(`https://hub.example.com${pathname}`), { headers });
}

async function sessionCookie(user: DirectoryUser = USER, secret = SESSION_SECRET): Promise<string> {
  const claims = buildSessionClaims(user, Math.floor(Date.now() / 1000));
  return `${SESSION_COOKIE_NAME}=${await signSessionToken(claims, secret)}`;
}

async function accessToken(secret = ACCESS_TOKEN_SECRET): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      typ: 'access',
      sub: USER.id,
      tenant_id: USER.tenantId,
      workspace_id: USER.workspaceIds[0],
      token_id: 'publisher-token-1',
      role: USER.role,
      scope: ['publish:write'],
      iat: now,
      exp: now + 900,
    },
    secret,
  );
}

describe('middleware エントリの provider 結線', () => {
  it('AUTH_SESSION_SECRET が未設定なら、正しく署名された cookie を持つ要求も拒否する', async () => {
    const response = await loaded.denyAll.middleware(
      requestFor('/t/tenant-a/w/ws-1/docs', { cookie: await sessionCookie() }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthenticated' });
  });

  it('AUTH_SESSION_SECRET が空文字でも、未設定と同じく deny-all のままにする', async () => {
    const response = await loaded.emptySecret.middleware(
      requestFor('/t/tenant-a/w/ws-1/docs', { cookie: await sessionCookie() }),
    );

    expect(response.status).toBe(401);
  });

  it('AUTH_SESSION_SECRET が設定されていれば、署名済み cookie の主体を解決して通す', async () => {
    const response = await loaded.secured.middleware(
      requestFor('/t/tenant-a/w/ws-1/docs', { cookie: await sessionCookie() }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('秘密が設定されていても、別の鍵で署名された cookie は主体として扱わない', async () => {
    const response = await loaded.secured.middleware(
      requestFor('/t/tenant-a/w/ws-1/docs', { cookie: await sessionCookie(USER, 'another-secret') }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthenticated' });
  });

  it('cookie が無い要求は未認証として拒否する', async () => {
    const response = await loaded.secured.middleware(requestFor('/t/tenant-a/w/ws-1/docs'));

    expect(response.status).toBe(401);
  });

  it('AUTH_ACCESS_TOKEN_SECRET が設定されていれば、署名済み Bearer の主体を解決して通す', async () => {
    const response = await loaded.secured.middleware(
      requestFor('/api/v1/publish', {
        authorization: `Bearer ${await accessToken()}`,
        [TENANT_HEADER]: USER.tenantId,
        [WORKSPACE_HEADER]: USER.workspaceIds[0] ?? '',
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('Bearer の検証鍵が未設定なら、正しく署名された token でも fail-closed にする', async () => {
    const response = await loaded.denyAll.middleware(
      requestFor('/api/v1/publish', {
        authorization: `Bearer ${await accessToken()}`,
        [TENANT_HEADER]: USER.tenantId,
        [WORKSPACE_HEADER]: USER.workspaceIds[0] ?? '',
      }),
    );

    expect(response.status).toBe(401);
  });

  it('無効な Bearer があれば、有効な session cookie へ fallback しない', async () => {
    const response = await loaded.secured.middleware(
      requestFor('/api/v1/publish', {
        authorization: `Bearer ${await accessToken('another-access-secret')}`,
        cookie: await sessionCookie(),
        [TENANT_HEADER]: USER.tenantId,
        [WORKSPACE_HEADER]: USER.workspaceIds[0] ?? '',
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthenticated' });
  });
});

describe('middleware の decision と NextResponse の対応', () => {
  it('public path は認証なしでも次のハンドラへ委譲する', async () => {
    const response = await loaded.secured.middleware(requestFor('/health'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('拒否理由と status を JSON 応答へそのまま写す', async () => {
    const { middleware } = loaded.secured;
    const cookie = await sessionCookie();

    const mismatch = await middleware(requestFor('/t/tenant-b/docs', { cookie }));
    expect(mismatch.status).toBe(403);
    await expect(mismatch.json()).resolves.toEqual({ error: 'tenant_mismatch' });

    const missingScope = await middleware(requestFor('/api/documents', { cookie }));
    expect(missingScope.status).toBe(403);
    await expect(missingScope.json()).resolves.toEqual({ error: 'missing_tenant_scope' });
  });

  it('header 由来のスコープも判定へ渡す', async () => {
    const { middleware } = loaded.secured;
    const cookie = await sessionCookie();

    const allowed = await middleware(
      requestFor('/api/documents', {
        cookie,
        [TENANT_HEADER.toUpperCase()]: 'tenant-a',
        [WORKSPACE_HEADER]: 'ws-1',
      }),
    );
    expect(allowed.status).toBe(200);

    const denied = await middleware(
      requestFor('/api/documents', { cookie, [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-9' }),
    );
    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toEqual({ error: 'workspace_not_member' });
  });
});

describe('middleware の matcher', () => {
  it('静的アセットだけを除外し、それ以外は全て middleware を通す', () => {
    const matcher = new RegExp(`^${loaded.secured.config.matcher[0]}$`);

    expect(matcher.test('/_next/static/chunk.js')).toBe(false);
    expect(matcher.test('/_next/image')).toBe(false);
    expect(matcher.test('/api/documents')).toBe(true);
    expect(matcher.test('/acme/signin')).toBe(true);
  });
});

describe('CWV 専用 credential の bootstrap', () => {
  it('ticket を URL から除去して __Host Cookie 化し、catalog の GET だけを通す', async () => {
    const now = Math.floor(Date.now() / 1000);
    const cwvTicket = await signJwt(
      {
        typ: 'cwv_probe',
        aud: 'harness-hub-cwv',
        origin: 'https://hub.example.com',
        tenant_id: USER.tenantId,
        workspace_id: USER.workspaceIds[0],
        iat: now,
        exp: now + 300,
      },
      'cwv-probe-secret',
    );

    try {
      const cwv = await loadCwvProbeMiddleware();
      const bootstrap = await cwv.middleware(
        requestFor(`/catalog?tenant=${USER.tenantId}&workspace=${USER.workspaceIds[0]}&__cwv_probe=${cwvTicket}`),
      );
      expect(bootstrap.status).toBe(307);
      expect(bootstrap.headers.get('location')).not.toContain('__cwv_probe');
      expect(bootstrap.headers.get('cache-control')).toBe('no-store');
      expect(bootstrap.headers.get('referrer-policy')).toBe('no-referrer');
      const setCookie = bootstrap.headers.get('set-cookie') ?? '';
      expect(setCookie).toContain('__Host-harness-hub.cwv-probe=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Secure');
      expect(setCookie).toContain('SameSite=strict');
      expect(setCookie).toContain('Path=/');

      const catalog = await cwv.middleware(
        requestFor(`/catalog?tenant=${USER.tenantId}&workspace=${USER.workspaceIds[0]}`, { cookie: setCookie }),
      );
      expect(catalog.status).toBe(200);
      expect(catalog.headers.get('x-middleware-next')).toBe('1');

      const publicPathRejected = await cwv.middleware(
        new NextRequest(new URL('/api/auth/signin', 'https://hub.example.com'), { headers: { cookie: setCookie } }),
      );
      expect(publicPathRejected.status).toBe(403);

      const rejected = await cwv.middleware(
        new NextRequest(new URL('/catalog', 'https://hub.example.com'), {
          method: 'POST',
          headers: { cookie: setCookie },
        }),
      );
      expect(rejected.status).toBe(403);
      await expect(rejected.json()).resolves.toEqual({ error: 'credential_not_allowed' });
    } finally {
      if (ORIGINAL_CANONICAL_ORIGIN === undefined) delete process.env.AUTH_CANONICAL_ORIGIN;
      else process.env.AUTH_CANONICAL_ORIGIN = ORIGINAL_CANONICAL_ORIGIN;
      if (ORIGINAL_CWV_PROBE_SECRET === undefined) delete process.env.CWV_PROBE_SECRET;
      else process.env.CWV_PROBE_SECRET = ORIGINAL_CWV_PROBE_SECRET;
      if (ORIGINAL_CWV_PROBE_TENANT_ID === undefined) delete process.env.CWV_PROBE_TENANT_ID;
      else process.env.CWV_PROBE_TENANT_ID = ORIGINAL_CWV_PROBE_TENANT_ID;
      if (ORIGINAL_CWV_PROBE_WORKSPACE_ID === undefined) delete process.env.CWV_PROBE_WORKSPACE_ID;
      else process.env.CWV_PROBE_WORKSPACE_ID = ORIGINAL_CWV_PROBE_WORKSPACE_ID;
      vi.resetModules();
    }
  });
});
