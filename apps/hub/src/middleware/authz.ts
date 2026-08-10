// 認可判定の単一層。deny-by-default で Tenant/Workspace スコープを強制する (shared-layers §2 / qa-006 / D4)
// この層以外に認可判定を書かないこと。テナント固有 policy は feat-auth-tenancy が本層へ注入する。
import { tenantSlugSchema } from '@harness-hub/schemas';

import { resolveActiveWorkspaceId } from '../lib/auth/session.js';
// `lib/authz/index.js` (barrel) 経由にしないこと。barrel は runtime.ts → Drizzle を引き込み、
// edge runtime で動く本層が壊れる。越境述語だけを持つ純関数モジュールを直接指す。
import { canCrossTenantBoundary, isCrossTenantAuditedPath } from '../lib/authz/cross-tenant.js';
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
  // 404 は `tenant_mismatch` の存在秘匿専用 (T-ISO-06)。route 層の `denyStatusFor` と同じ対応表を
  // 使う必要があるため、片側だけ status を足すと本層が先に応答する経路で契約が崩れる。
  | { readonly allowed: false; readonly reason: DenyReason; readonly status: 401 | 403 | 404 };

/**
 * 認証不要で到達できる path のうち、**その path 自身だけ**を公開するもの (完全一致)。
 * 配下 (`{path}/**`) は公開にならないため、後から子 route が生えても自動的に公開へ倒れない。
 * 「入口 1 枚だけを開ける」意図の path は前方一致側ではなくこちらへ足すこと。
 */
export const PUBLIC_EXACT_PATHS: readonly string[] = [
  // 未認証ランディング (P0 シェル)。業務データを一切含めない
  '/',
  // ランディングのテナント入力を `/{tenant_slug}/signin` へ振り分ける受け口。
  // 認証前にしか通らない経路であり、業務データを一切読まない (query の slug を検証して 303 を返すだけ)。
  // 前方一致にすると `/signin/**` が将来まとめて公開になるため、この 1 枚に限定する
  '/signin',
  // 所属 workspace が複数の利用者が active workspace を確定させる受け口 (確定前は scope が無く
  // 認可を通せないため公開が必要)。`/signin` の前方一致に頼らず、`/api/v1/device` と同じく末端まで書く。
  // route 自身が session cookie の署名・期限・status と所属一覧を再検証する (fail-closed)
  '/signin/workspace',
  // Device Flow の入力画面だけを公開する。`/device/*` へ広げない。承認 API は認証必須のまま
  '/device',
];

/**
 * 認証不要で到達できる path の**明示**allowlist (前方一致)。
 * ここと `PUBLIC_EXACT_PATHS` に列挙されていない path は全て認証必須 ＝ deny-by-default。
 * 前方一致で判定するため、新規追加時は意図しない配下を巻き込まないか確認すること。
 * 配下まで開ける意図が無いなら `PUBLIC_EXACT_PATHS` を使う。
 */
export const PUBLIC_PATH_PREFIXES: readonly string[] = [
  // 外形監視 (Better Stack) が認証なしで叩く。ADR §7
  '/health',
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
  // 利用規約・プライバシーポリシー (静的・PII 非参照)。全利用者 (未ログイン含む) に公開する (AD-2, feat-user-org-admin)
  '/legal',
];

/** tenant slug を先に確定するサインイン画面。API 配下などへ広がらないよう 1 segment に限定する。 */
const TENANT_SIGNIN_PATH = /^\/([^/]+)\/signin$/;

/**
 * `/{tenant_slug}/signin` かどうか。slug の「形」は `tenantSlugSchema` を唯一の正本とする。
 * ここで独自の文字集合を書くと、middleware は public と判定するのに画面側の `safeParse` は 404 にする、
 * という入口ごとの挙動差が生まれる (実際 `/ACME/signin` が middleware だけ通っていた)。
 */
function isTenantSigninPath(pathname: string): boolean {
  const slug = TENANT_SIGNIN_PATH.exec(pathname)?.[1];
  return slug !== undefined && tenantSlugSchema.safeParse(slug).success;
}

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
    PUBLIC_EXACT_PATHS.includes(normalized) ||
    isTenantSigninPath(normalized) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
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

  // テナント境界の外側に立つ主体 (provider-admin) だけは越境を通す (security-spec §3.1.3 /
  // FL-SEC8-102 / HarnessHub-stmx)。route 層 (`resolveEffectiveRole`) は越境を「禁止」ではなく
  // 「監査必須の許可」として扱うのに、本層が role を見ずに 404 で落としていたため、
  // `provider.cross_tenant_access` の監査行が本番で一度も出ていなかった。
  //
  // 通すのは `withAuthz` が必ず掛かる API 経路に限る。画面 (RSC) まで通すと監査の残らない越境が
  // 生まれ、遮断されている現状より悪くなる。判定語彙は `lib/authz/cross-tenant.ts` に閉じてあり、
  // ここは述語を呼ぶだけ (`scripts/check-single-authz-middleware.mjs` が検査する)。
  //
  // 「通す」= 最終判定の委譲であって許可ではない。越境しても route 層の `decide()` が
  // action 規則 (minRole / requiredScope / credential) で改めて落とす。
  const crossTenant = canCrossTenantBoundary(input.principal.roles) && isCrossTenantAuditedPath(input.pathname);

  // 存在秘匿 (T-ISO-06): 他テナントの資源は 404 で返す。403 だと「その ID の資源が他テナントに在る」
  // ことが応答から伝わってしまう。route 層の `denyStatusFor` は同じ理由で既に 404 を返していたが、
  // 本 middleware が先に応答するため route 側の 404 は到達不能で、本番だけ 403 になっていた
  // (route 単体テストは withAuthz を直接呼ぶので緑のまま素通りする)。対応表は両層で一致させる。
  if (!crossTenant && scope.tenantId !== input.principal.tenantId) {
    return { allowed: false, reason: 'tenant_mismatch', status: 404 };
  }

  // 越境主体は Workspace 所属も問わない。route 層の `resolveEffectiveRole` が
  // tenant 判定より手前で抜けており、ここで所属を要求すると再び両層が食い違う。
  if (!crossTenant && scope.workspaceId !== null && !input.principal.workspaceIds.includes(scope.workspaceId)) {
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
 *
 * export しているのは (dashboard) 配下の RSC 側 (`lib/routing/dashboard-scope.ts`) が
 * URL クエリ無しのログイン直後フォールバック用に同じ解決規則を再利用するため。
 * ここを直接呼ばずに独自実装すると、tenantId/workspaceId をペアで解決/ペアで諦める契約が崩れる。
 */
export function resolveSessionScope(principal: Principal, cookieHeader: string | null): RequestedScope | null {
  const workspaceId = resolveActiveWorkspaceId(cookieHeader, principal.workspaceIds);
  if (workspaceId === null) return null;

  return { tenantId: principal.tenantId, workspaceId };
}

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}
