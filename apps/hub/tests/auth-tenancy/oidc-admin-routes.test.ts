/**
 * OIDC 接続管理 route の検査
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * 検査しているのは仕様書「検証方法」の 4 本:
 *   1. provider-admin / workspace-admin / member / 未認証 / publisher token の認可
 *   2. テナント越境の read / write negative
 *   3. 登録 → テスト → 有効化と、無効化後の安全な再開
 *   4. Google 以外の issuer を管理対象へ混ぜないこと
 *
 * 4 で毎回 **「今ログインに使われる secret は何か」を resolver から引き直している**のが要点。
 * 状態列 (`credential_status`) を読んで満足すると、「列は正しいが認証解決は別の行を掴む」
 * という一番怖いずれを見逃す。
 */

import { createRepositoryContext } from '@harness-hub/db';
import type { OidcConnectionMutationResponse } from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDbClientSecretResolver } from '../../src/lib/auth/db-ports.js';
import type { AuthRuntime } from '../../src/lib/authz/runtime.js';
import { TENANT_HEADER } from '../../src/middleware-contract.js';
import {
  ALLOWED_ORIGIN,
  createOidcAdminHarness,
  member,
  NEW_SECRET,
  type OidcAdminHarness,
  providerAdmin,
  SEED_SECRET,
  seededConnectionId,
  sessionCookieFor,
  workspaceAdmin,
} from './support/oidc-admin-runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../src/lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 runtime が未設定です');
      return runtimeHolder.current;
    },
  };
});

const { GET: listConnections, POST: registerConnection } = await import(
  '../../src/app/api/v1/admin/oidc-connections/route.js'
);
const { POST: testConnection } = await import('../../src/app/api/v1/admin/oidc-connections/[id]/test/route.js');
const { DELETE: discardRotation } = await import('../../src/app/api/v1/admin/oidc-connections/[id]/rotation/route.js');
const { POST: activateConnection } = await import('../../src/app/api/v1/admin/oidc-connections/[id]/activate/route.js');
const { POST: disableConnection } = await import('../../src/app/api/v1/admin/oidc-connections/[id]/disable/route.js');

let harness: OidcAdminHarness;

beforeEach(async () => {
  harness = await createOidcAdminHarness();
  runtimeHolder.current = harness.runtime;
});

afterEach(() => {
  runtimeHolder.current = null;
  harness.close();
});

interface RequestOptions {
  /** 未指定なら tenantA の provider-admin。null なら資格情報を載せない。 */
  readonly user?: Parameters<typeof sessionCookieFor>[0] | null;
  /** 申告テナント。未指定なら tenantA。 */
  readonly tenantId?: string;
  /** 未指定なら許可 Origin。null なら header を送らない。 */
  readonly origin?: string | null;
  readonly body?: unknown;
}

async function buildRequest(path: string, method: 'GET' | 'POST' | 'DELETE', options: RequestOptions = {}) {
  const headers = new Headers();
  const user = options.user === undefined ? providerAdmin(harness.tenantA.tenantId) : options.user;
  if (user !== null) headers.set('cookie', await sessionCookieFor(user, harness.db.clock.nowSeconds()));

  headers.set(TENANT_HEADER, options.tenantId ?? harness.tenantA.tenantId);

  const origin = options.origin === undefined ? ALLOWED_ORIGIN : options.origin;
  if (origin !== null) headers.set('origin', origin);

  if (options.body !== undefined) headers.set('content-type', 'application/json');

  return new Request(`https://hub.example.com/api/v1/admin/oidc-connections${path}`, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

/** Next.js の動的 segment。 */
const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

/** 「今このテナントのログインに使われる secret」。認証解決と同じ経路で引く。 */
async function resolvedLoginSecret(tenantSlug: string): Promise<string | null> {
  const connection = await harness.db.ports.oidcConnections.findByTenantSlug(tenantSlug);
  if (connection === null) return null;
  return createDbClientSecretResolver({ repositories: harness.db.repositories })(connection);
}

const changesRecorded = () =>
  harness.audit
    .events()
    .filter((event) => event.action === 'idp.connection_change')
    .map((event) => event.metadata.change);

describe('OIDC 接続管理 route の認可', () => {
  it('provider-admin は一覧を読める', async () => {
    const response = await listConnections(await buildRequest('', 'GET'));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.items).toHaveLength(1);
    // Console へ貼る callback URL は canonicalOrigin から組む (Host ヘッダ由来にしない)
    expect(body.setup.customer_callback_url).toBe('https://hub.example.com/api/auth/acme/callback/tenant-oidc');
  });

  it('Google 以外の IdP は一覧にも操作対象にも入らない', async () => {
    const other = await harness.db.repositories.idpConnections.insert(
      createRepositoryContext({ tenantId: harness.tenantA.tenantId }),
      {
        issuerUrl: 'https://login.example.net',
        clientId: 'other-idp-client',
        clientSecret: SEED_SECRET,
        scopes: 'openid',
      },
    );

    const listed = await listConnections(await buildRequest('', 'GET'));
    const body = await listed.json();
    expect(body.items.map((item: { readonly id: string }) => item.id)).not.toContain(other.id);

    const disabled = await disableConnection(
      await buildRequest(`/${other.id}/disable`, 'POST'),
      routeContext(other.id),
    );
    expect(disabled.status).toBe(409);
    await expect(disabled.json()).resolves.toEqual({ error: 'not_customer_managed' });
    expect(
      (
        await harness.db.repositories.idpConnections.findById(
          createRepositoryContext({ tenantId: harness.tenantA.tenantId }),
          other.id,
        )
      )?.credentialStatus,
    ).toBe('active');
  });

  it('workspace-admin は 403 (テナント内の管理者でも認証設定は触れない)', async () => {
    const response = await listConnections(
      await buildRequest('', 'GET', { user: workspaceAdmin(harness.tenantA.tenantId) }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'insufficient_role' });
  });

  it('member は 403', async () => {
    const response = await listConnections(await buildRequest('', 'GET', { user: member(harness.tenantA.tenantId) }));
    expect(response.status).toBe(403);
  });

  it('未認証は 401', async () => {
    const response = await listConnections(await buildRequest('', 'GET', { user: null }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'unauthenticated' });
  });

  it('テナント申告が無い要求は 400 (資源を確定できない)', async () => {
    const headers = new Headers({
      cookie: await sessionCookieFor(providerAdmin(harness.tenantA.tenantId), harness.db.clock.nowSeconds()),
    });
    const response = await listConnections(
      new Request('https://hub.example.com/api/v1/admin/oidc-connections', { headers }),
    );
    expect(response.status).toBe(400);
  });

  it('許可外 Origin の状態変更要求は 403 (CSRF)', async () => {
    const response = await registerConnection(
      await buildRequest('', 'POST', {
        origin: 'https://evil.example.com',
        body: { client_id: 'client-x', client_secret: NEW_SECRET },
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'untrusted_origin' });
  });
});

describe('テナント越境', () => {
  it('tenant A を申告した provider-admin は tenant B の接続 id へ到達できない', async () => {
    const foreignId = await seededConnectionId(harness, harness.tenantB.tenantId);
    const response = await disableConnection(
      await buildRequest(`/${foreignId}/disable`, 'POST'),
      routeContext(foreignId),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'connection_not_found' });
    // 到達できなかっただけでなく、B 側の状態が動いていないこと
    const rowsB = await harness.db.repositories.idpConnections.list(
      createRepositoryContext({ tenantId: harness.tenantB.tenantId }),
    );
    expect(rowsB[0]?.credentialStatus).toBe('active');
  });

  it('tenant A の workspace-admin が tenant B を申告すると 404 (存在を漏らさない)', async () => {
    const response = await listConnections(
      await buildRequest('', 'GET', {
        user: workspaceAdmin(harness.tenantA.tenantId),
        tenantId: harness.tenantB.tenantId,
      }),
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'tenant_mismatch' });
  });

  it('provider-admin の越境は許可されるが必ず監査へ残る', async () => {
    const response = await listConnections(await buildRequest('', 'GET', { tenantId: harness.tenantB.tenantId }));
    expect(response.status).toBe(200);

    const crossed = harness.audit.events().find((event) => event.action === 'provider.cross_tenant_access');
    expect(crossed?.tenantId).toBe(harness.tenantB.tenantId);
    expect(crossed?.metadata).toMatchObject({ allowed: true, requested_action: 'idp.connection_read' });
  });
});

/**
 * 初回登録 (接続を 1 件も持たないテナント) の経路。
 *
 * `idp_connections_tenant_issuer_uq` があるので **行が作られるのはここだけ**。
 * 既に Google 接続を持つテナントへの登録は次の describe の staging 経路になる。
 */
describe('初回登録と有効化の順序', () => {
  const freshRequest = (path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown) =>
    buildRequest(path, method, {
      user: providerAdmin(harness.tenantFresh.tenantId),
      tenantId: harness.tenantFresh.tenantId,
      ...(body === undefined ? {} : { body }),
    });

  const registerFresh = async (): Promise<{
    readonly status: number;
    readonly body: OidcConnectionMutationResponse;
  }> => {
    const response = await registerConnection(
      await freshRequest('', 'POST', { client_id: 'client-initech', client_secret: NEW_SECRET }),
    );
    return { status: response.status, body: (await response.json()) as OidcConnectionMutationResponse };
  };

  it('登録した接続は pending で、認証解決には現れない', async () => {
    const { status, body } = await registerFresh();
    expect(status).toBe(201);
    expect(body.connection.credential_status).toBe('pending');
    expect(body.connection.resolvable).toBe(false);
    // 登録しただけではログインできない = 未検証 credential が認証へ回らない (受入条件 1)
    await expect(resolvedLoginSecret(harness.tenantFresh.tenantSlug)).resolves.toBeNull();
    expect(changesRecorded()).toContain('registered');
  });

  it('テストを通さずに有効化はできない', async () => {
    const { body } = await registerFresh();
    const id = body.connection.id;

    const response = await activateConnection(await freshRequest(`/${id}/activate`, 'POST'), routeContext(id));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_transition' });
    await expect(resolvedLoginSecret(harness.tenantFresh.tenantSlug)).resolves.toBeNull();
  });

  it('テスト合格 → 有効化でログインに使われるようになる', async () => {
    const { body } = await registerFresh();
    const id = body.connection.id;

    const tested = await testConnection(await freshRequest(`/${id}/test`, 'POST', {}), routeContext(id));
    expect(tested.status).toBe(200);
    expect((await tested.json()).connection.credential_status).toBe('tested');
    // `tested` はまだ解決対象でない。テストに通っただけの接続でログインを切り替えない
    await expect(resolvedLoginSecret(harness.tenantFresh.tenantSlug)).resolves.toBeNull();

    const activated = await activateConnection(await freshRequest(`/${id}/activate`, 'POST'), routeContext(id));
    expect(activated.status).toBe(200);
    expect((await activated.json()).connection.resolvable).toBe(true);
    await expect(resolvedLoginSecret(harness.tenantFresh.tenantSlug)).resolves.toBe(NEW_SECRET);
  });

  it('接続テストの不合格は 200 + passed:false で、状態を進めない', async () => {
    harness.tester.setOutcome({ passed: false, reason: 'invalid_client' });
    const { body } = await registerFresh();
    const id = body.connection.id;

    const response = await testConnection(await freshRequest(`/${id}/test`, 'POST', {}), routeContext(id));
    expect(response.status).toBe(200);

    const failed = await response.json();
    expect(failed).toMatchObject({ passed: false, failure_reason: 'invalid_client' });
    expect(failed.connection.credential_status).toBe('pending');
    expect(changesRecorded()).toContain('test_failed');
  });

  it('active の再テストも last_tested_at を更新し、状態は active のまま保つ', async () => {
    const id = await seededConnectionId(harness, harness.tenantA.tenantId);
    const response = await testConnection(await buildRequest(`/${id}/test`, 'POST', { body: {} }), routeContext(id));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.connection.credential_status).toBe('active');
    expect(body.connection.last_tested_at).not.toBeNull();
  });
});

/**
 * 既存 Google 接続を持つテナントへの登録 = credential 一式の staging。
 *
 * ここが `(tenant_id, issuer_url)` の一意制約に対する答え。行を増やせない以上、
 * 「別の OAuth client へ載せ替える」も「共有方式から顧客方式へ切り替える」も
 * 既存 1 行の差し替えになる。上書きではなく staging にすることで、
 * 昇格の瞬間まで現行 credential でログインでき、失敗したら捨てるだけで戻せる。
 */
describe('既存接続への登録 (credential 載せ替え)', () => {
  it('登録は現行 credential を残したまま staging される', async () => {
    const response = await registerConnection(
      await buildRequest('', 'POST', { body: { client_id: 'client-swapped', client_secret: NEW_SECRET } }),
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    // 行は active のまま。登録した瞬間にログインが止まらないことが要点
    expect(body.connection.credential_status).toBe('active');
    expect(body.connection.client_id).toBe(harness.tenantA.clientId);
    expect(body.connection.rotation).toMatchObject({ staged: true, pending_client_id: 'client-swapped' });
    await expect(resolvedLoginSecret('acme')).resolves.toBe(SEED_SECRET);
    expect(changesRecorded()).toContain('credential_staged');
  });

  it('テスト合格 → 有効化で client ID と secret が同時に切り替わる', async () => {
    const id = await seededConnectionId(harness, harness.tenantA.tenantId);
    await registerConnection(
      await buildRequest('', 'POST', { body: { client_id: 'client-swapped', client_secret: NEW_SECRET } }),
    );

    const tested = await testConnection(
      await buildRequest(`/${id}/test`, 'POST', { body: { target: 'pending' } }),
      routeContext(id),
    );
    expect(tested.status).toBe(200);
    // 接続テストは staging 側の client ID で行う (現行 ID と新 secret の組を試さない)
    expect(harness.tester.calls.at(-1)?.clientId).toBe('client-swapped');
    expect(harness.tester.calls.at(-1)?.clientSecret).toBe(NEW_SECRET);
    // 合格しただけではまだ切り替わらない
    await expect(resolvedLoginSecret('acme')).resolves.toBe(SEED_SECRET);

    const activated = await activateConnection(await buildRequest(`/${id}/activate`, 'POST'), routeContext(id));
    expect(activated.status).toBe(200);

    const body = await activated.json();
    expect(body.connection.client_id).toBe('client-swapped');
    expect(body.connection.rotation.staged).toBe(false);
    await expect(resolvedLoginSecret('acme')).resolves.toBe(NEW_SECRET);
  });

  it('staging の取消で現行 credential が無傷のまま残る', async () => {
    const id = await seededConnectionId(harness, harness.tenantA.tenantId);
    await registerConnection(
      await buildRequest('', 'POST', { body: { client_id: 'client-swapped', client_secret: NEW_SECRET } }),
    );

    const discarded = await discardRotation(await buildRequest(`/${id}/rotation`, 'DELETE'), routeContext(id));
    expect(discarded.status).toBe(200);

    const body = await discarded.json();
    expect(body.connection.rotation).toMatchObject({ staged: false, pending_client_id: null });
    expect(body.connection.client_id).toBe(harness.tenantA.clientId);
    await expect(resolvedLoginSecret('acme')).resolves.toBe(SEED_SECRET);
  });

  it('無効化した接続は新 credential の再登録 → テスト → 有効化で再開できる', async () => {
    const id = await seededConnectionId(harness, harness.tenantA.tenantId);
    await disableConnection(await buildRequest(`/${id}/disable`, 'POST'), routeContext(id));

    const registered = await registerConnection(
      await buildRequest('', 'POST', { body: { client_id: 'client-swapped', client_secret: NEW_SECRET } }),
    );
    expect(registered.status).toBe(201);
    const staged = await registered.json();
    expect(staged.connection).toMatchObject({ credential_status: 'pending', resolvable: false });
    expect(staged.connection.rotation).toMatchObject({ staged: true, pending_client_id: 'client-swapped' });
    await expect(resolvedLoginSecret('acme')).resolves.toBeNull();

    const tested = await testConnection(
      await buildRequest(`/${id}/test`, 'POST', { body: { target: 'pending' } }),
      routeContext(id),
    );
    expect((await tested.json()).passed).toBe(true);

    const activated = await activateConnection(await buildRequest(`/${id}/activate`, 'POST'), routeContext(id));
    expect(activated.status).toBe(200);
    await expect(resolvedLoginSecret('acme')).resolves.toBe(NEW_SECRET);
    expect(changesRecorded()).toContain('reactivation_staged');
  });
});
