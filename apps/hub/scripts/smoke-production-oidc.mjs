#!/usr/bin/env node

/**
 * production OIDC の開始フローを、資格情報を保持せずに検査する。
 *
 * Google への実ログインや callback は人の IdP 資格情報を CI に置くことになるため対象外。
 * 代わりに Hub の tenant 解決、CSRF cookie、Auth.js の native form POST、
 * Google authorization endpoint の state / nonce / PKCE までを毎 deploy で確かめる。
 */

const REQUIRED_SCOPES = ['openid', 'email', 'profile'];
const UNKNOWN_TENANT = 'oidc-smoke-unknown-7f3d9a';

function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} is required`);
  return value.trim();
}

function canonicalOrigin(value) {
  const url = new URL(requiredString(value, 'origin'));
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('origin must use https');
  }
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('origin must not include a path, query, or hash');
  return url.origin;
}

function tenantSlug(value) {
  const slug = requiredString(value, 'tenant');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('tenant must be a lowercase slug');
  return slug;
}

async function jsonBody(response, checkName) {
  try {
    return await response.json();
  } catch {
    throw new Error(`${checkName}: response was not JSON`);
  }
}

function assertStatus(response, expected, checkName) {
  if (!expected.includes(response.status)) {
    throw new Error(`${checkName}: expected HTTP ${expected.join('/')} but received ${response.status}`);
  }
}

function cookiePair(response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) throw new Error('csrf: Set-Cookie was missing');
  const match = setCookie.match(/(?:^|,\s*)([^=;,\s]+=[^;,]*)/);
  if (!match?.[1]) throw new Error('csrf: Set-Cookie did not contain a cookie pair');
  return match[1];
}

function assertNonEmptyQuery(url, name) {
  if (!url.searchParams.get(name)?.trim()) throw new Error(`authorization redirect: ${name} was missing`);
}

/**
 * @param {{
 *   origin: string;
 *   tenant: string;
 *   fetchImpl?: typeof fetch;
 * }} options
 */
export async function runOidcSmoke({ origin: rawOrigin, tenant: rawTenant, fetchImpl = fetch }) {
  const origin = canonicalOrigin(rawOrigin);
  const tenant = tenantSlug(rawTenant);
  const basePath = `/api/auth/${encodeURIComponent(tenant)}`;
  const signinUrl = `${origin}${basePath}/signin/tenant-oidc`;
  const callbackUrl = `${origin}${basePath}/callback/tenant-oidc`;
  const checks = [];

  const providersResponse = await fetchImpl(`${origin}${basePath}/providers`, {
    headers: { accept: 'application/json' },
    redirect: 'manual',
  });
  assertStatus(providersResponse, [200], 'providers');
  const providers = await jsonBody(providersResponse, 'providers');
  const providerKeys = providers && typeof providers === 'object' ? Object.keys(providers) : [];
  const provider = providers?.['tenant-oidc'];
  if (
    providerKeys.length !== 1 ||
    providerKeys[0] !== 'tenant-oidc' ||
    provider?.id !== 'tenant-oidc' ||
    provider?.type !== 'oidc' ||
    provider?.signinUrl !== signinUrl ||
    provider?.callbackUrl !== callbackUrl
  ) {
    throw new Error('providers: tenant OIDC contract did not match the canonical URLs');
  }
  checks.push({ id: 'O1', name: 'tenant OIDC provider / canonical callback', ok: true });

  const unknownResponse = await fetchImpl(`${origin}/api/auth/${UNKNOWN_TENANT}/providers`, {
    headers: { accept: 'application/json' },
    redirect: 'manual',
  });
  assertStatus(unknownResponse, [404], 'unknown tenant');
  checks.push({ id: 'O2', name: 'unknown tenant rejection', ok: true });

  const csrfResponse = await fetchImpl(`${origin}${basePath}/csrf`, {
    headers: { accept: 'application/json' },
    redirect: 'manual',
  });
  assertStatus(csrfResponse, [200], 'csrf');
  const csrf = await jsonBody(csrfResponse, 'csrf');
  const csrfToken = requiredString(csrf?.csrfToken, 'csrfToken');
  const cookie = cookiePair(csrfResponse);
  checks.push({ id: 'O3', name: 'CSRF token / cookie pair', ok: true });

  const form = new URLSearchParams({ csrfToken, callbackUrl: origin });
  const signinResponse = await fetchImpl(signinUrl, {
    method: 'POST',
    headers: {
      accept: 'text/html',
      'content-type': 'application/x-www-form-urlencoded',
      cookie,
    },
    body: form.toString(),
    redirect: 'manual',
  });
  assertStatus(signinResponse, [302, 303], 'signin');
  const location = signinResponse.headers.get('location');
  if (!location) throw new Error('signin: redirect location was missing');

  const authorizationUrl = new URL(location, origin);
  if (authorizationUrl.protocol !== 'https:' || authorizationUrl.hostname !== 'accounts.google.com') {
    throw new Error('authorization redirect: destination was not Google');
  }
  if (authorizationUrl.searchParams.get('response_type') !== 'code') {
    throw new Error('authorization redirect: response_type was not code');
  }
  if (authorizationUrl.searchParams.get('redirect_uri') !== callbackUrl) {
    throw new Error('authorization redirect: callback URL was not canonical');
  }
  const scopes = new Set((authorizationUrl.searchParams.get('scope') ?? '').split(/\s+/).filter(Boolean));
  if (!REQUIRED_SCOPES.every((scope) => scopes.has(scope))) {
    throw new Error('authorization redirect: openid/email/profile scopes were incomplete');
  }
  for (const parameter of ['state', 'nonce', 'code_challenge']) assertNonEmptyQuery(authorizationUrl, parameter);
  if (authorizationUrl.searchParams.get('code_challenge_method') !== 'S256') {
    throw new Error('authorization redirect: PKCE method was not S256');
  }
  checks.push({ id: 'O4', name: 'Google redirect / state / nonce / PKCE', ok: true });

  /*
   * O5: サインイン後の遷移先に外部 URL を差し込めないこと (open redirect / HarnessHub-p0lr)。
   *
   * `resolvePostSigninLanding` は「`/` 始まり かつ 同一 origin」以外を既定の `/sheets` へ落とす。
   * ただし呼び出しは client の useEffect の中にあるため、**HTTP から観測できるのは SSR 済み HTML だけ**
   * であり、hydration 後の再解決までは本 smoke では見ない (そこは unit test の担当)。
   * ここで押さえるのは「悪意ある returnTo が SSR 応答へ素通しで載らない」ことの本番実測。
   */
  const hostileReturnTo = 'https://oidc-smoke-open-redirect.invalid/steal';
  const signinPageUrl = `${origin}/${encodeURIComponent(tenant)}/signin?returnTo=${encodeURIComponent(hostileReturnTo)}`;
  const signinPageResponse = await fetchImpl(signinPageUrl, { headers: { accept: 'text/html' }, redirect: 'manual' });
  assertStatus(signinPageResponse, [200], 'signin page');
  const signinHtml = await signinPageResponse.text();
  if (!signinHtml.includes('name="callbackUrl"')) {
    throw new Error('post-signin landing: callbackUrl input was missing from the rendered sign-in page');
  }
  if (!signinHtml.includes('value="/sheets"')) {
    throw new Error('post-signin landing: server-rendered callbackUrl was not the safe default /sheets');
  }
  // 「HTML 中に文字列が一切現れないこと」は検査条件にしない: App Router は router state (URL と
  // クエリ) を RSC payload へ載せるため、実装が正しくても returnTo の文字列自体は出現しうる。
  // 危険なのは**遷移に使われる位置**へ入ることなので、その位置だけを名指しで見る。
  for (const attribute of ['value', 'href', 'action', 'content']) {
    if (signinHtml.includes(`${attribute}="${hostileReturnTo}"`)) {
      throw new Error(`post-signin landing: hostile returnTo reached a navigable ${attribute} attribute`);
    }
  }
  checks.push({ id: 'O5', name: 'post-signin landing rejects external returnTo', ok: true });

  return { ok: true, tenant, checks };
}

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('usage: --origin <url> --tenant <slug>');
    args.set(key.slice(2), value);
  }
  return { origin: args.get('origin'), tenant: args.get('tenant') };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const result = await runOidcSmoke(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }
}
