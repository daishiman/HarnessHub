/**
 * Auth.js 本番 adapter の直接検査 (HarnessHub-b7ng AC-1 / AC-2)。
 *
 * 設定オブジェクトだけを検査すると、`@auth/core` へ渡したときの basePath・cookie 名・JWT bridge の
 * 食い違いを見逃す。このテストは実際の `Auth()` を通し、外部 IdP への通信が不要な
 * providers/session endpoint で route 結線と session の共通検証経路を確かめる。
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { tenantOidcCsrfAction, tenantOidcSigninAction } from '../../src/app/[tenant_slug]/signin/tenant-oidc-action.js';
import {
  createAuthjsHandler,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from '../../src/lib/auth/index.js';
import { createFakeOidcIdp, driveOidcSignIn, setCookieValue } from './support/fake-oidc-idp.js';
import {
  createInMemoryOidcConnections,
  createInMemoryUsers,
  createMutableClock,
  directoryUser,
  type InMemoryUsers,
  type MutableClock,
} from './support/in-memory-ports.js';

const SESSION_SECRET = 'test-session-secret-at-least-32-bytes';
const CANONICAL_ORIGIN = 'https://hub.example.com';
const ISSUER = 'https://idp.acme.example.com';
const CLIENT_ID = 'client-acme';
const TENANT_BASE_PATH = '/api/auth/acme';
const NOW_SECONDS = 1_800_000_000;
/** docs/backend-spec.md §3.2 の updateAge (15 分)。定数ではなく仕様値を書く。 */
const UPDATE_AGE_SECONDS = 900;

function createHandler(
  overrides: {
    readonly users?: InMemoryUsers;
    readonly clock?: MutableClock;
    readonly allowJitProvisioning?: boolean;
  } = {},
) {
  const oidcConnections = createInMemoryOidcConnections([
    {
      tenantId: 'tenant-acme',
      tenantSlug: 'acme',
      issuer: ISSUER,
      clientId: CLIENT_ID,
      displayName: 'Acme ID',
      enabled: true,
    },
  ]);

  return createAuthjsHandler({
    config: {
      oidcConnections,
      clientSecretFor: async (tenantId) => (tenantId === 'tenant-acme' ? 'client-secret-acme' : null),
    },
    users: overrides.users ?? createInMemoryUsers(),
    clock: overrides.clock ?? createMutableClock(NOW_SECONDS),
    sessionSecret: SESSION_SECRET,
    canonicalOrigin: CANONICAL_ORIGIN,
    // 省略時は handler 側の既定 (JIT provisioning 有効) に委ねる
    ...(overrides.allowJitProvisioning === undefined ? {} : { allowJitProvisioning: overrides.allowJitProvisioning }),
  });
}

/** `/api/auth/acme/session` を既存 cookie 付きで叩く。 */
async function requestSession(handler: (request: Request) => Promise<Response>, token: string): Promise<Response> {
  return handler(
    new Request(`${CANONICAL_ORIGIN}${TENANT_BASE_PATH}/session`, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    }),
  );
}

describe('Auth.js route 結線 (AC-1)', () => {
  it('テナント別サインイン画面を handler と同じ tenant path へ接続する', () => {
    expect(tenantOidcSigninAction('acme')).toBe('/api/auth/acme/signin/tenant-oidc');
    expect(tenantOidcSigninAction('tenant/subpath')).toBe('/api/auth/tenant%2Fsubpath/signin/tenant-oidc');
    expect(tenantOidcCsrfAction('acme')).toBe('/api/auth/acme/csrf');
    expect(tenantOidcCsrfAction('tenant/subpath')).toBe('/api/auth/tenant%2Fsubpath/csrf');
  });

  it('tenant 別 provider を実 Auth.js endpoint から返し、callback origin を正規値へ固定する', async () => {
    const response = await createHandler()(new Request('https://forged-host.example/api/auth/acme/providers'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      'tenant-oidc': {
        id: 'tenant-oidc',
        name: 'Acme ID',
        type: 'oidc',
        signinUrl: `${CANONICAL_ORIGIN}/api/auth/acme/signin/tenant-oidc`,
        callbackUrl: `${CANONICAL_ORIGIN}/api/auth/acme/callback/tenant-oidc`,
      },
    });
  });

  it('tenant の無い path と未登録 tenant を既定 provider へ落とさず拒否する', async () => {
    const handler = createHandler();

    const missing = await handler(new Request(`${CANONICAL_ORIGIN}/api/auth/session`));
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({ error: 'tenant_slug_required' });

    const unknown = await handler(new Request(`${CANONICAL_ORIGIN}/api/auth/unknown/providers`));
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toMatchObject({ error: 'tenant_oidc_not_configured' });
  });

  it('slug の形が不正なら DB を引く前に拒否する', async () => {
    // 大文字を許すと同一テナントが 2 通りの URL を持つ。slug 段階で弾く
    const response = await createHandler()(new Request(`${CANONICAL_ORIGIN}/api/auth/Acme/providers`));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'tenant_slug_invalid' });
  });

  it('basePath 接頭辞に似ているだけの path は認証 endpoint として扱わない', async () => {
    // `/api/auth` の前方一致で `/api/authentication/...` を巻き込まないこと
    const response = await createHandler()(new Request(`${CANONICAL_ORIGIN}/api/authentication/acme/providers`));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'tenant_slug_required' });
  });
});

describe('Auth.js sign-in callback の往復 (AC-1 / AC-2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function driveSignIn(params: {
    readonly users: InMemoryUsers;
    readonly idToken: Readonly<Record<string, unknown>>;
    readonly allowJitProvisioning?: boolean;
  }) {
    const idp = await createFakeOidcIdp({ issuer: ISSUER, audience: CLIENT_ID });
    vi.stubGlobal('fetch', idp.fetch);

    const flow = await driveOidcSignIn({
      handler: createHandler(
        params.allowJitProvisioning === undefined
          ? { users: params.users }
          : { users: params.users, allowJitProvisioning: params.allowJitProvisioning },
      ),
      idp,
      origin: CANONICAL_ORIGIN,
      basePath: TENANT_BASE_PATH,
      idToken: params.idToken,
    });
    return { ...flow, idp };
  }

  it('未知の利用者を JIT provisioning し、session cookie へ Hub の user id と claims を焼く', async () => {
    const users = createInMemoryUsers();
    const { response, authorizeUrl, idp } = await driveSignIn({
      users,
      idToken: { sub: 'idp-subject-acme', email: 'member@acme.example.com', email_verified: true },
    });

    // 認可要求はテナントの IdP へ向き、callback URL は正規 origin に固定される
    expect(authorizeUrl.origin).toBe(ISSUER);
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe(
      `${CANONICAL_ORIGIN}${TENANT_BASE_PATH}/callback/tenant-oidc`,
    );
    expect(idp.tokenRequests()).toHaveLength(1);

    const cookie = setCookieValue(response, SESSION_COOKIE_NAME);
    if (cookie === null) throw new Error('session cookie が書かれていません');

    const verified = await verifySessionToken(cookie, SESSION_SECRET, NOW_SECONDS);
    if (!verified.ok) throw new Error(`session cookie を検証できません: ${verified.reason}`);

    const created = users.all();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ tenantId: 'tenant-acme', idpSubject: 'idp-subject-acme' });
    // sub は IdP の sub ではなく Hub の user id
    expect(verified.claims.sub).toBe(created[0]?.id);
    expect(verified.claims).toMatchObject({
      tenant_id: 'tenant-acme',
      role: 'member',
      status: 'active',
      workspace_ids: [],
      iat: NOW_SECONDS,
    });
  });

  it('既存利用者は再作成せず、DB 側の role / 所属をそのまま claims に載せる', async () => {
    const users = createInMemoryUsers([
      directoryUser({
        id: 'user-existing',
        tenantId: 'tenant-acme',
        idpSubject: 'idp-subject-acme',
        role: 'workspace-admin',
        workspaceIds: ['workspace-acme'],
      }),
    ]);
    // email を送ってこない IdP でも sub だけで解決できること
    const { response } = await driveSignIn({ users, idToken: { sub: 'idp-subject-acme' } });

    const cookie = setCookieValue(response, SESSION_COOKIE_NAME);
    if (cookie === null) throw new Error('session cookie が書かれていません');
    const verified = await verifySessionToken(cookie, SESSION_SECRET, NOW_SECONDS);
    if (!verified.ok) throw new Error(`session cookie を検証できません: ${verified.reason}`);

    expect(users.all()).toHaveLength(1);
    expect(verified.claims).toMatchObject({
      sub: 'user-existing',
      role: 'workspace-admin',
      workspace_ids: ['workspace-acme'],
    });
  });

  it('provisioning を閉じたテナントでは IdP 認証が通っても session cookie を書かない', async () => {
    const users = createInMemoryUsers();
    const { response } = await driveSignIn({
      users,
      allowJitProvisioning: false,
      idToken: { sub: 'idp-subject-stranger', email: 'stranger@acme.example.com' },
    });

    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
    expect(users.all()).toEqual([]);
  });

  it('無効化済みの利用者は IdP 認証が通っても session cookie を書かない', async () => {
    const users = createInMemoryUsers([
      directoryUser({
        id: 'user-disabled',
        tenantId: 'tenant-acme',
        idpSubject: 'idp-subject-disabled',
        status: 'inactive',
      }),
    ]);
    const { response } = await driveSignIn({ users, idToken: { sub: 'idp-subject-disabled' } });

    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
  });
});

describe('Auth.js session の再発行 (AC-2)', () => {
  const staleClaims = {
    sub: 'user-acme',
    tenant_id: 'tenant-acme',
    role: 'member' as const,
    status: 'active' as const,
    workspace_ids: [],
    iat: NOW_SECONDS - UPDATE_AGE_SECONDS,
    exp: NOW_SECONDS + 3600,
  };

  it('updateAge を過ぎた session は利用者を読み直して claims を差し替える', async () => {
    const users = createInMemoryUsers([
      directoryUser({
        id: 'user-acme',
        tenantId: 'tenant-acme',
        role: 'workspace-admin',
        workspaceIds: ['workspace-acme'],
      }),
    ]);
    const token = await signSessionToken(staleClaims, SESSION_SECRET);

    const response = await requestSession(createHandler({ users }), token);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      harnessHub: { userId: 'user-acme', role: 'workspace-admin', workspaceIds: ['workspace-acme'] },
    });

    const reissued = setCookieValue(response, SESSION_COOKIE_NAME);
    if (reissued === null) throw new Error('再発行された session cookie がありません');
    const verified = await verifySessionToken(reissued, SESSION_SECRET, NOW_SECONDS);
    if (!verified.ok) throw new Error(`再発行 cookie を検証できません: ${verified.reason}`);
    // 昇格した role が反映され、iat も現在時刻へ進む
    expect(verified.claims).toMatchObject({ role: 'workspace-admin', iat: NOW_SECONDS });
  });

  it('再発行の時点で利用者が消えていれば session を発行せず cookie を落とす (fail-closed)', async () => {
    const token = await signSessionToken(staleClaims, SESSION_SECRET);

    const response = await requestSession(createHandler({ users: createInMemoryUsers() }), token);

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
  });

  it('再発行の時点で無効化されていれば session を発行しない', async () => {
    const users = createInMemoryUsers([
      directoryUser({ id: 'user-acme', tenantId: 'tenant-acme', status: 'inactive' }),
    ]);
    const token = await signSessionToken(staleClaims, SESSION_SECRET);

    const response = await requestSession(createHandler({ users }), token);

    expect(await response.json()).toBeNull();
    expect(setCookieValue(response, SESSION_COOKIE_NAME)).toBeNull();
  });
});

describe('Auth.js session bridge (AC-2)', () => {
  it('既存 signSessionToken の cookie を Auth.js session endpoint が同じ claims として認識する', async () => {
    const claims = {
      sub: 'user-acme',
      tenant_id: 'tenant-acme',
      role: 'member' as const,
      status: 'active' as const,
      workspace_ids: ['workspace-acme'],
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 3600,
    };
    const token = await signSessionToken(claims, SESSION_SECRET);

    const response = await createHandler()(
      new Request(`${CANONICAL_ORIGIN}/api/auth/acme/session`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      harnessHub: {
        userId: claims.sub,
        tenantId: claims.tenant_id,
        role: claims.role,
        status: claims.status,
        workspaceIds: claims.workspace_ids,
      },
    });
  });

  it('別鍵で署名された cookie は session として認識しない', async () => {
    const forged = await signSessionToken(
      {
        sub: 'user-acme',
        tenant_id: 'tenant-acme',
        role: 'workspace-admin',
        status: 'active',
        workspace_ids: ['workspace-acme'],
        iat: NOW_SECONDS,
        exp: NOW_SECONDS + 3600,
      },
      'different-session-secret-at-least-32-bytes',
    );

    const response = await createHandler()(
      new Request(`${CANONICAL_ORIGIN}/api/auth/acme/session`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${forged}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });
});
