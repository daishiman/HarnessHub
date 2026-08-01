/**
 * 共通 Google OAuth client 方式の state / provider 契約
 * (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * 署名付き state のテナント束縛と、共通 callback を 1 本に集約する provider 設定を
 * 同じ境界で検査する。credential と Workspace 帰属は
 * `shared-google-oidc-credentials-domain.test.ts` に分離している。
 */

import { describe, expect, it } from 'vitest';

import {
  buildOidcProvider,
  createOidcCredentialResolver,
  GOOGLE_OIDC_ISSUER,
  issueSharedOidcState,
  readSharedGoogleCredentials,
  resolveAuthjsConfigForTenant,
  SHARED_GOOGLE_CLIENT_ID_ENV,
  SHARED_GOOGLE_CLIENT_SECRET_ENV,
  SHARED_OIDC_BASE_PATH,
  SHARED_OIDC_CALLBACK_PATH,
  SHARED_OIDC_PATH_SEGMENT,
  SHARED_OIDC_PROVIDER_ID,
  serializeSharedOidcCsrfCookie,
  sharedOidcCsrfCookieName,
  signSessionToken,
  type TenantOidcConnection,
  verifySharedOidcState,
} from '../../src/lib/auth/index.js';
import { createInMemoryOidcConnections, oidcConnection, TENANT_A, TENANT_B } from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const SESSION_SECRET = 'shared-oidc-test-secret-at-least-32-bytes';
const ATTACKER_SESSION_SECRET = 'attacker-secret-at-least-32-bytes-long';
const SHARED_CLIENT_ID = 'shared-client.apps.googleusercontent.com';
const SHARED_CLIENT_SECRET = 'shared-client-secret';

const SHARED_A: TenantOidcConnection = oidcConnection({
  tenantId: TENANT_A,
  tenantSlug: 'tenant-a',
  issuer: GOOGLE_OIDC_ISSUER,
  clientId: SHARED_CLIENT_ID,
  displayName: 'Tenant A (共通 client)',
  credentialMode: 'shared_google',
  allowedWorkspaceDomains: ['a-corp.example'],
});

const CUSTOMER_B: TenantOidcConnection = oidcConnection({
  tenantId: TENANT_B,
  tenantSlug: 'tenant-b',
  issuer: 'https://idp-b.example.com',
  clientId: 'client-b',
  displayName: 'Tenant B (顧客 client)',
});

const SHARED_CREDENTIALS = readSharedGoogleCredentials({
  [SHARED_GOOGLE_CLIENT_ID_ENV]: SHARED_CLIENT_ID,
  [SHARED_GOOGLE_CLIENT_SECRET_ENV]: SHARED_CLIENT_SECRET,
});
if (SHARED_CREDENTIALS === null) throw new Error('前提: 共有 credential が読めるはず');

// ---------------------------------------------------------------------------
// 受入条件 2: 署名付き state のテナント束縛と差し替え拒否
// ---------------------------------------------------------------------------

describe('署名付き tenant state (受入条件 2)', () => {
  /** 発行 → cookie ヘッダ組立までを 1 行に畳む。 */
  async function issueFor(connection: TenantOidcConnection, nowSeconds = NOW) {
    const issued = await issueSharedOidcState({
      tenantId: connection.tenantId,
      tenantSlug: connection.tenantSlug,
      nowSeconds,
      secret: SESSION_SECRET,
    });
    return {
      ...issued,
      cookieHeader: `${sharedOidcCsrfCookieName(connection.tenantSlug)}=${issued.csrfBinding}`,
    };
  }

  it('発行した state と binding cookie の組はテナントを復元できる', async () => {
    const { state, cookieHeader } = await issueFor(SHARED_A);

    const verified = await verifySharedOidcState({ state, cookieHeader, nowSeconds: NOW, secret: SESSION_SECRET });

    if (!verified.ok) throw new Error(`受理されるはず: ${verified.reason}`);
    expect(verified.claims).toMatchObject({
      typ: 'shared_oidc_state',
      tid: TENANT_A,
      slug: 'tenant-a',
      iat: NOW,
      exp: NOW + 600,
    });
  });

  it('binding の平文は state に載らない (URL 履歴・Referer へ秘密を出さない)', async () => {
    const { state, csrfBinding } = await issueFor(SHARED_A);
    expect(state).not.toContain(csrfBinding);
    // state に載るのは SHA-256 の 16 進表現
    expect(csrfBinding).toMatch(/^[0-9a-f]{64}$/);
  });

  it('binding cookie が無ければ拒否 (別ブラウザで開始された認可を完了させない)', async () => {
    const { state } = await issueFor(SHARED_A);

    expect(await verifySharedOidcState({ state, cookieHeader: null, nowSeconds: NOW, secret: SESSION_SECRET })).toEqual(
      {
        ok: false,
        reason: 'csrf_missing',
      },
    );
  });

  it('binding cookie の値が違えばログイン CSRF として拒否', async () => {
    const { state } = await issueFor(SHARED_A);
    const forged = `${sharedOidcCsrfCookieName('tenant-a')}=${'0'.repeat(64)}`;

    expect(
      await verifySharedOidcState({ state, cookieHeader: forged, nowSeconds: NOW, secret: SESSION_SECRET }),
    ).toEqual({
      ok: false,
      reason: 'csrf_mismatch',
    });
  });

  it('テナント A の state をテナント B の binding cookie で通せない (差し替え拒否)', async () => {
    const a = await issueFor(SHARED_A);
    const b = await issueFor({ ...SHARED_A, tenantId: TENANT_B, tenantSlug: 'tenant-b' });

    // cookie 名が slug を含むので、B の cookie は A の state から見ると「存在しない」
    expect(
      await verifySharedOidcState({
        state: a.state,
        cookieHeader: b.cookieHeader,
        nowSeconds: NOW,
        secret: SESSION_SECRET,
      }),
    ).toEqual({ ok: false, reason: 'csrf_missing' });
  });

  it('テナントを跨いで並行にログインしても binding が上書きされない', async () => {
    const a = await issueFor(SHARED_A);
    const b = await issueFor({ ...SHARED_A, tenantId: TENANT_B, tenantSlug: 'tenant-b' });
    const both = `${a.cookieHeader}; ${b.cookieHeader}`;

    const verifiedA = await verifySharedOidcState({
      state: a.state,
      cookieHeader: both,
      nowSeconds: NOW,
      secret: SESSION_SECRET,
    });
    const verifiedB = await verifySharedOidcState({
      state: b.state,
      cookieHeader: both,
      nowSeconds: NOW,
      secret: SESSION_SECRET,
    });

    expect(verifiedA.ok && verifiedA.claims.tid).toBe(TENANT_A);
    expect(verifiedB.ok && verifiedB.claims.tid).toBe(TENANT_B);
  });

  it('別鍵で署名された state は拒否', async () => {
    const { cookieHeader } = await issueFor(SHARED_A);
    const forged = await issueSharedOidcState({
      tenantId: TENANT_A,
      tenantSlug: 'tenant-a',
      nowSeconds: NOW,
      secret: ATTACKER_SESSION_SECRET,
    });

    expect(
      await verifySharedOidcState({ state: forged.state, cookieHeader, nowSeconds: NOW, secret: SESSION_SECRET }),
    ).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('payload を書き換えた state は署名検査で落ちる', async () => {
    const { state, cookieHeader } = await issueFor(SHARED_A);
    const [header, payload, signature] = state.split('.');
    if (header === undefined || payload === undefined || signature === undefined) {
      throw new Error('前提: JWT の 3 要素が揃っているはず');
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const tampered = Buffer.from(JSON.stringify({ ...decoded, tid: TENANT_B }), 'utf8').toString('base64url');

    expect(
      await verifySharedOidcState({
        state: `${header}.${tampered}.${signature}`,
        cookieHeader,
        nowSeconds: NOW,
        secret: SESSION_SECRET,
      }),
    ).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('期限を過ぎた state は拒否 (境界は exp ちょうどで有効)', async () => {
    const { state, cookieHeader } = await issueFor(SHARED_A);

    const atExpiry = await verifySharedOidcState({
      state,
      cookieHeader,
      nowSeconds: NOW + 600,
      secret: SESSION_SECRET,
    });
    expect(atExpiry).toEqual({ ok: false, reason: 'expired' });

    const beforeExpiry = await verifySharedOidcState({
      state,
      cookieHeader,
      nowSeconds: NOW + 599,
      secret: SESSION_SECRET,
    });
    expect(beforeExpiry.ok).toBe(true);
  });

  it('state 欠落・空文字は malformed', async () => {
    const { cookieHeader } = await issueFor(SHARED_A);

    expect(await verifySharedOidcState({ state: null, cookieHeader, nowSeconds: NOW, secret: SESSION_SECRET })).toEqual(
      {
        ok: false,
        reason: 'malformed',
      },
    );
    expect(await verifySharedOidcState({ state: '', cookieHeader, nowSeconds: NOW, secret: SESSION_SECRET })).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('同じ鍵で署名された session token を state として提示しても通らない (typ による経路分離)', async () => {
    const { cookieHeader } = await issueFor(SHARED_A);
    const sessionToken = await signSessionToken(
      {
        sub: 'user-a',
        tenant_id: TENANT_A,
        role: 'member',
        status: 'active',
        workspace_ids: [],
        iat: NOW,
        exp: NOW + 3600,
      },
      SESSION_SECRET,
    );

    expect(
      await verifySharedOidcState({ state: sessionToken, cookieHeader, nowSeconds: NOW, secret: SESSION_SECRET }),
    ).toEqual({ ok: false, reason: 'bad_claims' });
  });

  it('binding cookie は HttpOnly / Secure / SameSite=Lax で、寿命が state と揃う', () => {
    const cookie = serializeSharedOidcCsrfCookie('tenant-a', 'a'.repeat(64));

    expect(cookie).toContain(`${sharedOidcCsrfCookieName('tenant-a')}=${'a'.repeat(64)}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    // Strict にすると Google からの redirect で cookie が送られず、正当な callback が必ず落ちる
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=600');
    // `__Host-` 接頭辞は Path=/ と Domain 無しを UA に強制させる
    expect(cookie).toContain('Path=/');
    expect(sharedOidcCsrfCookieName('tenant-a').startsWith('__Host-')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 受入条件 1: 共通 callback 1 本で足りる
// ---------------------------------------------------------------------------

describe('共有方式の provider 設定 (受入条件 1)', () => {
  const deps = {
    oidcConnections: createInMemoryOidcConnections([SHARED_A, CUSTOMER_B]),
    clientSecretFor: createOidcCredentialResolver({
      sharedGoogle: SHARED_CREDENTIALS,
      customerClientSecretFor: async () => 'customer-secret',
    }),
  };

  const withState = { sharedState: async () => 'signed-state-value' };

  it('共有方式は state を自前で載せ、Auth.js の state 検査を外す', () => {
    const provider = buildOidcProvider(SHARED_A, SHARED_CLIENT_SECRET, { sharedState: 'signed-state-value' });

    if (provider === null) throw new Error('provider が組めるはず');
    // PKCE と nonce は cookie ベースなので Auth.js に残す。state だけが自前
    expect(provider.checks).toEqual(['pkce', 'nonce']);
    expect(provider.authorization.params.state).toBe('signed-state-value');
    expect(provider.authorization.params.code_challenge_method).toBe('S256');
  });

  it('state を渡さない共有 provider は組めない (テナントを復元できない認可要求を作らない)', () => {
    expect(buildOidcProvider(SHARED_A, SHARED_CLIENT_SECRET)).toBeNull();
    expect(buildOidcProvider(SHARED_A, SHARED_CLIENT_SECRET, { sharedState: '' })).toBeNull();
  });

  it('顧客方式は従来どおり Auth.js の state 検査を使う (受入条件 5)', () => {
    const provider = buildOidcProvider(CUSTOMER_B, 'customer-secret');

    if (provider === null) throw new Error('provider が組めるはず');
    expect(provider.checks).toEqual(['pkce', 'state', 'nonce']);
    expect(provider.authorization.params.state).toBeUndefined();
    expect(provider.authorization.params.hd).toBeUndefined();
  });

  it('許可ドメインが 1 件なら hd を表示ヒントとして載せる', () => {
    const provider = buildOidcProvider(SHARED_A, SHARED_CLIENT_SECRET, { sharedState: 'signed-state-value' });
    expect(provider?.authorization.params.hd).toBe('a-corp.example');
  });

  it('許可ドメインが複数なら hd ヒントを載せない (選べないアカウント画面にしない)', () => {
    const multi = { ...SHARED_A, allowedWorkspaceDomains: ['a-corp.example', 'a-corp-jp.example'] };
    const provider = buildOidcProvider(multi, SHARED_CLIENT_SECRET, { sharedState: 'signed-state-value' });

    expect(provider?.authorization.params.hd).toBeUndefined();
    // ヒントが無くても境界は ID token 側の hd claim が担う
    expect(provider?.checks).toEqual(['pkce', 'nonce']);
  });

  it('共有方式の basePath はテナントに依らず固定で、callback は 1 本になる', async () => {
    const resolved = await resolveAuthjsConfigForTenant(deps, 'tenant-a', withState);

    if (resolved === null) throw new Error('解決できるはず');
    expect(resolved.config.basePath).toBe(SHARED_OIDC_BASE_PATH);
    expect(`${resolved.config.basePath}/callback/${SHARED_OIDC_PROVIDER_ID}`).toBe(SHARED_OIDC_CALLBACK_PATH);
    // Google Cloud Console へ登録する URI がテナント数に依存しないことの表明
    expect(SHARED_OIDC_CALLBACK_PATH).toBe(`/api/auth/${SHARED_OIDC_PATH_SEGMENT}/callback/tenant-oidc`);
  });

  it('顧客方式の basePath はテナント別のまま (既存 callback URI を変えない)', async () => {
    const resolved = await resolveAuthjsConfigForTenant(deps, 'tenant-b', withState);

    if (resolved === null) throw new Error('解決できるはず');
    expect(resolved.config.basePath).toBe('/api/auth/tenant-b');
  });

  it('共有方式でも client_id は環境単位の共有値になり、テナント行に依存しない', async () => {
    const resolved = await resolveAuthjsConfigForTenant(deps, 'tenant-a', withState);
    expect(resolved?.config.providers[0]?.clientId).toBe(SHARED_CLIENT_ID);
  });

  it('sharedState を渡さなければ共有テナントは解決できない (state 無しの認可を作らない)', async () => {
    expect(await resolveAuthjsConfigForTenant(deps, 'tenant-a')).toBeNull();
  });

  it('顧客方式では sharedState コールバックが呼ばれない', async () => {
    let called = 0;
    const resolved = await resolveAuthjsConfigForTenant(deps, 'tenant-b', {
      sharedState: async () => {
        called += 1;
        return 'unused';
      },
    });

    expect(resolved).not.toBeNull();
    expect(called).toBe(0);
  });
});
