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
    // 存在秘匿 (T-ISO-06): 403 だと「その ID の資源が他テナントに在る」ことが伝わるため 404。
    // route 層の denyStatusFor と同じ対応表であることは deny-status-layer-parity.test.ts が固定する。
    expect(decision).toMatchObject({ reason: 'tenant_mismatch', status: 404 });
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

  it('hearing share は token 本体と screenshot 本体の 2 形状だけを公開する', () => {
    const token = 'Abc_123-opaque-token-value-0123456789abcdef';
    // repository 層の ULID 生成器は composition-root の外から deep import できない
    // (`packages/db` は `@harness-hub/db` の barrel だけを公開面とする)。
    // 実際の newUlid() が生成する形 (26 文字 Crockford base32・先頭は 0-7) を固定 fixture で表す。
    const screenshotId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

    expect(isPublicPath(`/api/hearing/${token}`)).toBe(true);
    expect(isPublicPath(`/api/hearing/${token}/`)).toBe(true);
    expect(isPublicPath(`/api/hearing/${token}/screenshots/${screenshotId}`)).toBe(true);

    for (const pathname of [
      '/api/hearing',
      `/api/hearing/${token}/screenshots`,
      `/api/hearing/${token}/screenshots/${screenshotId}/metadata`,
      `/api/hearing/${token}/screenshots/550e8400-e29b-41d4-a716-446655440000`,
      `/api/hearing/${token}/admin`,
      `/api/hearing/${token}.html`,
      `/api/hearing/${token}/screenshots/id%2Fadmin`,
      `/api/hearing/${token.slice(1)}`,
      `/api/hearing/${token}/screenshots/shot-1`,
      `/api/hearing/${token}/screenshots/550e8400-e29b-11d4-a716-446655440000`,
    ]) {
      expect(isPublicPath(pathname)).toBe(false);
      expect(authorize({ pathname, headers: noHeaders, principal: null })).toMatchObject({
        allowed: false,
        reason: 'unauthenticated',
        status: 401,
      });
    }
  });

  it('テナント別サインイン画面だけを公開し、似た path は公開しない', () => {
    expect(isPublicPath('/tenant-a/signin')).toBe(true);
    expect(isPublicPath('/tenant-a/signin/')).toBe(true);
    expect(isPublicPath('/tenant-a/signin/callback')).toBe(false);
    expect(isPublicPath('/api/tenant-a/signin')).toBe(false);
    expect(isPublicPath('//signin')).toBe(false);
    // slug の形は tenantSlugSchema が正本。画面側 (safeParse) が 404 にする形を middleware だけ通さない
    expect(isPublicPath('/TENANT-A/signin')).toBe(false);
    expect(isPublicPath('/tenant_a/signin')).toBe(false);
  });

  it('サインイン入口 `/signin` は列挙した path だけを公開し、配下を巻き込まない', () => {
    expect(isPublicPath('/signin')).toBe(true);
    // active workspace の確定受け口は明示列挙 (route 自身が session を再検証する)
    expect(isPublicPath('/signin/workspace')).toBe(true);
    // 前方一致だと将来 `/signin/**` に生えた route が申告なしに公開へ倒れる
    expect(isPublicPath('/signin/callback')).toBe(false);
    expect(isPublicPath('/signin/workspace/confirm')).toBe(false);
  });

  it('Device Flow承認画面だけを公開し、承認APIや似たpathは公開しない', () => {
    expect(isPublicPath('/device')).toBe(true);
    expect(isPublicPath('/device/')).toBe(true);
    expect(isPublicPath('/device/approve')).toBe(false);
    expect(isPublicPath('/api/v1/device/approve')).toBe(false);
    expect(isPublicPath('/devices')).toBe(false);
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
