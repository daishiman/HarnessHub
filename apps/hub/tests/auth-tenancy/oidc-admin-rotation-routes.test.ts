/** OIDC 管理 route の rotation・secret 非露出検査。 */

import { createRepositoryContext } from '@harness-hub/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDbClientSecretResolver } from '../../src/lib/auth/db-ports.js';
import type { AuthRuntime } from '../../src/lib/authz/runtime.js';
import { TENANT_HEADER } from '../../src/middleware-contract.js';
import {
  ALLOWED_ORIGIN,
  createOidcAdminHarness,
  NEW_SECRET,
  type OidcAdminHarness,
  providerAdmin,
  SEED_SECRET,
  seededConnectionId,
  sessionCookieFor,
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
const { POST: stageRotation, DELETE: discardRotation } = await import(
  '../../src/app/api/v1/admin/oidc-connections/[id]/rotation/route.js'
);
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

async function buildRequest(path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<Request> {
  const headers = new Headers({
    [TENANT_HEADER]: harness.tenantA.tenantId,
    origin: ALLOWED_ORIGIN,
    cookie: await sessionCookieFor(providerAdmin(harness.tenantA.tenantId), harness.db.clock.nowSeconds()),
  });
  if (body !== undefined) headers.set('content-type', 'application/json');
  return new Request(`https://hub.example.com/api/v1/admin/oidc-connections${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

async function resolvedLoginSecret(tenantSlug: string): Promise<string | null> {
  const connection = await harness.db.ports.oidcConnections.findByTenantSlug(tenantSlug);
  if (connection === null) return null;
  return createDbClientSecretResolver({ repositories: harness.db.repositories })(connection);
}

const auditActions = () => harness.audit.events().map((event) => event.action);
const changesRecorded = () =>
  harness.audit
    .events()
    .filter((event) => event.action === 'idp.connection_change')
    .map((event) => event.metadata.change);

describe('secret のローテーション', () => {
  const activeId = () => seededConnectionId(harness, harness.tenantA.tenantId);

  it('staging 中も現行 secret でログインでき、切替は activate だけで起きる', async () => {
    const id = await activeId();
    const staged = await stageRotation(
      await buildRequest(`/${id}/rotation`, 'POST', { client_secret: NEW_SECRET }),
      routeContext(id),
    );
    expect(staged.status).toBe(200);
    expect((await staged.json()).connection.rotation).toMatchObject({ staged: true, pending_tested_at: null });
    await expect(resolvedLoginSecret('acme')).resolves.toBe(SEED_SECRET);

    const tested = await testConnection(
      await buildRequest(`/${id}/test`, 'POST', { target: 'pending' }),
      routeContext(id),
    );
    expect(tested.status).toBe(200);
    expect((await tested.json()).passed).toBe(true);
    expect(harness.tester.calls.at(-1)?.clientSecret).toBe(NEW_SECRET);
    await expect(resolvedLoginSecret('acme')).resolves.toBe(SEED_SECRET);

    const activated = await activateConnection(await buildRequest(`/${id}/activate`, 'POST'), routeContext(id));
    expect(activated.status).toBe(200);
    expect((await activated.json()).connection.rotation.staged).toBe(false);
    await expect(resolvedLoginSecret('acme')).resolves.toBe(NEW_SECRET);
    expect(changesRecorded()).toEqual(['rotation_staged', 'rotation_tested', 'rotation_activated']);
  });

  it('新 secret のテストが不合格なら切り替えられず、旧 secret が生き続ける', async () => {
    const id = await activeId();
    await stageRotation(await buildRequest(`/${id}/rotation`, 'POST', { client_secret: NEW_SECRET }), routeContext(id));
    harness.tester.setOutcome({ passed: false, reason: 'invalid_client' });
    const tested = await testConnection(
      await buildRequest(`/${id}/test`, 'POST', { target: 'pending' }),
      routeContext(id),
    );
    expect((await tested.json()).passed).toBe(false);

    const activated = await activateConnection(await buildRequest(`/${id}/activate`, 'POST'), routeContext(id));
    expect(activated.status).toBe(409);
    await expect(activated.json()).resolves.toEqual({ error: 'invalid_transition' });
    await expect(resolvedLoginSecret('acme')).resolves.toBe(SEED_SECRET);
  });

  it('rollback: staging を破棄しても現行 secret は無傷', async () => {
    const id = await activeId();
    await stageRotation(await buildRequest(`/${id}/rotation`, 'POST', { client_secret: NEW_SECRET }), routeContext(id));
    const discarded = await discardRotation(await buildRequest(`/${id}/rotation`, 'DELETE'), routeContext(id));
    expect(discarded.status).toBe(200);
    expect((await discarded.json()).connection.rotation).toMatchObject({
      staged: false,
      pending_client_secret_last4: null,
    });
    await expect(resolvedLoginSecret('acme')).resolves.toBe(SEED_SECRET);
    expect(changesRecorded()).toContain('rotation_discarded');
  });

  it('rotation 中でないのに破棄すると rotation_not_staged', async () => {
    const id = await activeId();
    const response = await discardRotation(await buildRequest(`/${id}/rotation`, 'DELETE'), routeContext(id));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'rotation_not_staged' });
  });

  it('CAS 競合時は別 secret を検証済みにしない', async () => {
    const id = await activeId();
    await stageRotation(await buildRequest(`/${id}/rotation`, 'POST', { client_secret: NEW_SECRET }), routeContext(id));
    const context = createRepositoryContext({ tenantId: harness.tenantA.tenantId });
    harness.tester.setOnCall(async () => {
      await harness.db.repositories.idpConnections.stagePendingSecret(context, id, 'goog-third-0003');
    });

    const response = await testConnection(
      await buildRequest(`/${id}/test`, 'POST', { target: 'pending' }),
      routeContext(id),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'state_conflict' });
    expect((await harness.db.repositories.idpConnections.findById(context, id))?.pendingTestedAt).toBeNull();
    await expect(resolvedLoginSecret('acme')).resolves.toBe(SEED_SECRET);
  });

  it('無効化した接続へは rotation を積めず、ログイン解決も止まる', async () => {
    const id = await activeId();
    const disabled = await disableConnection(await buildRequest(`/${id}/disable`, 'POST'), routeContext(id));
    expect(disabled.status).toBe(200);
    await expect(resolvedLoginSecret('acme')).resolves.toBeNull();

    const response = await stageRotation(
      await buildRequest(`/${id}/rotation`, 'POST', { client_secret: NEW_SECRET }),
      routeContext(id),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_transition' });
    expect(changesRecorded()).toContain('disabled');
  });
});

describe('secret の非露出', () => {
  it('応答本文・監査 payload のどこにも平文 secret が現れない', async () => {
    const id = await seededConnectionId(harness, harness.tenantA.tenantId);
    const bodies: string[] = [];
    bodies.push(
      await (
        await registerConnection(await buildRequest('', 'POST', { client_id: 'client-new', client_secret: NEW_SECRET }))
      ).text(),
    );
    bodies.push(
      await (
        await stageRotation(
          await buildRequest(`/${id}/rotation`, 'POST', { client_secret: NEW_SECRET }),
          routeContext(id),
        )
      ).text(),
    );
    bodies.push(
      await (
        await testConnection(await buildRequest(`/${id}/test`, 'POST', { target: 'pending' }), routeContext(id))
      ).text(),
    );
    bodies.push(await (await listConnections(await buildRequest('', 'GET'))).text());

    for (const body of bodies) {
      expect(body).not.toContain(NEW_SECRET);
      expect(body).not.toContain(SEED_SECRET);
    }
    expect(bodies.join('')).toContain(NEW_SECRET.slice(-4));
    const auditPayload = JSON.stringify(harness.audit.events());
    expect(auditPayload).not.toContain(NEW_SECRET);
    expect(auditPayload).not.toContain(SEED_SECRET);
    expect(new Set(auditActions())).toEqual(new Set(['idp.connection_change']));
  });
});
