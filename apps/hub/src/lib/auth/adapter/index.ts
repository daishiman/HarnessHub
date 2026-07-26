/**
 * Auth.js 境界の公開入口。
 * 境界の外からは必ずここ経由で参照する (`adapter/authjs-config.js` への直接 import は
 * `apps/hub/scripts/check-auth-adapter-boundary.mjs` が検出する)。
 */

export {
  type AuthjsConfig,
  type AuthjsConfigDeps,
  buildOidcProvider,
  type OidcProviderConfig,
  type ResolvedAuthjsConfig,
  resolveAuthjsConfig,
  resolveAuthjsConfigForTenant,
} from './authjs-config.js';
// Auth.js 由来の型は 1 つも出さない。出るのは Web 標準の `(Request) => Promise<Response>` だけ (T-BND-02)
export { type AuthjsHandlerDeps, type AuthRouteHandler, createAuthjsHandler } from './authjs-handler.js';
export {
  resolveSignIn,
  type SignInInput,
  type SignInOutcome,
  type SignInRejection,
  sessionClaimsForUser,
} from './callbacks.js';
export { createSessionAuthProvider, type SessionAuthProviderDeps } from './session-provider.js';
