/**
 * feat-feedback-loop の wire 契約 (ADR §1/§4, docs/backend-spec-api-state.md §4.7)。
 *
 * `source` は principal 種別 (Bearer=harness / session=manual) から自動導出する値であり、
 * クライアント申告を受理しない (B6)。そのため createFeedbackRequestSchema には含めない。
 */
import { z } from 'zod';
import { paginatedSchema } from '../src/envelope.js';
import { identifierSchema, paginationQuerySchema } from '../src/primitives.js';

export const feedbackTypeSchema = z.enum(['improvement', 'review', 'bug']);
export type FeedbackType = z.output<typeof feedbackTypeSchema>;

export const feedbackPrioritySchema = z.enum(['high', 'medium', 'low']);
export type FeedbackPriority = z.output<typeof feedbackPrioritySchema>;

export const feedbackSourceSchema = z.enum(['harness', 'manual']);
export type FeedbackSource = z.output<typeof feedbackSourceSchema>;

/** open → in_progress → resolved (docs/backend-spec-api-state.md §5.4)。逆行・スキップ遷移は API 層で拒否する。 */
export const feedbackStatusSchema = z.enum(['open', 'in_progress', 'resolved']);
export type FeedbackStatus = z.output<typeof feedbackStatusSchema>;

const feedbackBody = z.string().trim().min(1).max(20_000);

/** POST /api/v1/feedback。source は principal から導出しリクエストに含めない (B6)。 */
export const createFeedbackRequestSchema = z
  .object({
    project_id: identifierSchema,
    type: feedbackTypeSchema,
    priority: feedbackPrioritySchema,
    body: feedbackBody,
  })
  .strict();
export type CreateFeedbackRequest = z.output<typeof createFeedbackRequestSchema>;

export const createFeedbackResponseSchema = z
  .object({
    id: identifierSchema,
    code: z.string().regex(/^FR-\d{4,}$/),
    status: z.literal('open'),
  })
  .strict();
export type CreateFeedbackResponse = z.output<typeof createFeedbackResponseSchema>;

export const feedbackListItemSchema = z
  .object({
    id: identifierSchema,
    code: z.string().regex(/^FR-\d{4,}$/),
    project_id: identifierSchema,
    type: feedbackTypeSchema,
    priority: feedbackPrioritySchema,
    source: feedbackSourceSchema,
    status: feedbackStatusSchema,
    created_at: z.number().int().nonnegative(),
    updated_at: z.number().int().nonnegative(),
  })
  .strict();
export type FeedbackListItem = z.output<typeof feedbackListItemSchema>;

export const feedbackListQuerySchema = paginationQuerySchema.extend({
  status: feedbackStatusSchema.optional(),
  type: feedbackTypeSchema.optional(),
  project_id: identifierSchema.optional(),
});
export type FeedbackListQuery = z.output<typeof feedbackListQuerySchema>;

export const feedbackListResponseSchema = paginatedSchema(feedbackListItemSchema);
export type FeedbackListResponse = z.output<typeof feedbackListResponseSchema>;

/** GET /api/v1/feedback/:id。ai_response は共通レンダラで sanitize してから描画する raw Markdown (SEC7)。 */
export const feedbackDetailSchema = feedbackListItemSchema
  .omit({})
  .extend({
    body: feedbackBody,
    ai_response: z.string().max(20_000).nullable(),
    ai_job_id: identifierSchema.nullable(),
    created_by: identifierSchema,
    /** route 層が authz.can('feedback.status_change') から算出して合成する (sheets の SheetDetail と同型)。 */
    can_manage: z.boolean().default(false),
  })
  .strict();
export type FeedbackDetail = z.output<typeof feedbackDetailSchema>;

/** PATCH /api/v1/feedback/:id。workspace-admin 限定 (docs/backend-spec.md §3.3)。status のみ変更可能。 */
export const updateFeedbackStatusRequestSchema = z
  .object({
    status: feedbackStatusSchema,
  })
  .strict();
export type UpdateFeedbackStatusRequest = z.output<typeof updateFeedbackStatusRequestSchema>;

/** Feedback 状態機械 (docs/backend-spec-api-state.md §5.4)。隣接遷移のみ許可し逆行・スキップを拒否する。 */
export const FEEDBACK_STATUS_TRANSITIONS: Readonly<Record<FeedbackStatus, readonly FeedbackStatus[]>> = {
  open: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
};

export function isValidFeedbackStatusTransition(from: FeedbackStatus, to: FeedbackStatus): boolean {
  return FEEDBACK_STATUS_TRANSITIONS[from].includes(to);
}

/** AiJob(`feedback_response`) の payload/result 契約。ai_jobs テーブル自体のスキーマは変更しない (ADR §5)。 */
export const feedbackResponseJobPayloadSchema = z
  .object({
    feedback_id: identifierSchema,
    feedback_code: z.string().regex(/^FR-\d{4,}$/),
    type: feedbackTypeSchema,
    body: feedbackBody,
  })
  .strict();
export type FeedbackResponseJobPayload = z.output<typeof feedbackResponseJobPayloadSchema>;

export const feedbackResponseJobResultSchema = z
  .object({
    ai_response: z.string().trim().min(1).max(20_000),
  })
  .strict();
export type FeedbackResponseJobResult = z.output<typeof feedbackResponseJobResultSchema>;

/**
 * P05 実装で追加。POST /api/v1/ai-jobs/{pull,:id/complete,:id/fail} は kind 非依存の汎用実装であり、
 * hearing-intake の `pullSheetGenerationJobRequestSchema` 等と同じ形の kind discriminator を
 * feedback_response 用にも用意する (ADR §5)。ai_jobs テーブル自体のスキーマは変更しない。
 */
export const pullFeedbackResponseJobRequestSchema = z
  .object({
    kind: z.literal('feedback_response').default('feedback_response'),
  })
  .strict();
export type PullFeedbackResponseJobRequest = z.output<typeof pullFeedbackResponseJobRequestSchema>;

export const pulledFeedbackResponseJobSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal('feedback_response'),
    payload: feedbackResponseJobPayloadSchema,
    lease_expires_at: z.number().int().positive(),
  })
  .strict();
export type PulledFeedbackResponseJob = z.output<typeof pulledFeedbackResponseJobSchema>;

export const completeFeedbackResponseJobRequestSchema = feedbackResponseJobResultSchema;
export type CompleteFeedbackResponseJobRequest = z.output<typeof completeFeedbackResponseJobRequestSchema>;

export const failFeedbackResponseJobRequestSchema = z
  .object({
    error: z.string().trim().min(1).max(4_000),
  })
  .strict();
export type FailFeedbackResponseJobRequest = z.output<typeof failFeedbackResponseJobRequestSchema>;
