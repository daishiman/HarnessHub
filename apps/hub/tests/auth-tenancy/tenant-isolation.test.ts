/**
 * T-ISO-01 〜 T-ISO-07 (QC-5 / AC-1)。**越境成功が 0 件**であることが acceptance の判定条件。
 *
 * ここは判定関数だけでなく `withAuthz` (route の唯一の入口) を通した経路でも確かめる。
 * 判定が正しくても入口が呼んでいなければ分離は成立しないため。
 */

import { describe, expect, it } from 'vitest';

import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config.js';
import { createDeviceFlowService } from '../../src/lib/auth/device-flow/service.js';
import { buildSessionClaims, signSessionToken } from '../../src/lib/auth/index.js';
import { decide } from '../../src/lib/authz/decide.js';
import type { AuthzPrincipal, AuthzResourceRef, BaseRole } from '../../src/lib/authz/types.js';
import { type AuthzRuntimeDeps, denyStatusFor, withAuthz } from '../../src/lib/authz/with-authz.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  directoryUser,
  TENANT_A,
  TENANT_B,
  type TestPorts,
  WORKSPACE_A1,
  WORKSPACE_A2,
  WORKSPACE_B1,
} from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const USER_A = 'user-a';
const USER_B = 'user-b';

function principal(overrides: Partial<AuthzPrincipal> = {}): AuthzPrincipal {
  return {
    userId: USER_A,
    tenantId: TENANT_A,
    role: 'member',
    status: 'active',
    issuedAtSeconds: NOW,
    workspaceIds: [WORKSPACE_A1],
    scope: null,
    credential: 'session',
    ...overrides,
  };
}

function resource(overrides: Partial<AuthzResourceRef> = {}): AuthzResourceRef {
  return {
    type: 'token',
    id: 'token-1',
    tenantId: TENANT_A,
    workspaceId: WORKSPACE_A1,
    ownerUserId: USER_A,
    ...overrides,
  };
}

describe('T-ISO-01/03/05: 越境の拒否 (QC-5 / AC-1)', () => {
  it('T-ISO-01: tenant A の principal が tenant B の資源へ向かうと tenant_mismatch', () => {
    expect(
      decide({
        action: 'token.list.self',
        principal: principal(),
        resource: resource({ tenantId: TENANT_B, workspaceId: WORKSPACE_B1 }),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'tenant_mismatch' });
  });

  it('T-ISO-03: 同一テナント内でも所属外 Workspace は拒否', () => {
    expect(
      decide({
        action: 'token.list.self',
        principal: principal(),
        resource: resource({ workspaceId: WORKSPACE_A2 }),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'workspace_not_member' });
  });

  it('T-ISO-05: provider-admin 以外は全 role で越境できない', () => {
    const roles: readonly BaseRole[] = ['member', 'workspace-admin'];
    for (const role of roles) {
      for (const action of ['device.approve', 'token.list.self', 'token.list.workspace', 'token.revoke']) {
        const outcome = decide({
          action,
          principal: principal({ role, workspaceIds: [WORKSPACE_A1, WORKSPACE_B1] }),
          resource: resource({ tenantId: TENANT_B, workspaceId: WORKSPACE_B1 }),
          sessionRevoked: false,
        });
        // Workspace 所属を偽装しても、テナント検査が先に落ちる
        expect(outcome, `${role} × ${action}`).toEqual({ allowed: false, reason: 'tenant_mismatch' });
      }
    }
  });

  it('T-ISO-05 補: owner 合成でも越境は成立しない', () => {
    expect(
      decide({
        action: 'token.revoke',
        principal: principal(),
        // 所有者が自分でも、テナントが違えば owner に合成される前に落ちる
        resource: resource({ tenantId: TENANT_B, workspaceId: null, ownerUserId: USER_A }),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'tenant_mismatch' });
  });
});

describe('T-ISO-04: provider-admin の越境 (security-spec §3.1.3)', () => {
  function crossTenantHarness() {
    const ports = createTestPorts({
      users: [directoryUser({ id: USER_A, tenantId: TENANT_A, role: 'provider-admin' })],
    });
    ports.clock.set(NOW);
    const sink = createInMemoryAuditSink();
    const deps: AuthzRuntimeDeps = {
      ports,
      audit: createAuditLogger({ sink, now: () => new Date(NOW * 1000), newId: createSequentialIds('audit') }),
      revocation: { isRevoked: async () => false },
      sessionSecret: 'session-secret',
      accessTokenSecret: 'access-secret',
      allowedOrigins: ['https://hub.example.com'],
    };
    return { ports, sink, deps };
  }

  async function sessionRequest(role: BaseRole, workspaceIds: readonly string[] = [WORKSPACE_A1]): Promise<Request> {
    const claims = buildSessionClaims(directoryUser({ id: USER_A, tenantId: TENANT_A, role, workspaceIds }), NOW);
    const token = await signSessionToken(claims, 'session-secret');
    return new Request('https://hub.example.com/api/v1/tokens', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
  }

  it('T-ISO-04: provider-admin の越境は許可され、監査 provider.cross_tenant_access が 1 件残る', async () => {
    const { sink, deps } = crossTenantHarness();

    const route = withAuthz(
      {
        action: 'token.list.workspace',
        deps,
        resolveResource: async () => ({
          type: 'token',
          id: null,
          tenantId: TENANT_B,
          workspaceId: WORKSPACE_B1,
          ownerUserId: null,
        }),
      },
      async (_request, authz) => Response.json({ role: authz.effectiveRole }),
    );

    const response = await route(await sessionRequest('provider-admin'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ role: 'provider-admin' });

    const events = sink.events();
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe('provider.cross_tenant_access');
    expect(events[0]?.tenantId).toBe(TENANT_B);
    expect(events[0]?.metadata).toMatchObject({
      actor_tenant_id: TENANT_A,
      requested_tenant_id: TENANT_B,
      allowed: true,
    });
  });

  it('T-ISO-04 補: provider-admin は Workspace 所属も問われない (テナントの外側に立つ主体)', () => {
    expect(
      decide({
        action: 'token.list.workspace',
        principal: principal({ role: 'provider-admin', workspaceIds: [] }),
        resource: resource({ tenantId: TENANT_B, workspaceId: WORKSPACE_B1, ownerUserId: null }),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: true, effectiveRole: 'provider-admin' });
  });

  it('T-ISO-04 補: provider-admin でも失効済み session なら越境できない', () => {
    expect(
      decide({
        action: 'token.list.workspace',
        principal: principal({ role: 'provider-admin' }),
        resource: resource({ tenantId: TENANT_B, workspaceId: null, ownerUserId: null }),
        sessionRevoked: true,
      }),
    ).toEqual({ allowed: false, reason: 'revoked_session' });
  });
});

describe('T-ISO-06: 存在秘匿 (404) と権限不足 (403) の区別', () => {
  it('他テナントの資源は 404、同一テナント内の権限不足は 403', () => {
    // 403 を返すと「他テナントにその ID の資源が在る」ことが伝わってしまう
    expect(denyStatusFor('tenant_mismatch')).toBe(404);
    expect(denyStatusFor('insufficient_role')).toBe(403);
    expect(denyStatusFor('not_owner')).toBe(403);
    expect(denyStatusFor('workspace_not_member')).toBe(403);
    expect(denyStatusFor('unauthenticated')).toBe(401);
    expect(denyStatusFor('unresolved_resource')).toBe(400);
  });
});

describe('T-ISO-02/07: 行レベルのスコープ分離 (D4)', () => {
  function tenantHarness(tenantId: string, userId: string, workspaceId: string) {
    const ports = createTestPorts({ users: [directoryUser({ id: userId, tenantId, workspaceIds: [workspaceId] })] });
    ports.clock.set(NOW);
    const sink = createInMemoryAuditSink();
    const service = createDeviceFlowService({
      ports,
      audit: createAuditLogger({ sink, now: () => new Date(NOW * 1000), newId: createSequentialIds('audit') }),
      accessTokenSecret: 'access-secret',
      verificationUri: 'https://hub.example.com/device',
      newId: createSequentialIds(`rec-${tenantId}`),
    });
    return { ports, service };
  }

  /** 1 つの store を 2 テナントで共有する。**同居していても混ざらない**ことが検査の主眼。 */
  function sharedHarness() {
    const ports: TestPorts = createTestPorts({
      users: [
        directoryUser({ id: USER_A, tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1] }),
        directoryUser({ id: USER_B, tenantId: TENANT_B, workspaceIds: [WORKSPACE_B1] }),
      ],
    });
    ports.clock.set(NOW);
    const sink = createInMemoryAuditSink();
    const service = createDeviceFlowService({
      ports,
      audit: createAuditLogger({ sink, now: () => new Date(NOW * 1000), newId: createSequentialIds('audit') }),
      accessTokenSecret: 'access-secret',
      verificationUri: 'https://hub.example.com/device',
      newId: createSequentialIds('rec'),
    });
    return { ports, service };
  }

  it('T-ISO-02: 2 テナント同時稼働で A の一覧に B の行が 1 件も混ざらない', async () => {
    const { ports, service } = sharedHarness();

    for (const [tenantId, userId, workspaceId] of [
      [TENANT_A, USER_A, WORKSPACE_A1],
      [TENANT_B, USER_B, WORKSPACE_B1],
    ] as const) {
      const issued = await service.requestCode({ tenantId, scope: ['publish:write'], deviceLabel: `${tenantId}-cli` });
      await service.approve({ tenantId, userCode: issued.user_code, userId, workspaceId });
      const exchanged = await service.exchangeToken({ tenantId, deviceCode: issued.device_code });
      if (!exchanged.ok) throw new Error(`前提: ${tenantId} の交換は成功するはず`);
    }

    expect(ports.publisherTokens.all()).toHaveLength(2);

    const listA = await service.listTokensForUser({ tenantId: TENANT_A, userId: USER_A });
    const listB = await service.listTokensForUser({ tenantId: TENANT_B, userId: USER_B });
    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(1);
    expect(listA[0]?.device_label).toBe(`${TENANT_A}-cli`);
    expect(listA.filter((item) => item.workspace_id === WORKSPACE_B1)).toHaveLength(0);

    // Workspace 一覧も同じ (テナントを跨いだ Workspace 名の衝突があっても混ざらない)
    expect(await service.listTokensForWorkspace({ tenantId: TENANT_A, workspaceId: WORKSPACE_B1 })).toHaveLength(0);

    // 相手の user_id を指定しても 0 件。tenant_id が全問い合わせのスコープになっている
    expect(await service.listTokensForUser({ tenantId: TENANT_A, userId: USER_B })).toHaveLength(0);
  });

  it('T-ISO-07: device_code をテナントを跨いで流用できない', async () => {
    const { service } = sharedHarness();
    const issued = await service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    // 正しい device_code でもテナントが違えば引けない
    expect(await service.exchangeToken({ tenantId: TENANT_B, deviceCode: issued.device_code })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });

    expect(
      await service.approve({
        tenantId: TENANT_B,
        userCode: issued.user_code,
        userId: USER_B,
        workspaceId: WORKSPACE_B1,
      }),
    ).toEqual({ ok: false, reason: 'not_found' });
  });

  it('T-ISO-07: refresh token をテナントを跨いで流用できない', async () => {
    const { service } = sharedHarness();
    const issued = await service.requestCode({ tenantId: TENANT_A, scope: ['publish:write'], deviceLabel: null });
    await service.approve({
      tenantId: TENANT_A,
      userCode: issued.user_code,
      userId: USER_A,
      workspaceId: WORKSPACE_A1,
    });
    const exchanged = await service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!exchanged.ok) throw new Error('前提: 交換は成功するはず');

    expect(await service.refresh({ tenantId: TENANT_B, refreshToken: exchanged.value.refresh_token })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });

    // 流用に失敗しても本来のテナントでは生きている (巻き添え失効させない)
    expect(await service.refresh({ tenantId: TENANT_A, refreshToken: exchanged.value.refresh_token })).toMatchObject({
      ok: true,
    });
  });

  it('T-ISO-02 補: テナントごとに store を分けた場合も同じ結果になる (分離が実装の都合に依らない)', async () => {
    const a = tenantHarness(TENANT_A, USER_A, WORKSPACE_A1);
    const b = tenantHarness(TENANT_B, USER_B, WORKSPACE_B1);

    const issuedA = await a.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: 'a-cli' });
    await b.service.requestCode({ tenantId: TENANT_B, scope: [], deviceLabel: 'b-cli' });

    expect(await b.service.exchangeToken({ tenantId: TENANT_B, deviceCode: issuedA.device_code })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });
    expect(a.ports.deviceAuthorizations.all()).toHaveLength(1);
    expect(b.ports.deviceAuthorizations.all()).toHaveLength(1);
  });
});
