/**
 * 接続テスター (`lib/auth/oidc-admin/connection-test.ts`) の分類表検査
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * この module の要は **`invalid_grant` を「合格」と読む**こと。
 * わざと無効な authorization code で token endpoint を叩き、
 *   - `invalid_client` → client_id/secret の組が拒否された = **不合格**
 *   - `invalid_grant`  → credential は受理され code だけが拒否された = **合格**
 * と読み分ける (RFC 6749 §5.2)。ここを取り違えると「常に合格」または「常に不合格」になり、
 * どちらも rotation の安全装置が無言で外れる。
 *
 * fetch は全て注入する。実際に Google へ出る通信をテストの前提にしない。
 */

import { describe, expect, it } from 'vitest';

import { createGoogleOidcConnectionTester } from '../../src/lib/auth/oidc-admin/index.js';

const ISSUER = 'https://accounts.google.com';
const DISCOVERY_URL = `${ISSUER}/.well-known/openid-configuration`;
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const INPUT = {
  issuer: ISSUER,
  clientId: 'client-acme',
  clientSecret: 'goog-probe-0001',
  redirectUri: 'https://hub.example.com/api/auth/acme/callback/google',
} as const;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** discovery は成功させ、token endpoint の応答だけをテストごとに差し替える。 */
function testerWith(
  tokenResponse: () => Promise<Response>,
  discovery: unknown = { issuer: ISSUER, token_endpoint: TOKEN_ENDPOINT },
) {
  const requests: { url: string; body: string | null }[] = [];
  const tester = createGoogleOidcConnectionTester({
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      requests.push({ url, body: typeof init?.body === 'string' ? init.body : null });
      if (url === DISCOVERY_URL) return json(discovery);
      return tokenResponse();
    }) as typeof globalThis.fetch,
  });
  return { tester, requests };
}

describe('Google OIDC 接続テスト', () => {
  it('invalid_grant は合格 (credential は受理され、無効な code だけが拒否された)', async () => {
    const { tester } = testerWith(async () => json({ error: 'invalid_grant' }, 400));
    await expect(tester(INPUT)).resolves.toEqual({ passed: true });
  });

  it('invalid_client は不合格 (client_id / client_secret の組が拒否された)', async () => {
    const { tester } = testerWith(async () => json({ error: 'invalid_client' }, 400));
    await expect(tester(INPUT)).resolves.toEqual({ passed: false, reason: 'invalid_client' });
  });

  it('401 は本文を読まずに invalid_client (Google は client 認証失敗を 401 でも返す)', async () => {
    const { tester } = testerWith(async () => new Response('', { status: 401 }));
    await expect(tester(INPUT)).resolves.toEqual({ passed: false, reason: 'invalid_client' });
  });

  it('discovery を取得できなければ discovery_unreachable', async () => {
    const tester = createGoogleOidcConnectionTester({
      fetch: (async () => {
        throw new Error('network down');
      }) as typeof globalThis.fetch,
    });
    await expect(tester(INPUT)).resolves.toEqual({ passed: false, reason: 'discovery_unreachable' });
  });

  it('discovery の issuer が要求と違えば issuer_mismatch (token endpoint は叩かない)', async () => {
    const { tester, requests } = testerWith(async () => json({ error: 'invalid_grant' }, 400), {
      issuer: 'https://evil.example.com',
      token_endpoint: TOKEN_ENDPOINT,
    });
    await expect(tester(INPUT)).resolves.toEqual({ passed: false, reason: 'issuer_mismatch' });
    // 偽の issuer が指す token endpoint へ secret を送らないことが要点
    expect(requests.map((entry) => entry.url)).toEqual([DISCOVERY_URL]);
  });

  it('token endpoint が 200 を返すのは想定外 (無効な code が通ることはない)', async () => {
    const { tester } = testerWith(async () => json({ access_token: 'unexpected' }));
    await expect(tester(INPUT)).resolves.toEqual({ passed: false, reason: 'unexpected_response' });
  });

  it('未知の error 値は unexpected_response へ畳む (応答本文を戻り値へ載せない)', async () => {
    const { tester } = testerWith(async () => json({ error: 'quota_exceeded', error_description: 'gone' }, 400));
    const outcome = await tester(INPUT);
    expect(outcome).toEqual({ passed: false, reason: 'unexpected_response' });
    // 失敗理由は列挙値だけ。Google の説明文が戻り値へ混ざらないことを固定する
    expect(JSON.stringify(outcome)).not.toContain('gone');
  });

  it('probe は client_secret を body でだけ送り、URL へは載せない', async () => {
    const { tester, requests } = testerWith(async () => json({ error: 'invalid_grant' }, 400));
    await tester(INPUT);

    const tokenRequest = requests.find((entry) => entry.url === TOKEN_ENDPOINT);
    expect(tokenRequest?.body).toContain(`client_secret=${INPUT.clientSecret}`);
    // query string へ載ると Google 側のアクセスログや proxy に平文が残る
    expect(requests.every((entry) => !entry.url.includes(INPUT.clientSecret))).toBe(true);
    // redirect_uri は Console へ登録した値と一致していなければならない
    expect(tokenRequest?.body).toContain('redirect_uri=');
  });
});
