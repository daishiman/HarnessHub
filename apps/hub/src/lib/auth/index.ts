/** 認証層 (lib/auth) の公開入口。 */

export {
  type AuthjsConfig,
  type AuthjsConfigDeps,
  type AuthjsHandlerDeps,
  type AuthRouteHandler,
  buildOidcProvider,
  createAuthjsHandler,
  createSessionAuthProvider,
  type OidcProviderConfig,
  type ResolvedAuthjsConfig,
  resolveAuthjsConfig,
  resolveAuthjsConfigForTenant,
  resolveSignIn,
  type SessionAuthProviderDeps,
  type SignInInput,
  type SignInOutcome,
  type SignInRejection,
  sessionClaimsForUser,
} from './adapter/index.js';
export {
  AUTH_NUMERIC_CONTRACT,
  isTrustedOrigin,
  SESSION_COOKIE_ATTRIBUTES,
  SESSION_COOKIE_NAME,
  STATE_CHANGING_METHODS,
  serializeClearedSessionCookie,
  serializeSessionCookie,
} from './config.js';
export { AuthPortDataError, createDbAuthPorts, type DbAuthPortsDeps } from './db-ports.js';
export {
  type ApproveRejection,
  type ApproveResult,
  createDeviceFlowService,
  type DeviceFlowDeps,
  type DeviceFlowResult,
  type DeviceFlowService,
  generateOpaqueToken,
  generateUserCode,
  normalizeUserCode,
  type RandomBytes,
  systemRandomBytes,
} from './device-flow/index.js';
export { sha256Hex, signJwt, verifyJwt } from './jwt.js';
export {
  type OidcRejectionReason,
  type OidcVerification,
  type OidcVerificationInput,
  resolveTenantOidcConfig,
  verifyOidcIdToken,
} from './oidc.js';
export type {
  AuthClock,
  AuthPorts,
  DeviceAuthorizationPort,
  DeviceAuthorizationRecord,
  DeviceAuthorizationStatus,
  DevicePollProgress,
  DirectoryUser,
  PublisherTokenPort,
  PublisherTokenRecord,
  SessionRevocationPort,
  TenantOidcConnection,
  TenantOidcConnectionPort,
  UserDirectoryPort,
} from './ports.js';
export { systemAuthClock } from './ports.js';
export {
  buildSessionClaims,
  readCookie,
  type SessionRejectionReason,
  type SessionVerification,
  shouldRefreshSession,
  signSessionToken,
  verifySessionToken,
} from './session.js';
