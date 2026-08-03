// spec: harness-hub-post-signin-workspace-scope-addendum §A/D (AC3-AC7)
// 既存の path/header 明示スコープに対する deny-by-default は authz-deny-by-default.test.ts が持つ。
// ここでは session (cookie) 由来の暗黙スコープ補完 (通常のブラウザ操作向け) だけを検証する。
import { describe, expect, it } from 'vitest';
import { ACTIVE_WORKSPACE_COOKIE_NAME } from '../../src/lib/auth/session.js';
import { authorize } from '../../src/middleware/authz.js';
import { TENANT_HEADER } from '../../src/middleware/scope.js';
import type { Principal } from '../../src/shared/auth/index.js';

const principal: Principal = {
  subject: 'user-1',
  tenantId: 'tenant-a',
  workspaceIds: ['ws-1', 'ws-2'],
  roles: ['member'],
};

function headers(entries: Record<string, string> = {}): ReadonlyMap<string, string> {
  return new Map(Object.entries(entries));
}

describe('authorize の session scope 補完', () => {
  it('AC3/AC4: 明示スコープが無いブラウザ操作 (cookie あり) は session の tenant で通す', () => {
    const decision = authorize({ pathname: '/sheets', headers: headers({ cookie: 'session=x' }), principal });
    expect(decision).toMatchObject({ allowed: true, scope: { tenantId: 'tenant-a', workspaceId: null } });
  });

  it('AC7: cookie の active workspace が principal 所属内なら scope に反映する', () => {
    const decision = authorize({
      pathname: '/sheets',
      headers: headers({ cookie: `session=x; ${ACTIVE_WORKSPACE_COOKIE_NAME}=ws-2` }),
      principal,
    });
    expect(decision).toMatchObject({ allowed: true, scope: { tenantId: 'tenant-a', workspaceId: 'ws-2' } });
  });

  it('AC7: cookie の active workspace が principal 未所属なら採用せず workspaceId は null のまま', () => {
    const decision = authorize({
      pathname: '/sheets',
      headers: headers({ cookie: `session=x; ${ACTIVE_WORKSPACE_COOKIE_NAME}=ws-9` }),
      principal,
    });
    expect(decision).toMatchObject({ allowed: true, scope: { tenantId: 'tenant-a', workspaceId: null } });
  });

  it('AC5: 明示 header と session scope が不一致なら ambiguous_scope で拒否する', () => {
    const decision = authorize({
      pathname: '/sheets',
      headers: headers({ cookie: 'session=x', [TENANT_HEADER]: 'tenant-b' }),
      principal,
    });
    expect(decision).toMatchObject({ reason: 'ambiguous_scope', status: 403 });
  });

  it('path 由来の明示 tenant は session と食い違っても ambiguous にせず tenant_mismatch で拒否する', () => {
    const decision = authorize({
      pathname: '/t/tenant-b/docs',
      headers: headers({ cookie: 'session=x' }),
      principal,
    });
    expect(decision).toMatchObject({ reason: 'tenant_mismatch', status: 403 });
  });

  it('AC6: /api/ 配下は cookie があっても session を補わず missing_tenant_scope のままにする (deny-by-default非退行)', () => {
    const decision = authorize({ pathname: '/api/documents', headers: headers({ cookie: 'session=x' }), principal });
    expect(decision).toMatchObject({ reason: 'missing_tenant_scope', status: 403 });
  });

  it('authorization header を伴う要求 (Bearer/API クライアント) には session を補わない', () => {
    const decision = authorize({
      pathname: '/sheets',
      headers: headers({ cookie: 'session=x', authorization: 'Bearer abc' }),
      principal,
    });
    expect(decision).toMatchObject({ reason: 'missing_tenant_scope', status: 403 });
  });

  it('cookie が無い要求には session を補わない', () => {
    const decision = authorize({ pathname: '/sheets', headers: headers(), principal });
    expect(decision).toMatchObject({ reason: 'missing_tenant_scope', status: 403 });
  });
});
