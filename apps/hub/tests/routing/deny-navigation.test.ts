/**
 * 拒否応答の出し分けの検査。
 *
 * middleware は拒否理由をそのまま JSON で返しており、ページ遷移で拒否された利用者の画面には
 * 生の `{"error":"missing_tenant_scope"}` が出ていた。ここで固定するのは次の 2 点。
 *   1. ブラウザの画面遷移 (GET + `Accept: text/html`) には人間が読める HTML を返すこと
 *   2. API 経路 (fetch / Bearer / `/api/*`) の JSON 契約と status は一切変わらないこと
 */
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { buildSessionClaims, type DirectoryUser, signSessionToken } from '../../src/lib/auth/index.js';
import { isNavigationRequest, renderDenyNavigationPage } from '../../src/lib/routing/deny-navigation.js';

const SESSION_SECRET = 'deny-navigation-test-secret';
const ORIGINAL_SECRET = process.env.AUTH_SESSION_SECRET;

const USER: DirectoryUser = {
  id: 'user-1',
  tenantId: 'tenant-a',
  idpSubject: 'idp-user-1',
  role: 'member',
  status: 'active',
  // 2 件所属 = cookie 無しでは active workspace が決まらず missing_tenant_scope になる利用者
  workspaceIds: ['ws-1', 'ws-2'],
};

type MiddlewareModule = typeof import('../../src/middleware.js');
let loaded: MiddlewareModule;

// middleware.ts はモジュール評価時に AUTH_SESSION_SECRET を読むため、差し替えてから読み直す
beforeAll(async () => {
  vi.resetModules();
  process.env.AUTH_SESSION_SECRET = SESSION_SECRET;
  loaded = await import('../../src/middleware.js');
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SESSION_SECRET;
  else process.env.AUTH_SESSION_SECRET = ORIGINAL_SECRET;
  vi.resetModules();
});

async function sessionCookie(): Promise<string> {
  const claims = buildSessionClaims(USER, Math.floor(Date.now() / 1000));
  return `${SESSION_COOKIE_NAME}=${await signSessionToken(claims, SESSION_SECRET)}`;
}

function requestFor(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(`https://hub.example.com${pathname}`), { headers });
}

/** ブラウザの通常遷移が送る Accept (Chrome/Safari と同形) */
const BROWSER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

describe('画面遷移とみなす条件', () => {
  it('GET + text/html + Bearer 無し + API 外だけを画面遷移とみなす', () => {
    expect(isNavigationRequest({ method: 'GET', pathname: '/sheets', accept: BROWSER_ACCEPT, hasBearer: false })).toBe(
      true,
    );
  });

  it.each([
    ['POST', { method: 'POST', pathname: '/sheets', accept: BROWSER_ACCEPT, hasBearer: false }],
    ['Bearer 付き', { method: 'GET', pathname: '/sheets', accept: BROWSER_ACCEPT, hasBearer: true }],
    ['API 配下', { method: 'GET', pathname: '/api/documents', accept: BROWSER_ACCEPT, hasBearer: false }],
    ['fetch の JSON 要求', { method: 'GET', pathname: '/sheets', accept: 'application/json', hasBearer: false }],
    ['Accept 無し', { method: 'GET', pathname: '/sheets', accept: null, hasBearer: false }],
    ['client 遷移 (RSC payload)', { method: 'GET', pathname: '/sheets', accept: 'text/x-component', hasBearer: false }],
  ])('%s は画面遷移とみなさない (JSON 契約を維持する)', (_label, input) => {
    expect(isNavigationRequest(input)).toBe(false);
  });
});

describe('拒否理由の案内', () => {
  it('workspace 未確定は「選び直す」動線を出す (行き止まりにしない)', () => {
    const html = renderDenyNavigationPage('missing_tenant_scope');

    expect(html).toContain('<html lang="ja">');
    expect(html).toContain('Workspace');
    expect(html).toContain('href="/"');
  });

  it('tenant_mismatch は理由に触れず、戻り先も示さない (存在秘匿 T-ISO-06)', () => {
    const html = renderDenyNavigationPage('tenant_mismatch');

    expect(html).toContain('ページが見つかりません');
    expect(html).not.toContain('テナント');
    expect(html).not.toContain('href="/"');
  });

  it('拒否理由の文字列そのものは画面へ出さない', () => {
    expect(renderDenyNavigationPage('missing_tenant_scope')).not.toContain('missing_tenant_scope');
  });
});

describe('middleware の拒否応答', () => {
  it('ブラウザの画面遷移には HTML を返す (生の JSON を画面へ出さない)', async () => {
    const response = await loaded.middleware(
      requestFor('/sheets', { cookie: await sessionCookie(), accept: BROWSER_ACCEPT }),
    );

    // status と判定はそのまま。表現だけが変わる
    expect(response.status).toBe(403);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('no-store');

    const body = await response.text();
    expect(body).toContain('Workspace');
    expect(body).not.toContain('missing_tenant_scope');
  });

  it('同じ path でも fetch (JSON) の拒否は従来どおり JSON のまま', async () => {
    const response = await loaded.middleware(
      requestFor('/sheets', { cookie: await sessionCookie(), accept: 'application/json' }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'missing_tenant_scope' });
  });

  it('API 配下は Accept が text/html でも JSON のまま', async () => {
    const response = await loaded.middleware(
      requestFor('/api/documents', { cookie: await sessionCookie(), accept: BROWSER_ACCEPT }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'missing_tenant_scope' });
  });

  it('未認証の画面遷移も HTML で案内する (401 のまま)', async () => {
    const response = await loaded.middleware(requestFor('/sheets', { accept: BROWSER_ACCEPT }));

    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('text/html');
    await expect(response.text()).resolves.toContain('サインイン');
  });

  it('存在秘匿の 404 は画面遷移でも 404 のまま返す', async () => {
    const response = await loaded.middleware(
      requestFor('/t/tenant-b/docs', { cookie: await sessionCookie(), accept: BROWSER_ACCEPT }),
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toContain('ページが見つかりません');
  });
});
