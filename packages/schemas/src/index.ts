/** @harness-hub/schemas の公開 API 単一入口。consumer は必ずここ経由で参照する (deep import 禁止)。 */

// feat-auth-tenancy の契約 schema。deep import が detector で禁止されているため、
// 業務ドメイン固有の schema であってもこの単一入口から再エクスポートする以外に経路が無い。
// contract-registry (OpenAPI drift 検査の入力) には登録しない — 登録簿の責務は共通契約までのため。
export * from '../auth-tenancy/index.js';
// feat-build-pipeline-board の契約 schema。同上の理由でここから再エクスポートする。
export * from '../build-pipeline-board/index.js';
// feat-dual-catalog-web の契約 schema。同上の理由でここから再エクスポートする。
export * from '../docs-cms/index.js';
export * from '../dual-catalog-web/index.js';
// feat-feedback-loop の契約 schema。同上の理由でここから再エクスポートする。
export * from '../feedback-loop/index.js';
export * from '../hearing-intake/index.js';
// feat-metrics-tracking の契約 schema。同上の理由でここから再エクスポートする。
export * from '../metrics-tracking/index.js';
// feat-publish-pipeline の契約 schema。auth-tenancy と同じ理由でここから再エクスポートする。
export * from '../publish-pipeline/index.js';
// feat-publisher-plugin の契約 schema。同上の理由でここから再エクスポートする。
export * from '../publisher-plugin/index.js';
// feat-tenant-data-retention の契約 schema。同上の理由でここから再エクスポートする。
export * from '../tenant-data/index.js';
// feat-user-org-admin の契約 schema。同上の理由でここから再エクスポートする。
export * from '../user-org-admin/index.js';
export type { ContractSchemaName } from './contract-registry.js';
export {
  buildContractComponents,
  contractSchemaNames,
  createContractRegistry,
  renderContractDocument,
} from './contract-registry.js';
export type { FieldError, Paginated, ParseOutcome, ProblemDetails } from './envelope.js';
export {
  fieldErrorSchema,
  PROBLEM_JSON_MEDIA_TYPE,
  paginatedSchema,
  parseRequest,
  problemDetails,
  problemDetailsFromZodError,
  problemDetailsSchema,
} from './envelope.js';
export type { DependencyCheck, HealthResponse, HealthStatus } from './health.js';
export {
  buildHealthResponse,
  dependencyCheckSchema,
  deriveHealthStatus,
  healthHttpStatus,
  healthResponseSchema,
  healthStatusSchema,
} from './health.js';
export type {
  OpenApiDocument,
  SchemaConverter,
  SchemaRegistration,
  SchemaRegistry,
} from './openapi.js';
export {
  createOpenApiDocument,
  createSchemaRegistry,
  defaultSchemaConverter,
} from './openapi.js';
export type {
  IsoDateTime,
  Locale,
  PaginationQuery,
  TenantId,
  UserId,
  WorkspaceId,
} from './primitives.js';
export {
  cursorSchema,
  emailSchema,
  identifierSchema,
  isoDateTimeSchema,
  listSearchTermSchema,
  localeSchema,
  paginationQuerySchema,
  semVerSchema,
  tenantIdSchema,
  toIsoDateTime,
  userIdSchema,
  workspaceIdSchema,
} from './primitives.js';
