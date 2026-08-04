/** 認証層 (lib/auth) の公開入口。 */

export {
  type AuthjsConfig,
  type AuthjsConfigDeps,
  type AuthjsHandlerDeps,
  type AuthRouteHandler,
  type BuildOidcProviderOptions,
  buildOidcProvider,
  createAuthjsHandler,
  createSessionAuthProvider,
  type OidcCheck,
  type OidcProviderConfig,
  type ResolveAuthjsConfigOptions,
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
  SHARED_OIDC_BASE_PATH,
  SHARED_OIDC_CALLBACK_PATH,
  SHARED_OIDC_CSRF_COOKIE_PREFIX,
  SHARED_OIDC_PATH_SEGMENT,
  SHARED_OIDC_PROVIDER_ID,
  STATE_CHANGING_METHODS,
  serializeClearedSessionCookie,
  serializeClearedSharedOidcCsrfCookie,
  serializeSessionCookie,
  serializeSharedOidcCsrfCookie,
  sharedOidcCsrfCookieName,
} from './config.js';
export {
  AuthPortDataError,
  createDbAuthPorts,
  createDbClientSecretResolver,
  type DbAuthPortsDeps,
} from './db-ports.js';
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
  verifyWorkspaceDomain,
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
export {
  createOidcCredentialResolver,
  GOOGLE_OIDC_ISSUER,
  type OidcCredentialResolverDeps,
  readSharedGoogleCredentials,
  SHARED_GOOGLE_CLIENT_ID_ENV,
  SHARED_GOOGLE_CLIENT_SECRET_ENV,
  type SharedGoogleCredentials,
} from './shared-credentials.js';
export {
  type IssuedSharedOidcState,
  type IssueSharedOidcStateInput,
  issueSharedOidcState,
  type SharedOidcStateRejectionReason,
  type SharedOidcStateVerification,
  type VerifySharedOidcStateInput,
  verifySharedOidcState,
} from './shared-oidc-state.js';
