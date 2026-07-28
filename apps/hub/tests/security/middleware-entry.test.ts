// HF-QA-TENANT-005: Next.js middleware エントリ (src/middleware.ts) の配線を検証する。
// 判定そのものは authz-deny-by-default.test.ts が持つので、ここは
// 「秘密の有無で provider 結線が変わるか」と「decision が NextResponse へ写るか」に絞る。
import { NextRequest } from 'next/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { buildSessionClaims, type DirectoryUser, signSessionToken } from '../../src/lib/auth/index.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../src/middleware/scope.js';

const SESSION_SECRET = 'middleware-entry-test-secret';
const ORIGINAL_SECRET = process.env.AUTH_SESSION_SECRET;

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
async function loadMiddleware(secret: string | undefined): Promise<MiddlewareModule> {
  vi.resetModules();
  if (secret === undefined) delete process.env.AUTH_SESSION_SECRET;
  else process.env.AUTH_SESSION_SECRET = secret;
  return import('../../src/middleware.js');
}

// 読み直しは 1 回 1〜8 秒かかるので、秘密の設定ごとに 1 度だけ行って使い回す。
// 評価済みモジュールは自分の authAdapter を閉じ込めているので、後から env を戻しても挙動は変わらない
const loaded = {} as Record<'denyAll' | 'emptySecret' | 'secured', MiddlewareModule>;

beforeAll(async () => {
  try {
    loaded.denyAll = await loadMiddleware(undefined);
    loaded.emptySecret = await loadMiddleware('');
    loaded.secured = await loadMiddleware(SESSION_SECRET);
  } finally {
    if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = ORIGINAL_SECRET;
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
