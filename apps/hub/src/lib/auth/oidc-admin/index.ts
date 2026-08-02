/**
 * 顧客持ち込み OIDC credential の管理面の公開入口
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * route と合成点はこの barrel からだけ取る。実体 file を直接 import させると、
 * `connection-test.ts` の平文 secret を受け取る型が呼び出し側の選択肢に並んでしまう。
 */

export {
  createGoogleOidcConnectionTester,
  type GoogleOidcConnectionTesterDeps,
  type OidcConnectionTester,
  type OidcConnectionTestInput,
  type OidcConnectionTestOutcome,
} from './connection-test.js';
export { oidcAdminErrorResponse, oidcAdminResponse, readJsonBody } from './http.js';
export {
  createOidcAdminService,
  OIDC_CONNECTION_RESOURCE_TYPE,
  type OidcAdminErrorCode,
  type OidcAdminResult,
  type OidcAdminScope,
  type OidcAdminService,
  type OidcAdminServiceDeps,
} from './service.js';
export { createUnavailableOidcAdminService } from './unavailable.js';
