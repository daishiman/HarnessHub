/**
 * feat-auth-tenancy が所有する契約 schema の公開入口。
 *
 * consumer は `@harness-hub/schemas` (root entry) 経由で参照する。
 * subpath deep import (`@harness-hub/schemas/auth-tenancy`) は共通層 detector が
 * `boundary-bypass-deep-import` として弾くため、root からの再エクスポートが唯一の正式経路になる。
 *
 * ここは**業務ドメイン固有**の契約なので `contract-registry.ts` (OpenAPI drift 検査の入力) には登録しない。
 * 登録簿は「共通プリミティブと共通エンベロープまで」という責務境界を持つ。
 */

export type {
  DeviceApproveRequest,
  DeviceCodeRequest,
  DeviceCodeResponse,
  DeviceErrorCode,
  DeviceErrorResponse,
  DeviceTokenRequest,
} from './device-flow.js';
export {
  deviceApproveRequestSchema,
  deviceCodeRequestSchema,
  deviceCodeResponseSchema,
  deviceErrorCodeSchema,
  deviceErrorResponseSchema,
  deviceTokenRequestSchema,
} from './device-flow.js';
export type {
  OidcCredentialMode,
  PublisherTokenScope,
  SessionRole,
  TenantSlug,
  UserCode,
  UserStatus,
  WorkspaceDomain,
} from './primitives.js';
export {
  deviceCodeSchema,
  epochSecondsSchema,
  oidcCredentialModeSchema,
  publisherTokenScopeSchema,
  refreshTokenSchema,
  sessionRoleSchema,
  tenantSlugSchema,
  USER_CODE_ALPHABET,
  USER_CODE_LENGTH,
  userCodeSchema,
  userStatusSchema,
  workspaceDomainSchema,
} from './primitives.js';
export type { OidcIdTokenClaims, SessionClaims, SigninRouteParams } from './session.js';
export { oidcIdTokenClaimsSchema, sessionClaimsSchema, signinRouteParamsSchema } from './session.js';
export type { SharedOidcStateClaims } from './shared-oidc.js';
export { sharedOidcStateClaimsSchema } from './shared-oidc.js';
export type {
  AccessTokenClaims,
  RefreshRequest,
  TokenListResponse,
  TokenResponse,
  TokenRevocationResponse,
  TokenSummary,
} from './token.js';
export {
  accessTokenClaimsSchema,
  refreshRequestSchema,
  tokenListResponseSchema,
  tokenResponseSchema,
  tokenRevocationResponseSchema,
  tokenSummarySchema,
} from './token.js';
