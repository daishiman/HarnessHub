/**
 * route handler の唯一の認可入口 (ADR AD-4 / SEC2)。
 *
 * `apps/hub/src/app/**\/route.ts` は必ずこの wrapper を通す。
 * 通っていない route は `scripts/ci/check-shared-layer-duplicates.mjs` が
 * `unwrapped-route-handler` として検出し、CI で落ちる (例外は登録簿へ明示的に列挙する)。
 *
 * edge middleware (`src/middleware/`) はスコープ門であり、ここは決定点。
 * 2 段構えなのは、edge が DB へ届かず緊急失効を見られないため。
 */

import type { AuditLogger } from '../../shared/audit/index.js';
import { isTrustedOrigin } from '../auth/config.js';
import { type CwvProbeConfig, isCwvProbeRequestAllowed } from '../auth/cwv-probe.js';
import type { AuthPorts } from '../auth/ports.js';
import { canCrossTenantBoundary } from './cross-tenant.js';
import { decide } from './decide.js';
import { resolveRequestPrincipal } from './principal.js';
import type { RevocationChecker } from './revocation.js';
import type { AuthzDenyReason, AuthzPrincipal, AuthzResourceRef, EffectiveRole } from './types.js';

/** wrapper 層で発生する拒否理由。判定 (`decide`) より手前で決まるものを含む。 */
export type WrapperDenyReason = AuthzDenyReason | 'unauthenticated' | 'untrusted_origin' | 'unresolved_resource';

export class AuthzError extends Error {
  readonly reason: WrapperDenyReason;
  readonly status: number;

  constructor(reason: WrapperDenyReason, status: number) {
    super(`authz denied: ${reason}`);
    this.name = 'AuthzError';
    this.reason = reason;
    this.status = status;
  }
}

/**
 * 拒否理由 → HTTP status。
 *
 * 意味の切り分け:
 *   401 = 名乗り直せば通る可能性がある (資格情報が無い/切れた)
 *   403 = 名乗り直しても通らない (権限が足りない)
 *   404 = 資源の存在自体を伏せる
 */
export function denyStatusFor(reason: WrapperDenyReason): 400 | 401 | 403 | 404 {
  // 失効した session/token は「資格情報が切れた」側。403 にすると client が再認証せず諦める
  // (RFC 6750 §3.1 の invalid_token も 401)。`inactive_user` は名乗り直しても通らないので 403 のまま
  if (reason === 'unauthenticated' || reason === 'revoked_session') return 401;
  if (reason === 'unresolved_resource') return 400;

  // `tenant_mismatch` は 404 で確定 (T-ISO-06 が期待値として固定している)。
  //   403 だと「他テナントに、その ID の資源が**存在する**」ことが応答から読み取れてしまう。
  //   資源 ID の総当たりで他テナントの在庫が推定できる状態は、それ自体が越境情報の漏洩にあたる。
  // 代償: 正当な利用者から「404 が出る」と問い合わせが来たとき、権限不足なのか本当に無いのかを
  // 応答だけでは切り分けられない。切り分けは監査ログ側 (`tenant_mismatch` の記録) で行う。
  if (reason === 'tenant_mismatch') return 404;

  return 403;
}

export interface AuthzRuntimeDeps {
  readonly ports: AuthPorts;
  readonly audit: AuditLogger;
  readonly revocation: RevocationChecker;
  readonly sessionSecret: string;
  readonly accessTokenSecret: string;
  readonly cwvProbe?: CwvProbeConfig | undefined;
  /** state-changing 要求で許可する Origin。空配列なら全ての state-changing 要求が落ちる。 */
  readonly allowedOrigins: readonly string[];
}

/** handler へ渡される認可済みコンテキスト。ここまで来た時点で判定は済んでいる。 */
export interface AuthzContext {
  readonly principal: AuthzPrincipal;
  readonly effectiveRole: EffectiveRole;
  readonly resource: AuthzResourceRef;
  /**
   * 同じ principal/resource に対する追加 capability の照会。
   * route 側で role 文字列を比較せず、認可規則表を単一正本のまま利用する。
   */
  readonly can: (action: string) => boolean;
}

export interface WithAuthzOptions<TParams> {
  readonly action: string;
  /**
   * 依存一式。**関数で渡すと解決が要求時まで遅れる**。
   * route は module 読み込み時に環境変数を触らせたくない (未設定で import すら失敗するのを避ける) ため
   * 関数形を使う。テストは値を直接渡す。
   */
  readonly deps: AuthzRuntimeDeps | (() => AuthzRuntimeDeps);
  /**
   * 要求から資源参照を作る。決められないときは null を返す (推測しない)。null は 400 になる。
   *
   * `principal` を渡すのは所有者判定 (自分の資源か) のためだけ。
   * **`resource.tenantId` を `principal.tenantId` から写さないこと** —
   * 写した瞬間に両者が常に一致し、越境検査 (`tenant_mismatch`) が到達不能になる。
   */
  readonly resolveResource: (
    request: Request,
    params: TParams,
    principal: AuthzPrincipal,
  ) => Promise<AuthzResourceRef | null>;
}

export type RouteContext<TParams> = { readonly params: Promise<TParams> };
/** 静的セグメントの route では Next.js が第 2 引数を渡さないため optional にしてある。 */
export type RouteHandler<TParams> = (request: Request, context?: RouteContext<TParams>) => Promise<Response>;

/**
 * route handler を認可で包む。
 *
 * provider-admin の越境要求は**許可・拒否にかかわらず**監査へ落とす。
 * 拒否したものだけ記録すると「通ってしまった越境」が痕跡なしで消える。
 */
export function withAuthz<TParams = Record<string, never>>(
  options: WithAuthzOptions<TParams>,
  handler: (request: Request, authz: AuthzContext, params: TParams) => Promise<Response>,
): RouteHandler<TParams> {
  return async (request, context) => {
    const deps = typeof options.deps === 'function' ? options.deps() : options.deps;

    if (!isTrustedOrigin(request.method, request.headers.get('origin'), deps.allowedOrigins)) {
      return denyResponse('untrusted_origin');
    }

    const params = ((await context?.params) ?? {}) as TParams;
    const principal = await resolveRequestPrincipal(request, {
      sessionSecret: deps.sessionSecret,
      accessTokenSecret: deps.accessTokenSecret,
      nowSeconds: deps.ports.clock.nowSeconds(),
      cwvProbe: deps.cwvProbe,
    });
    if (principal === null) return denyResponse('unauthenticated');

    if (
      principal.credential === 'cwv_probe' &&
      !isCwvProbeRequestAllowed(request.method, new URL(request.url).pathname)
    ) {
      return denyResponse('credential_not_allowed');
    }

    const resource = await options.resolveResource(request, params, principal);
    if (resource === null) return denyResponse('unresolved_resource');

    // probe は user session ではなく短命・rotate 可能な専用鍵で失効させる。synthetic actor を
    // session_revocations テーブルへ問い合わせないことで、測定経路に不要な DB read も加えない。
    const sessionRevoked =
      principal.credential === 'cwv_probe'
        ? false
        : await deps.revocation.isRevoked(principal.tenantId, principal.userId, principal.issuedAtSeconds);

    const outcome = decide({ action: options.action, principal, resource, sessionRevoked });

    // 越境判定は `cross-tenant.ts` の述語が唯一の正本。edge middleware も同じものを見る
    if (canCrossTenantBoundary([principal.role]) && principal.tenantId !== resource.tenantId) {
      await deps.audit.record({
        actorSubject: principal.userId,
        // 顧客側の workspace-admin が「自テナントへの越境」を監査できるよう、
        // event の所属先は actor ではなく target resource の tenant にする。
        tenantId: resource.tenantId,
        workspaceId: resource.workspaceId,
        // 語彙は backend-spec §3.8 の列挙に閉じる。許可・拒否は action を分けず metadata の `allowed` で表す
        action: 'provider.cross_tenant_access',
        resourceType: resource.type,
        resourceId: resource.id ?? '(none)',
        metadata: {
          actor_tenant_id: principal.tenantId,
          requested_tenant_id: resource.tenantId,
          requested_action: options.action,
          allowed: outcome.allowed,
          credential: principal.credential,
        },
      });
    }

    if (!outcome.allowed) return denyResponse(outcome.reason);

    try {
      return await handler(
        request,
        {
          principal,
          effectiveRole: outcome.effectiveRole,
          resource,
          can: (action) => decide({ action, principal, resource, sessionRevoked }).allowed,
        },
        params,
      );
    } catch (error) {
      // handler 内で追加判定した結果の拒否も、同じ形の応答へ寄せる
      if (error instanceof AuthzError) {
        return Response.json({ error: error.reason }, { status: error.status });
      }
      throw error;
    }
  };
}

function denyResponse(reason: WrapperDenyReason): Response {
  return Response.json({ error: reason }, { status: denyStatusFor(reason) });
}
