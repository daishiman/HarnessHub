/**
 * feat-publish-pipeline の公開入口。route とテストはここからのみ取る。
 *
 * `db-ports.ts` の adapter を出さないのは、合成点 (`runtime.ts`) 以外が
 * repository の存在を知る必要が無いため。知れる形にすると route から直接組める経路ができる。
 */

export { PUBLISH_AUDIT_ACTIONS, PUBLISH_AUDIT_ENTITIES, type PublishAuditAction } from './audit.js';
export { createDbPublishPorts, type DbPublishPortsInput } from './db-ports.js';
export {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_REPLAY_HEADER,
  IDEMPOTENCY_TTL_MS,
  type IdempotencyDeps,
  withIdempotency,
} from './idempotency.js';
export { inspectPackageArchive, type PackageInspectionOutcome } from './package-inspection.js';
export {
  decodePublishPayload,
  EMPTY_PUBLISH_PAYLOAD,
  encodePublishPayload,
  PUBLISH_PAYLOAD_VERSION,
} from './payload.js';
export type {
  ChannelPort,
  ChannelRecord,
  ClockPort,
  DeploymentPort,
  DeploymentRecord,
  IdempotencyEntry,
  IdempotencyPort,
  PackagePort,
  ProjectAccessPort,
  PublishListFilter,
  PublishPayload,
  PublishPorts,
  PublishProjectAccess,
  PublishRequestPort,
  PublishRequestRecord,
  PublishScope,
  ReleasePort,
  ReleaseRecord,
  StoredPackage,
  TransitionPortInput,
} from './ports.js';
export {
  checkPublishRateLimit,
  createFixedWindowRateLimiter,
  PUBLISH_RATE_LIMIT,
  publishRateLimitBucket,
  RATE_LIMIT_HEADERS,
  type RateLimitDecision,
  type RateLimitPort,
  rateLimitHeaders,
  setPublishRateLimiterForTest,
} from './rate-limit.js';
export {
  resolveChannelResource,
  resolveProjectResource,
  resolvePublishCreateResource,
  resolvePublishListResource,
  resolvePublishRequestResource,
  resolveReleaseResource,
} from './resource-resolver.js';
export {
  jsonFailure,
  jsonOk,
  PUBLISH_JSON_BODY_MAX_BYTES,
  publishRuntime,
  publishScopeOf,
  readRequestBodyBounded,
  setPublishRuntimeForTest,
  withPublishMutation,
  withRateLimitHeaders,
} from './route-support.js';
export { createPublishRuntime, type PublishRuntime, readPublishRuntimeEnv } from './runtime.js';
export {
  approvePublishRequest,
  cancelPublishRequest,
  createPublishRequest,
  getPublishRequest,
  listProjectReleases,
  listPublishRequests,
  PUBLISH_ERROR_STATUS,
  type PublishErrorCode,
  type PublishFailure,
  type PublishOutcome,
  type PublishServiceDeps,
  promoteChannel,
  registerDeployment,
  rollbackChannel,
  submitPublishRequest,
  suspendRelease,
  uploadPublishPackage,
} from './service.js';
export {
  allowedEvents,
  isTerminal,
  occupiesChannel,
  PUBLISH_REQUEST_EVENTS,
  PUBLISH_REQUEST_STATES,
  type PublishRequestEvent,
  TERMINAL_STATES,
  type TransitionResult,
  transition,
} from './state-machine.js';
export {
  allowsPublish,
  blocksPublish,
  FALLBACK_PUBLISH_VERDICT,
  inspectionEventFor,
  PUBLISH_VERDICTS,
  summarizeInspection,
  toPublishVerdict,
} from './verdict.js';
export { nextCursorOf, toChannelView, toDeploymentView, toPublishRequestView, toReleaseView } from './views.js';
