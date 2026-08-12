/**
 * Studio P1: hearing intake と全 Studio feature が共有する pull 型 AI queue。
 *
 * `ai_jobs` は hearing 固有ではない。最初の consumer が migration lineage へ載せるだけで、
 * kind は backend-spec §2.3 の共通 3 値を保つ。
 */
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { DEFAULT_TENANT_COEFFICIENT_VALUES } from './coefficient-defaults';

export const HEARING_SHEET_STATUSES = ['received', 'generating', 'review', 'completed'] as const;
export const AI_JOB_KINDS = ['sheet_generation', 'feedback_response', 'doc_draft'] as const;
export const AI_JOB_STATUSES = ['queued', 'processing', 'completed', 'failed', 'dead'] as const;
export const DISPLAY_CODE_KINDS = ['HS', 'FR', 'DOC'] as const;

export const hearingSheets = sqliteTable(
  'hearing_sheets',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    applicantUserId: text('applicant_user_id').notNull(),
    department: text('department'),
    status: text('status', { enum: HEARING_SHEET_STATUSES }).notNull(),
    formJson: text('form_json').notNull(),
    estimateJson: text('estimate_json').notNull(),
    aiJobId: text('ai_job_id'),
    generatedDocIdsJson: text('generated_doc_ids_json'),
    buildId: text('build_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('hearing_sheets_tenant_code_uq').on(t.tenantId, t.code),
    index('hearing_sheets_tenant_workspace_updated_idx').on(t.tenantId, t.workspaceId, t.updatedAt),
    index('hearing_sheets_tenant_applicant_updated_idx').on(t.tenantId, t.applicantUserId, t.updatedAt),
  ],
);

/** D5 共通 pull queue。feature 固有列を持たず ref_type/ref_id で書戻し先を束縛する。 */
export const aiJobs = sqliteTable(
  'ai_jobs',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    kind: text('kind', { enum: AI_JOB_KINDS }).notNull(),
    status: text('status', { enum: AI_JOB_STATUSES }).notNull(),
    payloadJson: text('payload_json').notNull(),
    resultJson: text('result_json'),
    error: text('error'),
    attempt: integer('attempt').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    leaseExpiresAt: integer('lease_expires_at'),
    claimedByTokenId: text('claimed_by_token_id'),
    refType: text('ref_type').notNull(),
    refId: text('ref_id').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('ai_jobs_tenant_workspace_kind_status_created_idx').on(
      t.tenantId,
      t.workspaceId,
      t.kind,
      t.status,
      t.createdAt,
    ),
    index('ai_jobs_lease_idx').on(t.status, t.leaseExpiresAt),
    index('ai_jobs_ref_idx').on(t.tenantId, t.refType, t.refId),
  ],
);

/** 表示用コードを tenant × kind ごとに直列採番する。 */
export const displayCodeCounters = sqliteTable(
  'display_code_counters',
  {
    tenantId: text('tenant_id').notNull(),
    kind: text('kind', { enum: DISPLAY_CODE_KINDS }).notNull(),
    nextValue: integer('next_value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.kind] })],
);

/**
 * ヒアリングシート添付スクリーンショットのメタデータ (feat-hearing-intake 追加要件)。
 * 実体 (暗号化 blob) は `tenant_data_objects` (kind='hearing_screenshot') が持つ。
 * ここは「どのシートのどの項目に紐づく画像か」と content_type (tenant_data_objects には無い) だけを持つ。
 */
export const hearingScreenshots = sqliteTable(
  'hearing_screenshots',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    sheetId: text('sheet_id').notNull(),
    tenantDataObjectId: text('tenant_data_object_id').notNull(),
    title: text('title').notNull(),
    linkedItem: text('linked_item'),
    note: text('note'),
    contentType: text('content_type').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('hearing_screenshots_tenant_data_object_uq').on(t.tenantDataObjectId),
    index('hearing_screenshots_tenant_sheet_created_idx').on(t.tenantId, t.sheetId, t.createdAt),
  ],
);

/**
 * ヒアリング結果の受け渡し用トークン (feat-hearing-intake 追加要件、API 方式)。
 * device_authorizations/publisher_tokens (auth-tenancy) と同じ CAS 方針: token 本体はハッシュのみ保存し、
 * 失効は `revoked_at IS NULL` を条件にした compare-and-swap で行う (二重失効・再利用を並行要求から守る)。
 */
export const hearingShareTokens = sqliteTable(
  'hearing_share_tokens',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    sheetId: text('sheet_id').notNull(),
    audience: text('audience', { enum: ['harness_creator', 'system_orchestrator'] }).notNull(),
    /** token は SHA-256 ハッシュのみ保存する (平文は発行応答にしか存在しない)。 */
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at').notNull(),
    revokedAt: integer('revoked_at'),
    lastAccessedAt: integer('last_accessed_at'),
    accessCount: integer('access_count').notNull().default(0),
    createdByUserId: text('created_by_user_id').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('hearing_share_tokens_token_hash_uq').on(t.tokenHash),
    index('hearing_share_tokens_tenant_sheet_created_idx').on(t.tenantId, t.sheetId, t.createdAt),
  ],
);

/** サーバ試算へ注入する tenant 別係数。未登録 tenant は adapter の既定値を使う。 */
export const tenantCoefficients = sqliteTable('tenant_coefficients', {
  tenantId: text('tenant_id').primaryKey(),
  annualHours: integer('annual_hours').notNull().default(DEFAULT_TENANT_COEFFICIENT_VALUES.annualHours),
  minutesPerRun: integer('minutes_per_run').notNull().default(DEFAULT_TENANT_COEFFICIENT_VALUES.minutesPerRun),
  sheetReductionRate: real('sheet_reduction_rate')
    .notNull()
    .default(DEFAULT_TENANT_COEFFICIENT_VALUES.sheetReductionRate),
  updatedBy: text('updated_by').notNull(),
});
