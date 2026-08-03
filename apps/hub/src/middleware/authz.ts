// 認可判定の単一層。deny-by-default で Tenant/Workspace スコープを強制する (shared-layers §2 / qa-006 / D4)
// この層以外に認可判定を書かないこと。テナント固有 policy は feat-auth-tenancy が本層へ注入する。
import { resolveActiveWorkspaceId } from '../lib/auth/session.js';
import type { Principal } from '../shared/auth/index.js';
import { type RequestedScope, resolveRequestedScope } from './scope.js';

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
  // RFC 8628 device flow のうち、認証前に client が叩く 2 経路。
  // prefix を '/api/v1/device' にすると承認 (approve) まで公開になるため、末端まで書く
  '/api/v1/device/code',
  '/api/v1/device/token',
  // refresh token 自体が資格情報になる経路 (RFC 6749 §6)
  '/api/v1/token/refresh',
  // Next.js のビルド成果物・静的アセット
  '/_next',
  '/favicon.ico',
];

/** tenant slug を先に確定するサインイン画面。API 配下などへ広がらないよう 1 segment に限定する。 */
const TENANT_SIGNIN_PATH = /^\/[A-Za-z0-9][A-Za-z0-9_-]*\/signin$/;
/** Device Flow の入力画面だけを公開する。`/device/*` へ広げない。承認 API は認証必須のまま。 */
const DEVICE_APPROVAL_PATH = '/device';

export interface AuthzInput {
  readonly pathname: string;
  readonly headers: ReadonlyMap<string, string>;
  /** 認証できなかった場合は null。null をそのまま許可へ倒さないこと */
  readonly principal: Principal | null;
  /**
   * session (browser cookie) 由来の active workspace 解決を許すか。既定 true。
   * Bearer token (Device Flow access token 等の機械クライアント) は cookie を送らない前提であり、
   * `resolveActiveWorkspaceId` の「所属が1件なら cookie 無しでも自動確定する」規則を適用すると、
   * 明示ヘッダーで別 workspace を指定した要求が意図せず ambiguous_scope に落ちる。
   * 呼び出し元が Bearer token 経路と分かっている場合は false を渡すこと。
   */
  readonly allowSessionScope?: boolean;
}

export function isPublicPath(pathname: string): boolean {
  const normalized = normalize(pathname);
  return (
    normalized === DEVICE_APPROVAL_PATH ||
    TENANT_SIGNIN_PATH.test(normalized) ||
    PUBLIC_PATH_PREFIXES.some((prefix) =>
      prefix === '/' ? normalized === '/' : normalized === prefix || normalized.startsWith(`${prefix}/`),
    )
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

  const explicitResolution = resolveRequestedScope(input.pathname, input.headers);
  if (!explicitResolution.ok) {
    return { allowed: false, reason: 'ambiguous_scope', status: 403 };
  }

  // scope 入力の第2系統: session の active tenant/workspace (通常のブラウザ遷移向け)。
  // 明示ヘッダー系統 (API / 機械クライアント向け) とはここで初めて合流させ、
  // 判定順「public判定→認証→スコープ一意性→tenant一致→workspace所属」自体は変更しない。
  const sessionScope =
    input.allowSessionScope === false
      ? null
      : resolveSessionScope(input.principal, input.headers.get('cookie') ?? null);
  const merged = mergeScopes(explicitResolution.scope, sessionScope);
  if (merged === 'ambiguous_scope') {
    return { allowed: false, reason: 'ambiguous_scope', status: 403 };
  }
  const scope = merged;

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

/**
 * 明示ヘッダー系統と session 系統を合流させる。
 *
 * tenantId は比較しない: session 側の tenantId は常に principal 自身の tenantId (`resolveSessionScope`)
 * であり、explicit との不一致は独立した二重申告ではなく、この関数を呼んだ後段の
 * `scope.tenantId !== principal.tenantId` (tenant_mismatch) が既に正しく検出する。ここで先取りして
 * ambiguous_scope に倒すと、越境要求が本来の `tenant_mismatch` より粗い理由へすり替わる。
 * 独立した二重申告として意味を持つのは workspaceId (explicit ヘッダー由来 vs session の active workspace) だけ。
 */
function mergeScopes(explicit: RequestedScope, session: RequestedScope | null): RequestedScope | 'ambiguous_scope' {
  const hasExplicit = explicit.tenantId !== null || explicit.workspaceId !== null;
  if (!hasExplicit) {
    return session ?? explicit;
  }
  if (session === null) return explicit;
  if (explicit.workspaceId !== null && session.workspaceId !== null && explicit.workspaceId !== session.workspaceId) {
    return 'ambiguous_scope';
  }
  return { tenantId: explicit.tenantId ?? session.tenantId, workspaceId: explicit.workspaceId ?? session.workspaceId };
}

/**
 * session (ブラウザ通常遷移) 由来の要求スコープを解決する。
 * 明示ヘッダー系統とは独立した第2の入力系統だが、合流と認可判断はこのモジュールにだけ置く。
 * 所属を外れた active workspace は束縛しない (fail-closed)。
 */
function resolveSessionScope(principal: Principal, cookieHeader: string | null): RequestedScope | null {
  const workspaceId = resolveActiveWorkspaceId(cookieHeader, principal.workspaceIds);
  if (workspaceId === null) return null;

  return { tenantId: principal.tenantId, workspaceId };
}

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}
