/**
 * provider-admin の越境を、edge middleware と route 層で一致させる回帰検査 (HarnessHub-stmx)。
 *
 * 背景: route 層 (`resolveEffectiveRole` / `withAuthz`) は provider-admin の越境を
 * 「禁止」ではなく「監査必須の許可」として扱い、`provider.cross_tenant_access` を記録する契約
 * だった (FL-SEC8-102)。ところが手前の edge middleware `authorize()` が role を見ずに
 * `tenant_mismatch` / 404 で落としていたため、この監査は本番で一度も動いていなかった。
 * route 単体テストは `withAuthz` を直接呼ぶのでこの乖離を検出できず、
 * 本番 smoke の S8 (監査行 0 件) で初めて可視化された。
 *
 * `deny-status-layer-parity.test.ts` と同じ発想で、検査対象は「片方の層の値」ではなく
 * **両層の判断が一致すること**。したがって middleware の `authorize` と
 * route 層の `resolveEffectiveRole` を実際に両方通して突き合わせる。
 */
import { describe, expect, it } from 'vitest';
import { createTestPorts } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import { signJwt } from '../../lib/auth/index.js';
import type { AuthzPrincipal, AuthzResourceRef } from '../../lib/authz/index.js';
import { CROSS_TENANT_ROLE, resolveEffectiveRole } from '../../lib/authz/index.js';
import { type AuthzRuntimeDeps, withAuthz } from '../../lib/authz/with-authz.js';
import { authorize } from '../../middleware-contract.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../shared/audit/index.js';
import type { Principal } from '../../shared/auth/index.js';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const WORKSPACE_A1 = 'workspace-a1';
const WORKSPACE_B1 = 'workspace-b1';
const NOW = 1_800_000_000;

/** 越境の対象になる API 経路。`withAuthz` が掛かる = 監査が必ず残る経路の代表。 */
const CROSS_TENANT_API_PATH = '/api/v1/ai-jobs/pull';

/** edge 層の principal (`shared/auth`)。role は複数形・generic string で持つ境界型。 */
function edgePrincipal(role: string): Principal {
  return { subject: 'user-a', tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1], roles: [role] };
}

/** route 層の principal (`lib/authz`)。role は単数の `BaseRole`。 */
function routePrincipal(role: AuthzPrincipal['role']): AuthzPrincipal {
  return {
    userId: 'user-a',
    tenantId: TENANT_A,
    role,
    status: 'active',
    issuedAtSeconds: 0,
    workspaceIds: [WORKSPACE_A1],
    scope: ['aijob:process'],
    credential: 'access_token',
  };
}

/** 他テナントの資源。越境の対象。 */
const foreignResource: AuthzResourceRef = {
  type: 'ai_job_queue',
  id: null,
  tenantId: TENANT_B,
  workspaceId: WORKSPACE_B1,
  ownerUserId: null,
};

function headers(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

async function providerAdminBearerRequest(tenantId: string, workspaceId: string): Promise<Request> {
  const token = await signJwt(
    {
      typ: 'access',
      sub: 'user-a',
      tenant_id: TENANT_A,
      workspace_id: WORKSPACE_A1,
      token_id: 'provider-token-a',
      role: CROSS_TENANT_ROLE,
      scope: ['aijob:process'],
      iat: NOW,
      exp: NOW + 900,
    },
    'access-secret',
  );

  return new Request(`https://hub.example.com${CROSS_TENANT_API_PATH}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      origin: 'https://hub.example.com',
      'x-harness-tenant-id': tenantId,
      'x-harness-workspace-id': workspaceId,
    },
  });
}

function authzDeps(audit: ReturnType<typeof createInMemoryAuditSink>): AuthzRuntimeDeps {
  const ports = createTestPorts();
  ports.clock.set(NOW);
  return {
    ports,
    audit: createAuditLogger({ sink: audit, now: () => new Date(NOW * 1000), newId: () => 'audit-cross-1' }),
    revocation: { isRevoked: async () => false },
    sessionSecret: 'session-secret',
    accessTokenSecret: 'access-secret',
    allowedOrigins: ['https://hub.example.com'],
  };
}

describe('provider-admin 越境の層間一致 (middleware ↔ route)', () => {
  it('provider-admin の越境 API 要求は edge を通過し、route 層の判断と一致する', () => {
    const decision = authorize({
      pathname: CROSS_TENANT_API_PATH,
      headers: headers({ 'x-harness-tenant-id': TENANT_B, 'x-harness-workspace-id': WORKSPACE_B1 }),
      principal: edgePrincipal(CROSS_TENANT_ROLE),
      // Device Flow の access token 経路は session scope 解決を使わない (本番 smoke と同条件)
      allowSessionScope: false,
    });

    // edge が 404 で落とすと、route 層の provider.cross_tenant_access は永久に到達不能になる
    expect(decision.allowed).toBe(true);
    if (!decision.allowed) return;
    // 越境 scope をそのまま route 層へ渡す。自テナントへ書き換えて隠さない
    expect(decision.scope).toEqual({ tenantId: TENANT_B, workspaceId: WORKSPACE_B1 });

    // 両層が同じ結論であることを実値で突き合わせる (片側だけ直しても再発するため)
    const routeResolution = resolveEffectiveRole(routePrincipal(CROSS_TENANT_ROLE), foreignResource);
    expect(routeResolution.ok).toBe(true);
  });

  it('provider-admin 以外は従来どおり存在秘匿の 404 で、route 層も tenant_mismatch を返す', () => {
    const decision = authorize({
      pathname: CROSS_TENANT_API_PATH,
      headers: headers({ 'x-harness-tenant-id': TENANT_B }),
      principal: edgePrincipal('workspace-admin'),
      allowSessionScope: false,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('tenant_mismatch');
    expect(decision.status).toBe(404);

    const routeResolution = resolveEffectiveRole(routePrincipal('workspace-admin'), foreignResource);
    expect(routeResolution).toEqual({ ok: false, reason: 'tenant_mismatch' });
  });

  it('越境を通すのは withAuthz が掛かる API 経路だけ。画面 (RSC) 経路は 404 のまま', () => {
    // 画面は withAuthz を通らないため、通すと「監査の残らない越境」になる。
    // 遮断されている状態より悪くなるので、例外は API 経路に限る。
    const decision = authorize({
      pathname: '/catalog',
      headers: headers({ 'x-harness-tenant-id': TENANT_B }),
      principal: edgePrincipal(CROSS_TENANT_ROLE),
      allowSessionScope: false,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('tenant_mismatch');
    expect(decision.status).toBe(404);
  });

  it('provider-admin は越境先の Workspace 所属も問われない (route 層の判定順に揃える)', () => {
    // route 層の `resolveEffectiveRole` は tenant 判定より手前で provider-admin を抜けさせるので、
    // workspace 所属だけ edge で要求すると再び両層が食い違う。
    const decision = authorize({
      pathname: CROSS_TENANT_API_PATH,
      headers: headers({ 'x-harness-tenant-id': TENANT_B, 'x-harness-workspace-id': 'workspace-b-unknown' }),
      principal: edgePrincipal(CROSS_TENANT_ROLE),
      allowSessionScope: false,
    });

    expect(decision.allowed).toBe(true);

    const routeResolution = resolveEffectiveRole(routePrincipal(CROSS_TENANT_ROLE), {
      ...foreignResource,
      workspaceId: 'workspace-b-unknown',
    });
    expect(routeResolution.ok).toBe(true);
  });

  it('provider-admin は自テナント内でも Workspace 所属を問われない (外部管理主体の契約)', () => {
    // provider-admin は tenant の外側に立つ主体なので、自テナントと越境先で所属規則を切り替えない。
    // route 層も provider-admin を tenant / workspace 判定より手前で解決する。テスト名と期待値を
    // 「403」と書きながら許可を期待する矛盾へ戻さない。
    const decision = authorize({
      pathname: CROSS_TENANT_API_PATH,
      headers: headers({ 'x-harness-tenant-id': TENANT_A, 'x-harness-workspace-id': 'workspace-a2' }),
      principal: edgePrincipal(CROSS_TENANT_ROLE),
      allowSessionScope: false,
    });

    const routeResolution = resolveEffectiveRole(routePrincipal(CROSS_TENANT_ROLE), {
      ...foreignResource,
      tenantId: TENANT_A,
      workspaceId: 'workspace-a2',
    });

    expect(decision.allowed).toBe(true);
    expect(routeResolution.ok).toBe(true);
  });

  it('edge 通過後に withAuthz が越境を許可し、対象 tenant へ監査をちょうど 1 件残す', async () => {
    const edgeDecision = authorize({
      pathname: CROSS_TENANT_API_PATH,
      headers: headers({ 'x-harness-tenant-id': TENANT_B, 'x-harness-workspace-id': WORKSPACE_B1 }),
      principal: edgePrincipal(CROSS_TENANT_ROLE),
      allowSessionScope: false,
    });
    expect(edgeDecision.allowed).toBe(true);
    if (!edgeDecision.allowed) return;
    const targetScope = edgeDecision.scope;
    const targetTenantId = targetScope.tenantId;
    if (targetTenantId === null) throw new Error('前提: 非public APIのedge通過後はtenant scopeが確定する');

    const audit = createInMemoryAuditSink();
    let handlerCalls = 0;
    const route = withAuthz(
      {
        action: 'aijob.pull',
        deps: authzDeps(audit),
        // edge が受理した scope を route の資源解決へ渡す。途中で actor tenant へ戻すと
        // 越境監査が消えるため、tenant/workspace の実値も併せて固定する。
        resolveResource: async () => ({
          ...foreignResource,
          tenantId: targetTenantId,
          workspaceId: targetScope.workspaceId,
        }),
      },
      async (_request, authz) => {
        handlerCalls += 1;
        expect(authz.resource.tenantId).toBe(TENANT_B);
        expect(authz.resource.workspaceId).toBe(WORKSPACE_B1);
        return new Response(null, { status: 204 });
      },
    );

    const response = await route(await providerAdminBearerRequest(TENANT_B, WORKSPACE_B1));

    expect(response.status).toBe(204);
    expect(handlerCalls).toBe(1);
    expect(audit.events()).toHaveLength(1);
    expect(audit.events()[0]).toMatchObject({
      actorSubject: 'user-a',
      tenantId: TENANT_B,
      workspaceId: WORKSPACE_B1,
      action: 'provider.cross_tenant_access',
      resourceType: 'ai_job_queue',
      metadata: {
        actor_tenant_id: TENANT_A,
        requested_tenant_id: TENANT_B,
        requested_action: 'aijob.pull',
        allowed: true,
        credential: 'access_token',
      },
    });
  });

  it('provider-admin の自テナント要求は同じ経路を通るが越境監査を残さない', async () => {
    const edgeDecision = authorize({
      pathname: CROSS_TENANT_API_PATH,
      headers: headers({ 'x-harness-tenant-id': TENANT_A, 'x-harness-workspace-id': WORKSPACE_A1 }),
      principal: edgePrincipal(CROSS_TENANT_ROLE),
      allowSessionScope: false,
    });
    expect(edgeDecision.allowed).toBe(true);
    if (!edgeDecision.allowed) return;

    const audit = createInMemoryAuditSink();
    const route = withAuthz(
      {
        action: 'aijob.pull',
        deps: authzDeps(audit),
        resolveResource: async () => ({
          ...foreignResource,
          tenantId: TENANT_A,
          workspaceId: WORKSPACE_A1,
        }),
      },
      async () => new Response(null, { status: 204 }),
    );

    const response = await route(await providerAdminBearerRequest(TENANT_A, WORKSPACE_A1));

    expect(response.status).toBe(204);
    expect(audit.events()).toHaveLength(0);
  });
});
