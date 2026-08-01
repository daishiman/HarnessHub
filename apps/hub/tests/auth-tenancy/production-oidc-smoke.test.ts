import { describe, expect, it, vi } from 'vitest';

// 実行用 CLI は Node が直接読める ESM として置くため、型をこのテスト境界で明示する。
// @ts-expect-error JavaScript CLI に対応する declaration file は意図的に持たない
import { runOidcSmoke as runOidcSmokeUntyped } from '../../scripts/smoke-production-oidc.mjs';

type SmokeResult = {
  readonly ok: boolean;
  readonly tenant: string;
  readonly checks: ReadonlyArray<{ readonly id: string; readonly name: string; readonly ok: boolean }>;
};

const runOidcSmoke = runOidcSmokeUntyped as (options: {
  origin: string;
  tenant: string;
  fetchImpl: typeof fetch;
}) => Promise<SmokeResult>;

const ORIGIN = 'https://hub.example.com';
const TENANT = 'harness-hub';
const BASE_PATH = `/api/auth/${TENANT}`;
const SIGNIN_URL = `${ORIGIN}${BASE_PATH}/signin/tenant-oidc`;
const CALLBACK_URL = `${ORIGIN}${BASE_PATH}/callback/tenant-oidc`;

function providersResponse() {
  return Response.json({
    'tenant-oidc': {
      id: 'tenant-oidc',
      name: 'Google',
      type: 'oidc',
      signinUrl: SIGNIN_URL,
      callbackUrl: CALLBACK_URL,
    },
  });
}

function csrfResponse() {
  return Response.json(
    { csrfToken: 'test-csrf-token' },
    { headers: { 'set-cookie': 'authjs.csrf-token=cookie-value; Path=/; HttpOnly; Secure; SameSite=Lax' } },
  );
}

function authorizationLocation(overrides: Record<string, string> = {}) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  const params = {
    response_type: 'code',
    redirect_uri: CALLBACK_URL,
    scope: 'openid email profile',
    state: 'state-value',
    nonce: 'nonce-value',
    code_challenge: 'challenge-value',
    code_challenge_method: 'S256',
    ...overrides,
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.href;
}

function successfulFetch(location = authorizationLocation()) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(providersResponse())
    .mockResolvedValueOnce(Response.json({ error: 'tenant_oidc_not_configured' }, { status: 404 }))
    .mockResolvedValueOnce(csrfResponse())
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location } }));
}

describe('production OIDC start-flow smoke', () => {
  it('tenant provider・未知tenant拒否・CSRF・Google state/nonce/PKCE を一往復で検証する', async () => {
    const fetchImpl = successfulFetch();

    await expect(runOidcSmoke({ origin: ORIGIN, tenant: TENANT, fetchImpl })).resolves.toEqual({
      ok: true,
      tenant: TENANT,
      checks: [
        { id: 'O1', name: 'tenant OIDC provider / canonical callback', ok: true },
        { id: 'O2', name: 'unknown tenant rejection', ok: true },
        { id: 'O3', name: 'CSRF token / cookie pair', ok: true },
        { id: 'O4', name: 'Google redirect / state / nonce / PKCE', ok: true },
      ],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const [signinUrl, signinInit] = fetchImpl.mock.calls[3] ?? [];
    expect(signinUrl).toBe(SIGNIN_URL);
    expect(signinInit).toMatchObject({
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: 'authjs.csrf-token=cookie-value',
      },
    });
    expect(new URLSearchParams(String(signinInit?.body))).toEqual(
      new URLSearchParams({ csrfToken: 'test-csrf-token', callbackUrl: ORIGIN }),
    );
  });

  it('provider callback が canonical origin と一致しなければ失敗する', async () => {
    const wrongProvider = Response.json({
      'tenant-oidc': {
        id: 'tenant-oidc',
        type: 'oidc',
        signinUrl: SIGNIN_URL,
        callbackUrl: 'https://forged.example/api/auth/harness-hub/callback/tenant-oidc',
      },
    });
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(wrongProvider);

    await expect(runOidcSmoke({ origin: ORIGIN, tenant: TENANT, fetchImpl })).rejects.toThrow('tenant OIDC contract');
  });

  it('CSRF cookie が無ければ signin POST へ進まない', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(providersResponse())
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ csrfToken: 'test-csrf-token' }));

    await expect(runOidcSmoke({ origin: ORIGIN, tenant: TENANT, fetchImpl })).rejects.toThrow('Set-Cookie was missing');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['Google 以外', 'https://evil.example/authorize', 'destination was not Google'],
    ['state 無し', authorizationLocation({ state: '' }), 'state was missing'],
    ['nonce 無し', authorizationLocation({ nonce: '' }), 'nonce was missing'],
    ['PKCE 無し', authorizationLocation({ code_challenge: '' }), 'code_challenge was missing'],
    ['PKCE plain', authorizationLocation({ code_challenge_method: 'plain' }), 'PKCE method was not S256'],
  ])('%s の redirect を拒否する', async (_name, location, message) => {
    await expect(
      runOidcSmoke({ origin: ORIGIN, tenant: TENANT, fetchImpl: successfulFetch(location) }),
    ).rejects.toThrow(message);
  });
});
