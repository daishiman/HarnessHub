// 認可判定の単一層。deny-by-default で Tenant/Workspace スコープを強制する (shared-layers §2 / qa-006 / D4)
// この層以外に認可判定を書かないこと。テナント固有 policy は feat-auth-tenancy が本層へ注入する。
import { resolveActiveWorkspace } from '../lib/auth/session.js';
import type { Principal } from '../shared/auth/index.js';
import { type RequestedScope, resolveRequestedScope, scopeFromPath } from './scope.js';

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
 *
 * スコープの申告経路は 3 系統ある: (a) path (`/t/{id}/w/{id}`)、(b) `x-harness-*` header、
 * (c) 認証済み session から導く暗黙スコープ (通常のブラウザ操作向け)。
 * path は URL 上に明示された最も強い申告なので、path にある field は他と食い違っても
 * (page/header 間の食い違いは既存どおり ambiguous) session の意見を聞かず path 優先で確定する。
 * path に無い field だけ、header と session を同列の申告として突き合わせる
 * (両方あって食い違えば ambiguous、session だけなら補完として採用)。
 * 通常のブラウザ遷移は path/header のどちらにもスコープを含まないため、(c) が無いと
 * 業務画面が missing_tenant_scope で弾かれてしまう。
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

  const pathScope = scopeFromPath(input.pathname);
  const sessionScope = resolveSessionScope(input);
  const tenantId = mergeWithSessionScope(pathScope.tenantId, resolution.scope.tenantId, sessionScope.tenantId);
  const workspaceId = mergeWithSessionScope(
    pathScope.workspaceId,
    resolution.scope.workspaceId,
    sessionScope.workspaceId,
  );
  if (tenantId === SCOPE_CONFLICT || workspaceId === SCOPE_CONFLICT) {
    return { allowed: false, reason: 'ambiguous_scope', status: 403 };
  }

  // 非 public な要求は必ずテナントスコープを申告させる。
  // 申告なしを「自テナント扱い」にすると、スコープ漏れの API が黙って通ってしまう。
  if (tenantId === null) {
    return { allowed: false, reason: 'missing_tenant_scope', status: 403 };
  }

  if (tenantId !== input.principal.tenantId) {
    return { allowed: false, reason: 'tenant_mismatch', status: 403 };
  }

  if (workspaceId !== null && !input.principal.workspaceIds.includes(workspaceId)) {
    return { allowed: false, reason: 'workspace_not_member', status: 403 };
  }

  return { allowed: true, scope: { tenantId, workspaceId } };
}

/** `/api/` 配下は機械クライアント向けの明示申告必須 API とみなし、session 補完の対象にしない。 */
const API_PATH_PREFIX = '/api/';

/**
 * session (cookie) 由来の暗黙スコープ。以下はいずれも「機械クライアントの明示申告必須」を
 * 保つため何も補わない: `cookie` header が無い要求 (session を提示していない)、
 * `authorization` header を伴う要求 (Bearer/API クライアント)、`/api/` 配下への要求
 * (画面ではなく API 呼び出しなので、cookie を持っていても暗黙適用しない)。
 */
function resolveSessionScope(input: AuthzInput): RequestedScope {
  if (
    input.principal === null ||
    input.headers.has('authorization') ||
    !input.headers.has('cookie') ||
    input.pathname.startsWith(API_PATH_PREFIX)
  ) {
    return { tenantId: null, workspaceId: null };
  }
  return {
    tenantId: input.principal.tenantId,
    workspaceId: resolveActiveWorkspace(input.headers.get('cookie') ?? null, input.principal.workspaceIds),
  };
}

const SCOPE_CONFLICT = Symbol('scope_conflict');

/**
 * path 由来の値があれば (path/header 間は `resolveRequestedScope` 側で既に整合済みなので) それを
 * そのまま採用し、session とは突き合わせない。path に無い field だけ、header 由来の値
 * (`merged` はここでは header 由来と同義) と session を同列に突き合わせる。
 */
function mergeWithSessionScope(
  pathValue: string | null,
  merged: string | null,
  session: string | null,
): string | null | typeof SCOPE_CONFLICT {
  if (pathValue !== null) return merged;
  if (merged !== null && session !== null && merged !== session) return SCOPE_CONFLICT;
  return merged ?? session;
}

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}
