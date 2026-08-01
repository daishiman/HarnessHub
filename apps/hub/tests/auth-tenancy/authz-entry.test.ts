/** T-AUTHZ-11〜13: withAuthz 単一入口と role 順序の結合検証。 */

import { describe, expect, it } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { buildSessionClaims, signSessionToken } from '../../src/lib/auth/index.js';
import { type AuthzRuntimeDeps, withAuthz } from '../../src/lib/authz/with-authz.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import {
  createTestPorts,
  directoryUser,
  TENANT_A,
  TENANT_B,
  type TestPorts,
  WORKSPACE_A1,
} from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const SELF = 'user-self';

// ---------------------------------------------------------------------------
// withAuthz (単一入口) の振る舞い
// ---------------------------------------------------------------------------

interface Harness {
  readonly ports: TestPorts;
  readonly audit: ReturnType<typeof createInMemoryAuditSink>;
  readonly deps: AuthzRuntimeDeps;
}

function createHarness(): Harness {
  const ports = createTestPorts({
    users: [directoryUser({ id: SELF, tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1] })],
  });
  ports.clock.set(NOW);
  const sink = createInMemoryAuditSink();

  return {
    ports,
    audit: sink,
    deps: {
      ports,
      audit: createAuditLogger({ sink, now: () => new Date(NOW * 1000), newId: () => 'audit-1' }),
      revocation: { isRevoked: async () => false },
      sessionSecret: 'session-secret',
      accessTokenSecret: 'access-secret',
      allowedOrigins: ['https://hub.example.com'],
    },
  };
}

async function sessionRequest(
  options: {
    readonly userId?: string;
    readonly tenantId?: string;
    readonly role?: 'member' | 'workspace-admin' | 'provider-admin';
    readonly workspaceIds?: readonly string[];
    readonly method?: string;
    readonly origin?: string | null;
  } = {},
): Promise<Request> {
  const claims = buildSessionClaims(
    directoryUser({
      id: options.userId ?? SELF,
      tenantId: options.tenantId ?? TENANT_A,
      role: options.role ?? 'member',
      workspaceIds: options.workspaceIds ?? [WORKSPACE_A1],
    }),
    NOW,
  );
  const token = await signSessionToken(claims, 'session-secret');

  const headers = new Headers({ cookie: `${SESSION_COOKIE_NAME}=${token}` });
  if (options.origin !== null && options.origin !== undefined) headers.set('origin', options.origin);

  return new Request('https://hub.example.com/api/v1/tokens', {
    method: options.method ?? 'GET',
    headers,
  });
}

describe('T-AUTHZ-11〜13: withAuthz (単一認可入口)', () => {
  it('T-AUTHZ-11: 拒否時は業務 handler を呼ばない', async () => {
    const harness = createHarness();
    let handlerCalls = 0;

    const route = withAuthz(
      {
        action: 'token.list.workspace',
        deps: harness.deps,
        resolveResource: async () => ({
          type: 'token',
          id: null,
          tenantId: TENANT_A,
          workspaceId: WORKSPACE_A1,
          ownerUserId: null,
        }),
      },
      async () => {
        handlerCalls += 1;
        return Response.json({ ok: true });
      },
    );

    const response = await route(await sessionRequest({ role: 'member' }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'insufficient_role' });
    // 副作用が起きないことが要点。status だけ見ていると handler が走った後で潰した実装を通してしまう
    expect(handlerCalls).toBe(0);
  });

  it('T-AUTHZ-12: 越境要求は許可・拒否にかかわらず監査へ 1 件落ちる', async () => {
    const harness = createHarness();

    const route = withAuthz(
      {
        action: 'token.list.workspace',
        deps: harness.deps,
        resolveResource: async () => ({
          type: 'token',
          id: 'token-x',
          tenantId: TENANT_B,
          workspaceId: null,
          ownerUserId: null,
        }),
      },
      async () => Response.json({ ok: true }),
    );

    const response = await route(await sessionRequest({ role: 'provider-admin' }));

    expect(response.status).toBe(200);
    const events = harness.audit.events();
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe('provider.cross_tenant_access');
    expect(events[0]?.tenantId).toBe(TENANT_B);
    expect(events[0]?.metadata).toMatchObject({
      actor_tenant_id: TENANT_A,
      requested_tenant_id: TENANT_B,
      requested_action: 'token.list.workspace',
      allowed: true,
      credential: 'session',
    });
  });

  it('T-AUTHZ-12 補: 拒否された provider-admin の越境も記録される (痕跡を残す)', async () => {
    const harness = createHarness();

    const route = withAuthz(
      {
        // metrics.ingest は access token 専用なので session 主体は拒否される。
        action: 'metrics.ingest',
        deps: harness.deps,
        resolveResource: async () => ({
          type: 'token',
          id: 'token-x',
          tenantId: TENANT_B,
          workspaceId: null,
          ownerUserId: null,
        }),
      },
      async () => Response.json({ ok: true }),
    );

    const response = await route(await sessionRequest({ role: 'provider-admin' }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'credential_not_allowed' });
    const events = harness.audit.events();
    expect(events).toHaveLength(1);
    expect(events[0]?.tenantId).toBe(TENANT_B);
    expect(events[0]?.metadata).toMatchObject({ actor_tenant_id: TENANT_A, allowed: false });
  });

  it('T-AUTHZ-13: 同一テナント内では監査を書かない (監査の希釈を避ける)', async () => {
    const harness = createHarness();

    const route = withAuthz(
      {
        action: 'token.list.self',
        deps: harness.deps,
        resolveResource: async (_request, _params, principal) => ({
          type: 'token',
          id: null,
          tenantId: TENANT_A,
          workspaceId: WORKSPACE_A1,
          ownerUserId: principal.userId,
        }),
      },
      async () => Response.json({ ok: true }),
    );

    const response = await route(await sessionRequest());

    expect(response.status).toBe(200);
    expect(harness.audit.events()).toHaveLength(0);
  });

  it('T-AUTHZ-11 補: 資源を決められない要求は 400 (推測で埋めない)', async () => {
    const harness = createHarness();
    const route = withAuthz(
      { action: 'token.list.self', deps: harness.deps, resolveResource: async () => null },
      async () => Response.json({ ok: true }),
    );

    const response = await route(await sessionRequest());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
  });

  it('T-AUTHZ-11 補: 資格情報が無ければ 401', async () => {
    const harness = createHarness();
    const route = withAuthz(
      {
        action: 'token.list.self',
        deps: harness.deps,
        resolveResource: async () => ({
          type: 'token',
          id: null,
          tenantId: TENANT_A,
          workspaceId: null,
          ownerUserId: SELF,
        }),
      },
      async () => Response.json({ ok: true }),
    );

    const response = await route(new Request('https://hub.example.com/api/v1/tokens'));
    expect(response.status).toBe(401);
  });

  it('session claims の有効期間が仕様値 8 時間', () => {
    const claims = buildSessionClaims(directoryUser({ id: SELF, tenantId: TENANT_A }), NOW);
    // 実装の定数ではなく仕様書のリテラル値と突き合わせる (config.ts の注記)
    expect(claims.exp - claims.iat).toBe(8 * 60 * 60);
  });
});
