// 認可判定の単一層。deny-by-default で Tenant/Workspace スコープを強制する (shared-layers §2 / qa-006 / D4)
// この層以外に認可判定を書かないこと。テナント固有 policy は feat-auth-tenancy が本層へ注入する。
import type { Principal } from '../shared/auth/index.js';
import { resolveRequestedScope, type RequestedScope } from './scope.js';

export type DenyReason =
  | 'unauthenticated'
  | 'missing_tenant_scope'
  | 'tenant_mismatch'
  | 'workspace_not_member'
  | 'ambiguous_scope';

export type AuthzDecision =
  | { readonly allowed: true; readonly scope: RequestedScope }
  | { readonly allowed: false; readonly reason: DenyReason; readonly status: 401 | 403 };

/**
 * 認証不要で到達できる path の**明示**allowlist。
 * ここに列挙されていない path は全て認証必須 ＝ deny-by-default。
 * 前方一致で判定するため、新規追加時は意図しない配下を巻き込まないか確認すること。
 */
export const PUBLIC_PATH_PREFIXES: readonly string[] = [
  // 外形監視 (Better Stack) が認証なしで叩く。ADR §7
  '/health',
  // 未認証ランディング (P0 シェル)。業務データを一切含めない
  '/',
  // サインイン経路。provider 実体は feat-auth-tenancy
  '/api/auth',
  // Next.js のビルド成果物・静的アセット
  '/_next',
  '/favicon.ico',
];

export interface AuthzInput {
  readonly pathname: string;
  readonly headers: ReadonlyMap<string, string>;
  /** 認証できなかった場合は null。null をそのまま許可へ倒さないこと */
  readonly principal: Principal | null;
}

export function isPublicPath(pathname: string): boolean {
  const normalized = normalize(pathname);
  return PUBLIC_PATH_PREFIXES.some((prefix) =>
    prefix === '/' ? normalized === '/' : normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/**
 * 認可判定の本体。
 * 判定順は「public 判定 → 認証 → スコープ一意性 → tenant 一致 → workspace 所属」。
 * どの分岐にも当たらない要求は許可側へ落ちない構造にしてある。
 */
export function authorize(input: AuthzInput): AuthzDecision {
  if (isPublicPath(input.pathname)) {
    return { allowed: true, scope: { tenantId: null, workspaceId: null } };
  }

  if (input.principal === null) {
    return { allowed: false, reason: 'unauthenticated', status: 401 };
  }

  const resolution = resolveRequestedScope(input.pathname, input.headers);
  if (!resolution.ok) {
    return { allowed: false, reason: 'ambiguous_scope', status: 403 };
  }
  const { scope } = resolution;

  // 非 public な要求は必ずテナントスコープを申告させる。
  // 申告なしを「自テナント扱い」にすると、スコープ漏れの API が黙って通ってしまう。
  if (scope.tenantId === null) {
    return { allowed: false, reason: 'missing_tenant_scope', status: 403 };
  }

  if (scope.tenantId !== input.principal.tenantId) {
    return { allowed: false, reason: 'tenant_mismatch', status: 403 };
  }

  if (scope.workspaceId !== null && !input.principal.workspaceIds.includes(scope.workspaceId)) {
    return { allowed: false, reason: 'workspace_not_member', status: 403 };
  }

  return { allowed: true, scope };
}

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}
