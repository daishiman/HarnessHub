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
  resolveAuthjsConfig,
} from './authjs-config.js';
export {
  resolveSignIn,
  type SignInInput,
  type SignInOutcome,
  type SignInRejection,
  sessionClaimsForUser,
} from './callbacks.js';
export { createSessionAuthProvider, type SessionAuthProviderDeps } from './session-provider.js';
