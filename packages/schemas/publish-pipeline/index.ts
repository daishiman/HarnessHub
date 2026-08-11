/**
 * feat-publish-pipeline が所有する契約 schema の公開入口。
 *
 * consumer は `@harness-hub/schemas` (root entry) 経由で参照する。
 * subpath deep import は共通層 detector が `boundary-bypass-deep-import` として弾くため、
 * root からの再エクスポートが唯一の正式経路になる (auth-tenancy と同じ扱い)。
 *
 * ここは**業務ドメイン固有**の契約なので `contract-registry.ts` (OpenAPI drift 検査の入力) には登録しない。
 */

export type {
  DeploymentReferenceView,
  PromoteRequest,
  RegisterDeployment,
  ReleaseListResponse,
  ReleaseView,
  RollbackRequest,
  TargetChannelView,
} from './catalog.js';
export {
  deploymentReferenceSchema,
  promoteRequestSchema,
  registerDeploymentSchema,
  releaseListResponseSchema,
  releaseSchema,
  rollbackRequestSchema,
  targetChannelSchema,
} from './catalog.js';
export {
  formatPublishFinding,
  formatPublishFindings,
  PUBLISH_NEEDS_FIX_HEADING,
  PUBLISH_RESUBMIT_ACTION_LABEL,
  publishNeedsFixSummary,
} from './finding-presentation.js';
export type {
  DeploymentProvider,
  PublishFindingSeverity,
  PublishInspectionStage,
  PublishRequestState,
  PublishTarget,
  PublishVerdict,
  PublishVisibility,
  ReleaseStatus,
} from './primitives.js';
export {
  deploymentProviderSchema,
  idempotencyKeySchema,
  publishFindingSeveritySchema,
  publishInspectionStageSchema,
  publishRequestStateSchema,
  publishTargetSchema,
  publishVerdictSchema,
  publishVisibilitySchema,
  releaseStatusSchema,
} from './primitives.js';
export type {
  CreatePublishProject,
  PublishProject,
  PublishProjectChoice,
  PublishProjectList,
} from './project.js';
export {
  createPublishProjectSchema,
  publishProjectChoiceSchema,
  publishProjectListSchema,
  publishProjectSchema,
} from './project.js';
export type {
  CreatePublishRequest,
  PackageUploadResponse,
  PublishFinding,
  PublishListQuery,
  PublishListResponse,
  PublishRequestView,
} from './publish-request.js';
export {
  createPublishRequestSchema,
  packageUploadResponseSchema,
  publishFindingSchema,
  publishListQuerySchema,
  publishListResponseSchema,
  publishRequestSchema,
} from './publish-request.js';
