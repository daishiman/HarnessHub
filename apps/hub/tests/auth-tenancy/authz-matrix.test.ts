/**
 * T-AUTHZ-01 〜 T-AUTHZ-13 (QC-2)。
 *
 * `decide()` は同期の純関数なので、判定表を**期待値の表**としてそのまま書ける。
 * 表と表を突き合わせる形にしておくと、規則を足したときに差分が読める。
 */

import type { PublisherTokenScope } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { buildSessionClaims, signSessionToken } from '../../src/lib/auth/index.js';
import { decide, resolveEffectiveRole } from '../../src/lib/authz/decide.js';
import { ACTION_RULES } from '../../src/lib/authz/rules.js';
import type { AuthzPrincipal, AuthzResourceRef, EffectiveRole } from '../../src/lib/authz/types.js';
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
const OTHER = 'user-other';
const ALL_SCOPES: readonly PublisherTokenScope[] = [
  'publish:write',
  'metrics:write',
  'feedback:write',
  'aijob:process',
];

/** 判定表の 4 列。`owner` だけは role 列の値ではなく「資源との関係」で作る (ADR AD-3)。 */
type MatrixColumn = 'member' | 'owner' | 'workspace-admin' | 'provider-admin';

function principalFor(column: MatrixColumn, overrides: Partial<AuthzPrincipal> = {}): AuthzPrincipal {
  return {
    userId: SELF,
    tenantId: TENANT_A,
    role: column === 'owner' ? 'member' : column,
    status: 'active',
    issuedAtSeconds: NOW,
    workspaceIds: [WORKSPACE_A1],
    scope: null,
    credential: 'session',
    ...overrides,
  };
}

/** `owner` 列だけ資源の所有者を自分にする。それ以外は他人の資源で評価する。 */
function resourceFor(column: MatrixColumn, overrides: Partial<AuthzResourceRef> = {}): AuthzResourceRef {
  return {
    type: 'token',
    id: 'token-1',
    tenantId: TENANT_A,
    workspaceId: WORKSPACE_A1,
    ownerUserId: column === 'owner' ? SELF : OTHER,
    ...overrides,
  };
}

const MEMBER_UP = { member: true, owner: true, 'workspace-admin': true, 'provider-admin': true } as const;
const OWNER_UP = { member: false, owner: true, 'workspace-admin': true, 'provider-admin': true } as const;
const ADMIN_UP = { member: false, owner: false, 'workspace-admin': true, 'provider-admin': true } as const;
const PROVIDER_ONLY = { member: false, owner: false, 'workspace-admin': false, 'provider-admin': true } as const;
const SELF_OR_ADMIN = { member: false, owner: true, 'workspace-admin': true, 'provider-admin': true } as const;

/** security-spec §3.4 の全 action と、本 feature の route 用補助 action の期待 role 表。 */
const EXPECTED_MATRIX: Readonly<Record<string, Readonly<Record<MatrixColumn, boolean>>>> = {
  'metrics.read_aggregate': MEMBER_UP,
  'sheets.create': MEMBER_UP,
  'sheets.read_own': SELF_OR_ADMIN,
  'sheets.read_all': ADMIN_UP,
  'sheets.status_change': ADMIN_UP,
  'sheets.regenerate': ADMIN_UP,
  'builds.read': MEMBER_UP,
  'builds.stage_change': ADMIN_UP,
  'projects.create': MEMBER_UP,
  'projects.update': OWNER_UP,
  'harnesses.read': MEMBER_UP,
  'harnesses.install': MEMBER_UP,
  'publish.request': OWNER_UP,
  'publish.approve': ADMIN_UP,
  'publish.reject': ADMIN_UP,
  'channel.promote': OWNER_UP,
  'channel.rollback': OWNER_UP,
  'release.suspend': OWNER_UP,
  'feedback.create': MEMBER_UP,
  'feedback.read': MEMBER_UP,
  'feedback.status_change': ADMIN_UP,
  'docs.read': MEMBER_UP,
  'docs.write_tenant': ADMIN_UP,
  'docs.write_common': PROVIDER_ONLY,
  'users.read': ADMIN_UP,
  'users.write': ADMIN_UP,
  'users.role_change': ADMIN_UP,
  'users.read_salary': ADMIN_UP,
  'users.write_salary': ADMIN_UP,
  'coefficients.change': ADMIN_UP,
  'audit.read': ADMIN_UP,
  'aijob.pull': ADMIN_UP,
  'aijob.complete': SELF_OR_ADMIN,
  'aijob.fail': SELF_OR_ADMIN,
  'token.revoke_own': SELF_OR_ADMIN,
  'token.revoke_any': ADMIN_UP,
  'metrics.ingest': MEMBER_UP,
  'device.approve': MEMBER_UP,
  'token.list.self': SELF_OR_ADMIN,
  'token.list.workspace': ADMIN_UP,
  'token.revoke': SELF_OR_ADMIN,
  'publish.write': OWNER_UP,
};

const COLUMNS: readonly MatrixColumn[] = ['member', 'owner', 'workspace-admin', 'provider-admin'];
const TOKEN_ONLY_ACTIONS = new Set(['aijob.pull', 'aijob.complete', 'aijob.fail', 'metrics.ingest']);

function matrixPrincipal(action: string, column: MatrixColumn): AuthzPrincipal {
  if (TOKEN_ONLY_ACTIONS.has(action)) {
    return principalFor(column, { credential: 'access_token', scope: ALL_SCOPES });
  }
  return principalFor(column);
}

describe('T-AUTHZ-01/02: 認可マトリクス (QC-2)', () => {
  it('T-AUTHZ-01: 規則表の全 action × role 4 種が期待表と一致する', () => {
    // 表に載っていない action が実装側にあれば、その時点で気付けるようにする
    expect(Object.keys(ACTION_RULES).sort()).toEqual(Object.keys(EXPECTED_MATRIX).sort());

    for (const [action, expectedRow] of Object.entries(EXPECTED_MATRIX)) {
      for (const column of COLUMNS) {
        const outcome = decide({
          action,
          principal: matrixPrincipal(action, column),
          resource: resourceFor(column),
          sessionRevoked: false,
        });
        expect(outcome.allowed, `${action} × ${column}`).toBe(expectedRow[column]);
      }

      // owner / 非 owner を role ごとに両面確認する。owner 合成で結果が変わり得るのは member だけで、
      // admin 以上は対象を所有していても格下げされない。
      for (const role of ['member', 'workspace-admin', 'provider-admin'] as const) {
        for (const ownsResource of [false, true]) {
          const expectedColumn: MatrixColumn = role === 'member' && ownsResource ? 'owner' : role;
          const outcome = decide({
            action,
            principal: matrixPrincipal(action, role),
            resource: resourceFor(role, { ownerUserId: ownsResource ? SELF : OTHER }),
            sessionRevoked: false,
          });
          expect(outcome.allowed, `${action} × ${role} × owner=${ownsResource}`).toBe(expectedRow[expectedColumn]);
        }
      }

      // 全 action で tenant 境界を検査する。provider-admin だけが越境でき、他 role は
      // role の強さや owner 関係を見る前に tenant_mismatch へ落ちる。
      for (const role of ['member', 'workspace-admin'] as const) {
        expect(
          decide({
            action,
            principal: matrixPrincipal(action, role),
            resource: resourceFor(role, { tenantId: TENANT_B, workspaceId: null }),
            sessionRevoked: false,
          }),
          `${action} × ${role} × cross-tenant`,
        ).toEqual({ allowed: false, reason: 'tenant_mismatch' });
      }
      expect(
        decide({
          action,
          principal: matrixPrincipal(action, 'provider-admin'),
          resource: resourceFor('provider-admin', { tenantId: TENANT_B, workspaceId: null }),
          sessionRevoked: false,
        }).allowed,
        `${action} × provider-admin × cross-tenant`,
      ).toBe(true);
    }
  });

  it('T-AUTHZ-02: 判定表が単調 (上位 role で許可が減る行が無い)', () => {
    for (const action of Object.keys(ACTION_RULES)) {
      let seenAllowed = false;
      for (const column of COLUMNS) {
        const allowed = decide({
          action,
          principal: matrixPrincipal(action, column),
          resource: resourceFor(column),
          sessionRevoked: false,
        }).allowed;

        // 一度許可が立った以上の列で拒否へ戻ったら非単調
        if (seenAllowed) expect(allowed, `${action} が ${column} で非単調`).toBe(true);
        if (allowed) seenAllowed = true;
      }
    }
  });
});

describe('T-AUTHZ-03〜10: 拒否理由 (QC-2)', () => {
  it('T-AUTHZ-03: 規則表に無い action は no_rule (deny-by-default)', () => {
    expect(
      decide({
        action: 'harness.delete.everything',
        principal: principalFor('provider-admin'),
        resource: resourceFor('provider-admin'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'no_rule' });
  });

  it('T-AUTHZ-03 補: Object.prototype の名前を action に使っても素通りしない', () => {
    // `ACTION_RULES[action]` を素の `in` や添字で見ると 'toString' が規則として拾われる
    expect(
      decide({
        action: 'toString',
        principal: principalFor('provider-admin'),
        resource: resourceFor('provider-admin'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'no_rule' });
  });

  it('T-AUTHZ-04: status=inactive は inactive_user', () => {
    expect(
      decide({
        action: 'device.approve',
        principal: principalFor('provider-admin', { status: 'inactive' }),
        resource: resourceFor('provider-admin'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'inactive_user' });
  });

  it('T-AUTHZ-05: member かつ自分の資源なら実効 role が owner に合成される', () => {
    expect(resolveEffectiveRole(principalFor('owner'), resourceFor('owner'))).toEqual({ ok: true, role: 'owner' });
  });

  it('T-AUTHZ-06: member かつ他人の資源では member のまま', () => {
    expect(resolveEffectiveRole(principalFor('member'), resourceFor('member'))).toEqual({ ok: true, role: 'member' });
  });

  it('T-AUTHZ-06 補: workspace-admin に owner を合成しない (格下げ防止)', () => {
    // 全順序が workspace-admin > owner なので、合成すると自分の資源にだけ権限が下がる逆転が起きる
    expect(resolveEffectiveRole(principalFor('workspace-admin'), resourceFor('owner'))).toEqual({
      ok: true,
      role: 'workspace-admin',
    });
  });

  it('T-AUTHZ-07: selfOnly の action を他人の資源へ向けると not_owner', () => {
    expect(
      decide({
        action: 'token.revoke',
        principal: principalFor('member'),
        resource: resourceFor('member'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'not_owner' });
  });

  it('T-AUTHZ-08: token 主体で scope 不足なら missing_scope', () => {
    expect(
      decide({
        action: 'publish.write',
        principal: principalFor('workspace-admin', {
          credential: 'access_token',
          scope: ['metrics:write'],
        }),
        resource: resourceFor('workspace-admin'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'missing_scope' });
  });

  it('T-AUTHZ-08 補: session 主体は session/Bearer 共用 action で token scope を要求されない', () => {
    expect(
      decide({
        action: 'publish.write',
        principal: principalFor('provider-admin', { scope: null, credential: 'session' }),
        resource: resourceFor('provider-admin'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: true, effectiveRole: 'provider-admin' });
  });

  it('T-AUTHZ-08 補2: 資格情報種別が違う action は credential_not_allowed', () => {
    expect(
      decide({
        action: 'metrics.ingest',
        principal: principalFor('provider-admin'),
        resource: resourceFor('provider-admin'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'credential_not_allowed' });

    expect(
      decide({
        action: 'users.read',
        principal: principalFor('provider-admin', { credential: 'access_token', scope: ALL_SCOPES }),
        resource: resourceFor('provider-admin'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'credential_not_allowed' });
  });

  it('T-AUTHZ-09: scope 充足でも role 不足なら insufficient_role', () => {
    expect(
      decide({
        action: 'token.list.workspace',
        principal: principalFor('member'),
        resource: resourceFor('member', { ownerUserId: null }),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'insufficient_role' });
  });

  it('T-AUTHZ-10: 拒否理由の評価順が no_rule → inactive_user → revoked_session → scope → role 系', () => {
    // 全部同時に壊した主体を作り、直す順に理由が入れ替わることで順序を示す
    const broken = principalFor('member', { status: 'inactive', credential: 'access_token', scope: [] });
    const resource = resourceFor('member');

    expect(decide({ action: 'unknown.action', principal: broken, resource, sessionRevoked: true })).toEqual({
      allowed: false,
      reason: 'no_rule',
    });
    expect(decide({ action: 'publish.write', principal: broken, resource, sessionRevoked: true })).toEqual({
      allowed: false,
      reason: 'inactive_user',
    });
    expect(
      decide({ action: 'publish.write', principal: { ...broken, status: 'active' }, resource, sessionRevoked: true }),
    ).toEqual({ allowed: false, reason: 'revoked_session' });
    expect(
      decide({ action: 'publish.write', principal: { ...broken, status: 'active' }, resource, sessionRevoked: false }),
    ).toEqual({ allowed: false, reason: 'missing_scope' });
    expect(
      decide({
        action: 'token.list.workspace',
        principal: { ...broken, status: 'active', credential: 'session', scope: null },
        resource: { ...resource, ownerUserId: null },
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'insufficient_role' });
  });
});

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

/** `EffectiveRole` の全順序が仕様どおりであることの表明 (判定の土台)。 */
describe('role の全順序', () => {
  it('member < owner < workspace-admin < provider-admin', () => {
    const order: readonly EffectiveRole[] = ['member', 'owner', 'workspace-admin', 'provider-admin'];
    for (let index = 1; index < order.length; index += 1) {
      const lower = order[index - 1] as EffectiveRole;
      const higher = order[index] as EffectiveRole;
      const resource = resourceFor('member', { ownerUserId: null });
      // 上位 role は下位 role が通る action を必ず通す (単調性の土台)
      for (const action of Object.keys(ACTION_RULES)) {
        const lowerAllowed = decide({
          action,
          principal: principalFor(lower === 'owner' ? 'owner' : (lower as MatrixColumn)),
          resource: lower === 'owner' ? resourceFor('owner') : resource,
          sessionRevoked: false,
        }).allowed;
        const higherAllowed = decide({
          action,
          principal: principalFor(higher === 'owner' ? 'owner' : (higher as MatrixColumn)),
          resource: higher === 'owner' ? resourceFor('owner') : resource,
          sessionRevoked: false,
        }).allowed;
        if (lowerAllowed) expect(higherAllowed, `${action}: ${lower} → ${higher}`).toBe(true);
      }
    }
  });
});
