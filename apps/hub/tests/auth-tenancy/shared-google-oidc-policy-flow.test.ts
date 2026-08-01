/**
 * 共通 Google OAuth client 方式の policy / 非回帰検査 (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * `shared-google-oidc-credentials-domain.test.ts` が純関数を固定するのに対し、こちらは
 * **実際の `Auth()` を通す**。設定オブジェクトの検査だけでは次が見えないため:
 *
 *   - Auth.js の `checks` から `state` を外したとき、自前の署名付き state が本当に往復するか
 *     (外し方を誤ると `oauth4webapi` が state 不一致で落ちるか、逆に検査ごと消える)
 *   - 開始がテナント path・callback が共通 path という**非対称な経路**で cookie が繋がるか
 *   - `hd` の拒否が「設定として正しい」だけでなく **session cookie を書かせない**か
 *
 * 外部 IdP は立てない (`createFakeOidcIdp` が JWKS ごと本物の鍵で応答する)。
 * 差し替えるのは `globalThis.fetch` だけで、署名検証・PKCE・nonce は本物の実装が走る。
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createAuthjsHandler,
  createOidcCredentialResolver,
  GOOGLE_OIDC_ISSUER,
  readSharedGoogleCredentials,
  SESSION_COOKIE_NAME,
  SHARED_GOOGLE_CLIENT_ID_ENV,
  SHARED_GOOGLE_CLIENT_SECRET_ENV,
  SHARED_OIDC_CALLBACK_PATH,
  type TenantOidcConnection,
  verifySessionToken,
} from '../../src/lib/auth/index.js';
import { completeOidcCallback, createFakeOidcIdp, setCookieValue, startOidcSignIn } from './support/fake-oidc-idp.js';
import {
  createInMemoryOidcConnections,
  createInMemoryUsers,
  createMutableClock,
  type InMemoryUsers,
  oidcConnection,
} from './support/in-memory-ports.js';

const SESSION_SECRET = 'test-session-secret-at-least-32-bytes';
const CANONICAL_ORIGIN = 'https://hub.example.com';
const NOW_SECONDS = 1_800_000_000;

/** 共通 client。テナント数に関わらずこの 1 つだけを Google Cloud Console へ登録する。 */
const SHARED_CLIENT_ID = 'shared-client.apps.googleusercontent.com';
const SHARED_CLIENT_SECRET = 'shared-client-secret';

/** 顧客持ち込み方式の対照テナント。 */
const CUSTOMER_ISSUER = 'https://idp.legacy.example.com';
const CUSTOMER_CLIENT_ID = 'client-legacy';

/**
 * 共有 credential は本番と同じ経路 (環境変数の読取) で組む。
 * オブジェクトリテラルを手で書くと `toJSON` による secret 伏字を落としたまま
 * 通ってしまい、「ログに平文が出ない」の担保をテストが素通りする。
 */
const SHARED_CREDENTIALS = readSharedGoogleCredentials({
  [SHARED_GOOGLE_CLIENT_ID_ENV]: SHARED_CLIENT_ID,
  [SHARED_GOOGLE_CLIENT_SECRET_ENV]: SHARED_CLIENT_SECRET,
});

const CONNECTIONS: readonly TenantOidcConnection[] = [
  oidcConnection({
    tenantId: 'tenant-alpha',
    tenantSlug: 'alpha',
    issuer: GOOGLE_OIDC_ISSUER,
    clientId: SHARED_CLIENT_ID,
    displayName: 'Alpha (共通 client)',
    credentialMode: 'shared_google',
    allowedWorkspaceDomains: ['alpha-corp.example'],
  }),
  oidcConnection({
    tenantId: 'tenant-bravo',
    tenantSlug: 'bravo',
    issuer: GOOGLE_OIDC_ISSUER,
    clientId: SHARED_CLIENT_ID,
    displayName: 'Bravo (共通 client)',
    credentialMode: 'shared_google',
    allowedWorkspaceDomains: ['bravo-corp.example'],
  }),
  oidcConnection({
    tenantId: 'tenant-legacy',
    tenantSlug: 'legacy',
    issuer: CUSTOMER_ISSUER,
    clientId: CUSTOMER_CLIENT_ID,
    displayName: 'Legacy (顧客 client)',
  }),
];

function createHandler(users: InMemoryUsers = createInMemoryUsers()) {
  return createAuthjsHandler({
    config: {
      oidcConnections: createInMemoryOidcConnections(CONNECTIONS),
      clientSecretFor: createOidcCredentialResolver({
        sharedGoogle: SHARED_CREDENTIALS,
        customerClientSecretFor: async (tenantId) => (tenantId === 'tenant-legacy' ? 'client-secret-legacy' : null),
      }),
    },
    users,
    clock: createMutableClock(NOW_SECONDS),
    sessionSecret: SESSION_SECRET,
    canonicalOrigin: CANONICAL_ORIGIN,
  });
}

/** Google を騙る fake IdP。共有 client 向けなので audience は共通 client_id。 */
function createGoogleIdp() {
  return createFakeOidcIdp({ issuer: GOOGLE_OIDC_ISSUER, audience: SHARED_CLIENT_ID });
}

describe('Workspace 帰属の実行時強制 (受入条件 2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function driveWithIdToken(idToken: Readonly<Record<string, unknown>>) {
    const users = createInMemoryUsers();
    const handler = createHandler(users);
    const idp = await createGoogleIdp();
    vi.stubGlobal('fetch', idp.fetch);

    const started = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/alpha' });
    const response = await completeOidcCallback({
      handler,
      idp,
      origin: CANONICAL_ORIGIN,
      started,
      callbackPath: SHARED_OIDC_CALLBACK_PATH,
      idToken,
    });
    return { response, users };
  }

  it('hd が別 Workspace の id_token では session cookie を書かない', async () => {
    // state も binding も PKCE も正しい。壊れているのは Workspace 帰属だけ
    const { response, users } = await driveWithIdToken({
      sub: 'google-sub-outsider',
      email: 'outsider@bravo-corp.example',
      email_verified: true,
      hd: 'bravo-corp.example',
    });

    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
    // 拒否は JIT provisioning より前。行だけ残る状態を作らない
    expect(users.all()).toEqual([]);
  });

  it('hd を持たない個人 Google アカウントでは session cookie を書かない', async () => {
    const { response, users } = await driveWithIdToken({
      sub: 'google-sub-personal',
      email: 'someone@gmail.com',
      email_verified: true,
    });

    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
    expect(users.all()).toEqual([]);
  });

  it('hd がサブドメインでは通らない', async () => {
    const { response } = await driveWithIdToken({
      sub: 'google-sub-subdomain',
      email: 'member@sub.alpha-corp.example',
      email_verified: true,
      hd: 'sub.alpha-corp.example',
    });

    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
  });

  it('既存利用者でも hd が合わなければ session を発行しない (初回だけの検査にしない)', async () => {
    const users = createInMemoryUsers();
    const handler = createHandler(users);
    const idp = await createGoogleIdp();
    vi.stubGlobal('fetch', idp.fetch);

    // まず正当な hd で入り、利用者を作る
    const first = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/alpha' });
    await completeOidcCallback({
      handler,
      idp,
      origin: CANONICAL_ORIGIN,
      started: first,
      callbackPath: SHARED_OIDC_CALLBACK_PATH,
      idToken: {
        sub: 'google-sub-alpha',
        email: 'member@alpha-corp.example',
        email_verified: true,
        hd: 'alpha-corp.example',
      },
    });
    expect(users.all()).toHaveLength(1);

    // 同じ利用者が Workspace から外れた後 (hd が変わった) の再ログイン
    const second = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/alpha' });
    const response = await completeOidcCallback({
      handler,
      idp,
      origin: CANONICAL_ORIGIN,
      started: second,
      callbackPath: SHARED_OIDC_CALLBACK_PATH,
      idToken: { sub: 'google-sub-alpha', email: 'member@former.example', email_verified: true, hd: 'former.example' },
    });

    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
  });
});

describe('顧客持ち込み方式の非回帰 (受入条件 5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('顧客方式は従来どおりテナント path の callback で完了し、binding cookie を発行しない', async () => {
    const users = createInMemoryUsers();
    const idp = await createFakeOidcIdp({ issuer: CUSTOMER_ISSUER, audience: CUSTOMER_CLIENT_ID });
    vi.stubGlobal('fetch', idp.fetch);

    const handler = createHandler(users);
    const started = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/legacy' });

    // 顧客方式は Auth.js の state 検査をそのまま使う。state は cookie 側に保持される。
    // 検査は**認可開始の応答**に対して行う (callback 後の jar では使用済みとして消えている)
    const startCookies = [...started.jar.entries().keys()];
    expect(startCookies).toContain('__Secure-authjs.state');
    // 共有方式の binding cookie は一切出ない
    expect(startCookies.some((name) => name.startsWith('__Host-harness-hub.shared-oidc-csrf'))).toBe(false);
    // hd ヒントも載せない (顧客の IdP は Google とは限らない)
    expect(started.authorizeUrl.searchParams.get('hd')).toBeNull();

    const response = await completeOidcCallback({
      handler,
      idp,
      origin: CANONICAL_ORIGIN,
      started,
      callbackPath: '/api/auth/legacy/callback/tenant-oidc',
      idToken: { sub: 'legacy-subject', email: 'member@legacy.example.com', email_verified: true },
    });

    const cookie = setCookieValue(response, SESSION_COOKIE_NAME);
    if (cookie === null) throw new Error('session cookie が書かれていません');
    const verified = await verifySessionToken(cookie, SESSION_SECRET, NOW_SECONDS);
    if (!verified.ok) throw new Error(`session cookie を検証できません: ${verified.reason}`);
    expect(verified.claims.tenant_id).toBe('tenant-legacy');
  });

  it('顧客方式のテナントを共通 callback へ向けても受けない', async () => {
    const handler = createHandler();
    const idp = await createFakeOidcIdp({ issuer: CUSTOMER_ISSUER, audience: CUSTOMER_CLIENT_ID });
    vi.stubGlobal('fetch', idp.fetch);

    // legacy は顧客方式なので署名付き state を持たない。攻撃者が別テナント (alpha) の
    // 正当な state を共通 callback へ出しても、解決されるのは alpha であって legacy ではない
    const started = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/legacy' });
    const response = await completeOidcCallback({
      handler,
      idp,
      origin: CANONICAL_ORIGIN,
      started,
      callbackPath: SHARED_OIDC_CALLBACK_PATH,
      idToken: { sub: 'legacy-subject' },
    });

    expect(response.status).toBe(400);
    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
  });
});
