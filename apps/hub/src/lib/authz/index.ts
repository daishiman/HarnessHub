/**
 * 認可判定層 (lib/authz) の公開入口。
 *
 * role の順序関係 (`ROLE_ORDER` / 'provider-admin' 等のリテラル) を知ってよいのはこの層だけ。
 * 制約は `apps/hub/scripts/check-single-authz-middleware.mjs` が検査する。
 */

export { type AuthzDecisionInput, decide, type RoleResolution, resolveEffectiveRole } from './decide.js';
export {
  type AccessTokenPrincipalResolverDeps,
  type PrincipalResolverDeps,
  readBearerToken,
  resolveAccessTokenPrincipal,
  resolveRequestPrincipal,
} from './principal.js';
export { type RequestScopedResourceInput, requestScopedResource } from './resource.js';
export { createRevocationChecker, type RevocationChecker } from './revocation.js';
export { ACTION_RULES, type ActionRule, findActionRule } from './rules.js';
export {
  type AuthRuntime,
  type AuthRuntimeEnv,
  type AuthRuntimeInput,
  authRuntime,
  createAuthRuntime,
  createDbAuditSink,
  createProductionAuthRuntime,
  readAuthRuntimeEnv,
} from './runtime.js';
export { sessionActionVisible } from './session-action-visibility.js';
export {
  type AuthzDenyReason,
  type AuthzOutcome,
  type AuthzPrincipal,
  type AuthzResourceRef,
  atLeast,
  BASE_ROLES,
  type BaseRole,
  type EffectiveRole,
  ROLE_ORDER,
  roleRank,
} from './types.js';
export {
  type AuthzContext,
  AuthzError,
  type AuthzRuntimeDeps,
  denyStatusFor,
  type RouteContext,
  type RouteHandler,
  type WithAuthzOptions,
  type WrapperDenyReason,
  withAuthz,
} from './with-authz.js';
