/** @harness-hub/schemas の公開 API 単一入口。consumer は必ずここ経由で参照する (deep import 禁止)。 */

export {
  identifierSchema,
  tenantIdSchema,
  workspaceIdSchema,
  userIdSchema,
  isoDateTimeSchema,
  toIsoDateTime,
  emailSchema,
  semVerSchema,
  localeSchema,
  cursorSchema,
  paginationQuerySchema,
} from './primitives.js';
export type {
  TenantId,
  WorkspaceId,
  UserId,
  IsoDateTime,
  Locale,
  PaginationQuery,
} from './primitives.js';

export {
  healthStatusSchema,
  dependencyCheckSchema,
  healthResponseSchema,
  deriveHealthStatus,
  healthHttpStatus,
  buildHealthResponse,
} from './health.js';
export type { HealthStatus, DependencyCheck, HealthResponse } from './health.js';

export {
  PROBLEM_JSON_MEDIA_TYPE,
  paginatedSchema,
  fieldErrorSchema,
  problemDetailsSchema,
  problemDetails,
  problemDetailsFromZodError,
  parseRequest,
} from './envelope.js';
export type { Paginated, FieldError, ProblemDetails, ParseOutcome } from './envelope.js';

export {
  createSchemaRegistry,
  createOpenApiDocument,
  defaultSchemaConverter,
} from './openapi.js';
export type {
  SchemaRegistration,
  SchemaRegistry,
  SchemaConverter,
  OpenApiDocument,
} from './openapi.js';

export {
  contractSchemaNames,
  createContractRegistry,
  buildContractComponents,
} from './contract-registry.js';
export type { ContractSchemaName } from './contract-registry.js';
