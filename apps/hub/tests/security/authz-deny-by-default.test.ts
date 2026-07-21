// HF-QA-TENANT-001: 認可 middleware が未認証・越境スコープを deny-by-default で拒否することを検証する
import { describe, expect, it } from 'vitest';
import { authorize, isPublicPath, PUBLIC_PATH_PREFIXES } from '../../src/middleware/authz.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../src/middleware/scope.js';
import { createAuthAdapter, denyAllAuthProvider, type Principal } from '../../src/shared/auth/index.js';

const principal: Principal = {
  subject: 'user-1',
  tenantId: 'tenant-a',
  workspaceIds: ['ws-1', 'ws-2'],
  roles: ['member'],
};

const noHeaders = new Map<string, string>();

function headers(entries: Record<string, string>): ReadonlyMap<string, string> {
  return new Map(Object.entries(entries));
}

describe('認可 middleware の deny-by-default', () => {
  it('未認証の要求を 401 で拒否する', () => {
    const decision = authorize({ pathname: '/t/tenant-a/w/ws-1/docs', headers: noHeaders, principal: null });
    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: 'unauthenticated', status: 401 });
  });

  it('allowlist に無い path はテナントスコープ未申告なら拒否する', () => {
    const decision = authorize({ pathname: '/api/documents', headers: noHeaders, principal });
    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: 'missing_tenant_scope', status: 403 });
  });

  it('他テナントのスコープ要求を拒否する', () => {
    const decision = authorize({ pathname: '/t/tenant-b/docs', headers: noHeaders, principal });
    expect(decision).toMatchObject({ reason: 'tenant_mismatch', status: 403 });
  });

  it('自テナントでも所属していない Workspace を拒否する', () => {
    const decision = authorize({ pathname: '/t/tenant-a/w/ws-9/docs', headers: noHeaders, principal });
    expect(decision).toMatchObject({ reason: 'workspace_not_member', status: 403 });
  });

  it('path と header のスコープが食い違う場合は推測せず拒否する', () => {
    const decision = authorize({
      pathname: '/t/tenant-a/docs',
      headers: headers({ [TENANT_HEADER]: 'tenant-b' }),
      principal,
    });
    expect(decision).toMatchObject({ reason: 'ambiguous_scope', status: 403 });
  });

  it('自テナント・所属 Workspace の要求のみ許可する', () => {
    const viaPath = authorize({ pathname: '/t/tenant-a/w/ws-1/docs', headers: noHeaders, principal });
    expect(viaPath).toMatchObject({ allowed: true, scope: { tenantId: 'tenant-a', workspaceId: 'ws-1' } });

    const viaHeader = authorize({
      pathname: '/api/documents',
      headers: headers({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-2' }),
      principal,
    });
    expect(viaHeader).toMatchObject({ allowed: true });
  });

  it('未知の path を許可側へ落とさない (網羅されない分岐が無いこと)', () => {
    const paths = ['/api/anything', '/studio', '/t//docs', '/health-check', '/healthz'];
    for (const pathname of paths) {
      expect(authorize({ pathname, headers: noHeaders, principal: null }).allowed).toBe(false);
    }
  });

  it('公開 path は明示 allowlist のみ (前方一致で配下を巻き込まない)', () => {
    expect(PUBLIC_PATH_PREFIXES).toContain('/health');
    expect(isPublicPath('/health')).toBe(true);
    expect(isPublicPath('/')).toBe(true);
    // '/' の前方一致で全 path が公開になっていないこと
    expect(isPublicPath('/studio')).toBe(false);
    // '/health' に似ているだけの path は公開ではない
    expect(isPublicPath('/healthz')).toBe(false);
  });

  it('auth provider 未注入のとき全要求が未認証になる (fail-closed)', async () => {
    const adapter = createAuthAdapter();
    expect(adapter.providerName).toBe(denyAllAuthProvider.name);

    const resolved = await adapter.resolvePrincipal({ headers: noHeaders, url: 'https://hub.example/api/x' });
    expect(resolved).toBeNull();
  });

  it('provider が壊れた Principal を返しても認可へ通さない', async () => {
    const adapter = createAuthAdapter({
      name: 'broken',
      authenticate: async () => ({ subject: '', tenantId: '', workspaceIds: [], roles: [] }),
    });
    expect(await adapter.resolvePrincipal({ headers: noHeaders, url: 'https://hub.example/api/x' })).toBeNull();
  });
});
