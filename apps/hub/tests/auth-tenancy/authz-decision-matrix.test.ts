/** T-AUTHZ-01〜10: action × role 表と拒否理由の純関数検証。 */

import type { PublisherTokenScope } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { decide, resolveEffectiveRole } from '../../src/lib/authz/decide.js';
import { ACTION_RULES } from '../../src/lib/authz/rules.js';
import type { AuthzPrincipal, AuthzResourceRef, EffectiveRole } from '../../src/lib/authz/types.js';
import { TENANT_A, TENANT_B, WORKSPACE_A1 } from './support/in-memory-ports.js';

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
  'coefficients.read': ADMIN_UP,
  'me.read': SELF_OR_ADMIN,
  'me.update': SELF_OR_ADMIN,
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
  'publish.cancel': OWNER_UP,
  'deployment.register': OWNER_UP,
  // 顧客持ち込み OIDC credential の管理面。テナント内の最上位である workspace-admin にも渡さない。
  // 自テナントの認証 credential を差し替えられる権限は、そのテナントへの全ログインを乗っ取れる位置にある
  // (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
  'idp.connection_read': PROVIDER_ONLY,
  'idp.connection_change': PROVIDER_ONLY,
  // feat-tenant-data-retention: 通常業務の入出力は member 以上、復元不可な削除だけ workspace-admin。
  'tenant-data.upload': MEMBER_UP,
  'tenant-data.list': MEMBER_UP,
  'tenant-data.read': MEMBER_UP,
  'tenant-data.read_content': MEMBER_UP,
  'tenant-data.delete': ADMIN_UP,
};

const COLUMNS: readonly MatrixColumn[] = ['member', 'owner', 'workspace-admin', 'provider-admin'];
const TOKEN_ONLY_ACTIONS = new Set([
  'aijob.pull',
  'aijob.complete',
  'aijob.fail',
  'metrics.ingest',
  'deployment.register',
]);

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

  it('T-AUTHZ-08 補2: publish の作成・書込・取消は session/Bearer で同じ owner 境界を使う', () => {
    const resource = resourceFor('owner');
    for (const action of ['publish.request', 'publish.write', 'publish.cancel'] as const) {
      expect(
        decide({
          action,
          principal: principalFor('owner', { credential: 'session', scope: null }),
          resource,
          sessionRevoked: false,
        }).allowed,
        `${action} × session owner`,
      ).toBe(true);
      expect(
        decide({
          action,
          principal: principalFor('owner', { credential: 'access_token', scope: ['publish:write'] }),
          resource,
          sessionRevoked: false,
        }).allowed,
        `${action} × token owner`,
      ).toBe(true);
      expect(
        decide({
          action,
          principal: principalFor('member', { credential: 'access_token', scope: ['publish:write'] }),
          resource: resourceFor('member'),
          sessionRevoked: false,
        }).allowed,
        `${action} × non-owner`,
      ).toBe(false);
    }
  });

  it('T-AUTHZ-08 補3: 資格情報種別が違う action は credential_not_allowed', () => {
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

// ---------------------------------------------------------------------------
