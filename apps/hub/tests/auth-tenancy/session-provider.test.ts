/**
 * edge middleware へ差し込む provider 実体と、それを受ける共通 auth-adapter 境界の検査 (ADR AD-7)。
 *
 * この層が判断するのは **session cookie の署名検証まで**。緊急失効 (session_revocations) は
 * DB へ届く route 側の `withAuthz` が担うので、ここでは「主体として扱ってよい形か」だけを問う。
 * 署名は本物 (`signSessionToken`) を通す。ここをモックすると「検証が通ること」の意味が消える。
 */

import type { SessionClaims } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';
import { createSessionAuthProvider, SESSION_COOKIE_NAME, signSessionToken } from '../../src/lib/auth/index.js';
import {
  type AuthRequestContext,
  createAuthAdapter,
  type Principal,
  toAuthRequestContext,
} from '../../src/shared/auth/index.js';
import { createMutableClock } from './support/in-memory-ports.js';

const SESSION_SECRET = 'test-session-secret-at-least-32-bytes';
const OTHER_SECRET = 'different-session-secret-at-least-32-bytes';
const NOW_SECONDS = 1_800_000_000;
const REQUEST_URL = 'https://hub.example.com/t/tenant-a/w/ws-a1/docs';

function claims(overrides: Partial<SessionClaims> = {}): SessionClaims {
  return {
    sub: 'user-a',
    tenant_id: 'tenant-a',
    role: 'member',
    status: 'active',
    workspace_ids: ['ws-a1', 'ws-a2'],
    iat: NOW_SECONDS - 60,
    exp: NOW_SECONDS + 3600,
    ...overrides,
  };
}

function contextWith(cookieHeader: string | null): AuthRequestContext {
  const headers = new Map<string, string>();
  if (cookieHeader !== null) headers.set('cookie', cookieHeader);
  return { headers, url: REQUEST_URL };
}

function createProvider() {
  return createSessionAuthProvider({ sessionSecret: SESSION_SECRET, clock: createMutableClock(NOW_SECONDS) });
}

async function authenticateWith(cookieHeader: string | null): Promise<Principal | null> {
  return createProvider().authenticate(contextWith(cookieHeader));
}

describe('session provider の主体解決 (AD-7)', () => {
  it('署名済み cookie から Principal を組み立てる (role は文字列の集合として渡す)', async () => {
    const token = await signSessionToken(claims({ role: 'workspace-admin' }), SESSION_SECRET);

    const principal = await authenticateWith(`${SESSION_COOKIE_NAME}=${token}`);

    expect(principal).toEqual({
      subject: 'user-a',
      tenantId: 'tenant-a',
      workspaceIds: ['ws-a1', 'ws-a2'],
      roles: ['workspace-admin'],
    });
  });

  it('provider 名は結線先が識別できる固定値', () => {
    expect(createProvider().name).toBe('harness-hub-session');
  });

  it('cookie ヘッダが無ければ未認証', async () => {
    expect(await authenticateWith(null)).toBeNull();
  });

  it('別名の cookie しか無ければ未認証 (前方一致で拾わない)', async () => {
    const token = await signSessionToken(claims(), SESSION_SECRET);
    // `__Host-harness-hub.session` に似た名前を混ぜても取り違えないこと
    expect(await authenticateWith(`${SESSION_COOKIE_NAME}-decoy=${token}; other=value`)).toBeNull();
  });

  it('値が空の cookie は未認証', async () => {
    expect(await authenticateWith(`${SESSION_COOKIE_NAME}=`)).toBeNull();
  });

  it('別鍵で署名された cookie は未認証 (edge でも同じ鍵で検証する)', async () => {
    const forged = await signSessionToken(claims(), OTHER_SECRET);
    expect(await authenticateWith(`${SESSION_COOKIE_NAME}=${forged}`)).toBeNull();
  });

  it('期限切れの cookie は未認証', async () => {
    const expired = await signSessionToken(claims({ exp: NOW_SECONDS - 1 }), SESSION_SECRET);
    expect(await authenticateWith(`${SESSION_COOKIE_NAME}=${expired}`)).toBeNull();
  });

  it('署名が正しくても status が active でなければ主体として扱わない', async () => {
    const disabled = await signSessionToken(claims({ status: 'inactive' }), SESSION_SECRET);
    expect(await authenticateWith(`${SESSION_COOKIE_NAME}=${disabled}`)).toBeNull();
  });

  it('cookie が複数並んでいても目的の 1 本だけを見る', async () => {
    const token = await signSessionToken(claims(), SESSION_SECRET);
    const principal = await authenticateWith(`theme=dark; ${SESSION_COOKIE_NAME}=${token}; locale=ja`);

    expect(principal).toMatchObject({ subject: 'user-a', tenantId: 'tenant-a' });
  });
});

describe('共通 auth-adapter 境界への結線', () => {
  it('adapter 経由でも同じ Principal に解決し、provider 名を公開する', async () => {
    const adapter = createAuthAdapter(createProvider());
    const token = await signSessionToken(claims(), SESSION_SECRET);

    expect(adapter.providerName).toBe('harness-hub-session');
    await expect(adapter.resolvePrincipal(contextWith(`${SESSION_COOKIE_NAME}=${token}`))).resolves.toMatchObject({
      subject: 'user-a',
      roles: ['member'],
    });
  });

  it('Request から境界型を作るとき header の key を小文字へ正規化する', () => {
    const context = toAuthRequestContext(
      new Request(REQUEST_URL, { headers: { 'X-Harness-Tenant': 'tenant-a', Cookie: 'theme=dark' } }),
    );

    expect(context.url).toBe(REQUEST_URL);
    expect(context.headers.get('x-harness-tenant')).toBe('tenant-a');
    expect(context.headers.get('cookie')).toBe('theme=dark');
    // Request 実体に依存させないため、公開するのは Map だけ
    expect(context.headers).toBeInstanceOf(Map);
  });

  it('toAuthRequestContext で作った文脈をそのまま provider へ渡せる', async () => {
    const token = await signSessionToken(claims(), SESSION_SECRET);
    const context = toAuthRequestContext(
      new Request(REQUEST_URL, { headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } }),
    );

    await expect(createAuthAdapter(createProvider()).resolvePrincipal(context)).resolves.toMatchObject({
      subject: 'user-a',
      tenantId: 'tenant-a',
    });
  });

  it('tenantId の無い Principal を返す provider は認可層へ通さない', async () => {
    const adapter = createAuthAdapter({
      name: 'broken-tenant',
      authenticate: async () => ({ subject: 'user-a', tenantId: '', workspaceIds: [], roles: ['member'] }),
    });

    expect(await adapter.resolvePrincipal(contextWith(null))).toBeNull();
  });

  it('workspaceIds / roles が配列でない Principal も通さない', async () => {
    const notArrays = {
      subject: 'user-a',
      tenantId: 'tenant-a',
      workspaceIds: 'ws-a1',
      roles: 'member',
    } as unknown as Principal;
    const adapter = createAuthAdapter({ name: 'broken-scopes', authenticate: async () => notArrays });

    expect(await adapter.resolvePrincipal(contextWith(null))).toBeNull();
  });
});
