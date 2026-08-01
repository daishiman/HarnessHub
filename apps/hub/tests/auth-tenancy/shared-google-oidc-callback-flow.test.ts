/**
 * 共通 Google OAuth client 方式の往復検査 (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * 単体契約テストが純関数と設定組立を固定するのに対し、こちらは
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
  sharedOidcCsrfCookieName,
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

describe('共通 callback への集約 (受入条件 1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('テナントが違っても redirect_uri は同一。Console への追加登録が要らない', async () => {
    // discovery を stub しないと `accounts.google.com` へ実際に出てしまう。
    // テストが外部へ出ると、落ちた理由が実装なのか回線なのか区別できなくなる
    vi.stubGlobal('fetch', (await createGoogleIdp()).fetch);
    const handler = createHandler();

    const alpha = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/alpha' });
    const bravo = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/bravo' });

    const expected = `${CANONICAL_ORIGIN}${SHARED_OIDC_CALLBACK_PATH}`;
    expect(alpha.authorizeUrl.searchParams.get('redirect_uri')).toBe(expected);
    expect(bravo.authorizeUrl.searchParams.get('redirect_uri')).toBe(expected);
    // client_id も共通。テナントごとに Google 側で client を作る必要が無い
    expect(alpha.authorizeUrl.searchParams.get('client_id')).toBe(SHARED_CLIENT_ID);
    expect(bravo.authorizeUrl.searchParams.get('client_id')).toBe(SHARED_CLIENT_ID);
  });

  it('顧客方式の redirect_uri はテナント path のまま (既存登録を壊さない / 受入条件 5)', async () => {
    const idp = await createFakeOidcIdp({ issuer: CUSTOMER_ISSUER, audience: CUSTOMER_CLIENT_ID });
    vi.stubGlobal('fetch', idp.fetch);

    const started = await startOidcSignIn({
      handler: createHandler(),
      origin: CANONICAL_ORIGIN,
      basePath: '/api/auth/legacy',
    });

    expect(started.authorizeUrl.searchParams.get('redirect_uri')).toBe(
      `${CANONICAL_ORIGIN}/api/auth/legacy/callback/tenant-oidc`,
    );
    expect(started.authorizeUrl.origin).toBe(CUSTOMER_ISSUER);
  });

  it('認可開始で署名付き state と binding cookie が対で発行される', async () => {
    vi.stubGlobal('fetch', (await createGoogleIdp()).fetch);

    const started = await startOidcSignIn({
      handler: createHandler(),
      origin: CANONICAL_ORIGIN,
      basePath: '/api/auth/alpha',
    });

    const state = started.authorizeUrl.searchParams.get('state');
    // JWT の 3 要素。Auth.js 既定の不透明値ではなく自前の署名付き state が載る
    expect(state?.split('.')).toHaveLength(3);

    const binding = setCookieValue(started.signin, sharedOidcCsrfCookieName('alpha'));
    expect(binding).toMatch(/^[0-9a-f]{64}$/);
    // binding の平文は URL へ出さない
    expect(state).not.toContain(binding);

    // Auth.js の PKCE / nonce cookie は同じ応答に残っている (binding cookie の append で潰していない)
    const cookieNames = [...started.jar.entries().keys()];
    expect(cookieNames).toEqual(
      expect.arrayContaining(['__Secure-authjs.pkce.code_verifier', '__Secure-authjs.nonce']),
    );
    // state だけは Auth.js に持たせない。cookie が無いことが `checks` から外した証拠
    expect(cookieNames).not.toContain('__Secure-authjs.state');
    expect(started.authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256');
    // 許可ドメインが 1 件なのでアカウント選択のヒントが載る
    expect(started.authorizeUrl.searchParams.get('hd')).toBe('alpha-corp.example');
  });

  it('予約 slug "shared" はテナントとして受け付けない (共通 callback と経路が重なる)', async () => {
    const response = await createHandler()(new Request(`${CANONICAL_ORIGIN}/api/auth/shared/providers`));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'tenant_slug_reserved' });
  });

  it('共有方式のテナント path へ callback を出しても受けない (state 検証を迂回する口を作らない)', async () => {
    const response = await createHandler()(
      new Request(`${CANONICAL_ORIGIN}/api/auth/alpha/callback/tenant-oidc?code=x&state=y`),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: 'shared_oidc_callback_path' });
  });
});

describe('共通 callback の往復 (受入条件 2 / 3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** 共有方式で 1 テナント分の sign-in を最後まで通す。 */
  async function driveShared(params: {
    readonly slug: string;
    readonly users: InMemoryUsers;
    readonly idToken: Readonly<Record<string, unknown>>;
    readonly handler?: (request: Request) => Promise<Response>;
  }) {
    const idp = await createGoogleIdp();
    vi.stubGlobal('fetch', idp.fetch);

    const handler = params.handler ?? createHandler(params.users);
    const started = await startOidcSignIn({
      handler,
      origin: CANONICAL_ORIGIN,
      basePath: `/api/auth/${params.slug}`,
    });
    const response = await completeOidcCallback({
      handler,
      idp,
      origin: CANONICAL_ORIGIN,
      started,
      callbackPath: SHARED_OIDC_CALLBACK_PATH,
      idToken: params.idToken,
    });

    return { handler, idp, started, response };
  }

  it('正しい state と binding で session cookie が発行され、binding は使い切られる', async () => {
    const users = createInMemoryUsers();
    const { response } = await driveShared({
      slug: 'alpha',
      users,
      idToken: {
        sub: 'google-sub-alpha',
        email: 'member@alpha-corp.example',
        email_verified: true,
        hd: 'alpha-corp.example',
      },
    });

    const cookie = setCookieValue(response, SESSION_COOKIE_NAME);
    if (cookie === null) throw new Error('session cookie が書かれていません');
    const verified = await verifySessionToken(cookie, SESSION_SECRET, NOW_SECONDS);
    if (!verified.ok) throw new Error(`session cookie を検証できません: ${verified.reason}`);

    expect(verified.claims.tenant_id).toBe('tenant-alpha');
    expect(users.all()).toMatchObject([{ tenantId: 'tenant-alpha', idpSubject: 'google-sub-alpha' }]);

    // binding cookie は 1 回の認可で使い切る (削除指示 = 空値)
    const cleared = response.headers
      .getSetCookie()
      .find((raw) => raw.startsWith(`${sharedOidcCsrfCookieName('alpha')}=`));
    expect(cleared).toBeDefined();
    expect(setCookieValue(response, sharedOidcCsrfCookieName('alpha'))).toBeNull();
    expect(cleared).toContain('Max-Age=0');
  });

  it('同じ Google アカウントでもテナントが違えば別の利用者になる (受入条件 3)', async () => {
    const users = createInMemoryUsers();
    const handler = createHandler(users);
    const profile = { sub: 'google-sub-shared-person', email_verified: true };

    // 両テナントの Workspace に属する人物を想定し、hd はそれぞれのテナントのものを出す
    await driveShared({
      slug: 'alpha',
      users,
      handler,
      idToken: { ...profile, email: 'person@alpha-corp.example', hd: 'alpha-corp.example' },
    });
    await driveShared({
      slug: 'bravo',
      users,
      handler,
      idToken: { ...profile, email: 'person@bravo-corp.example', hd: 'bravo-corp.example' },
    });

    const created = users.all();
    expect(created).toHaveLength(2);
    // 同一 idpSubject でも tenantId が違えば別行。共通 client で `sub` が衝突しても混線しない
    expect(created.map((user) => user.tenantId).sort()).toEqual(['tenant-alpha', 'tenant-bravo']);
    expect(new Set(created.map((user) => user.id)).size).toBe(2);
  });

  it('テナント A の binding cookie で テナント B の state を通せない (差し替え拒否)', async () => {
    const users = createInMemoryUsers();
    const handler = createHandler(users);
    const idp = await createGoogleIdp();
    vi.stubGlobal('fetch', idp.fetch);

    // alpha で認可を開始 (binding cookie は alpha 名義)
    const alpha = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/alpha' });
    // bravo でも開始し、その state だけを奪う
    const bravo = await startOidcSignIn({ handler, origin: CANONICAL_ORIGIN, basePath: '/api/auth/bravo' });

    // alpha の cookie 一式に bravo の state を載せて共通 callback を叩く。
    // bravo の binding cookie は攻撃者の手元にしか無い、という状況を作る
    const response = await completeOidcCallback({
      handler,
      idp,
      origin: CANONICAL_ORIGIN,
      started: alpha,
      callbackPath: SHARED_OIDC_CALLBACK_PATH,
      state: bravo.authorizeUrl.searchParams.get('state'),
      idToken: { sub: 'google-sub-attacker', email: 'x@bravo-corp.example', hd: 'bravo-corp.example' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'shared_oidc_state_rejected' });
    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
    // 拒否は token 交換より前。IdP へ 1 度も問い合わせていない
    expect(idp.tokenRequests()).toEqual([]);
    expect(users.all()).toEqual([]);
  });

  it('binding cookie が付かない callback は拒否 (別ブラウザで踏ませたログイン CSRF)', async () => {
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
      excludeCookies: [sharedOidcCsrfCookieName('alpha')],
      idToken: { sub: 'google-sub-alpha', email: 'member@alpha-corp.example', hd: 'alpha-corp.example' },
    });

    expect(response.status).toBe(400);
    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
    expect(users.all()).toEqual([]);
  });

  it('state を落とした callback は拒否 (省略すれば検査を外せる、にしない)', async () => {
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
      state: null,
      idToken: { sub: 'google-sub-alpha', hd: 'alpha-corp.example' },
    });

    expect(response.status).toBe(400);
    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
  });

  it('拒否応答はどの検査で落ちたかを漏らさない', async () => {
    const handler = createHandler();
    const forged = await handler(new Request(`${CANONICAL_ORIGIN}${SHARED_OIDC_CALLBACK_PATH}?code=x&state=not-a-jwt`));

    const body = (await forged.json()) as { error: string; error_description: string };
    expect(body.error).toBe('shared_oidc_state_rejected');
    // 署名・期限・binding のどれで落ちたかが分かると総当たりの手掛かりになる
    for (const leak of ['signature', 'expired', 'csrf', 'binding', 'malformed']) {
      expect(JSON.stringify(body)).not.toContain(leak);
    }
  });
});
