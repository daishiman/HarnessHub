/**
 * ヒアリング intake の wire 契約。
 *
 * Form 入力は salary を含むが、保存・応答・AI payload は
 * `hearingSheetFormSnapshotSchema` へ必ず落とし、salary を残さない。
 */
import { z } from 'zod';
import { paginatedSchema } from '../src/envelope.js';
import { identifierSchema, paginationQuerySchema } from '../src/primitives.js';

export const hearingSheetStatusSchema = z.enum(['received', 'generating', 'review', 'completed']);
export type HearingSheetStatus = z.output<typeof hearingSheetStatusSchema>;

export const hearingPrioritySchema = z.enum(['high', 'medium', 'low']);
export type HearingPriority = z.output<typeof hearingPrioritySchema>;

/**
 * skill-intake プラグイン（深掘りヒアリング用サブエージェント群）が集める軸のうち、
 * クリックで完結できるものをヒアリングシートの選択式項目として取り込んだもの。
 * 由来: .claude/agents/skill-intake-user-profiler.md（6 軸プロファイル）、
 * plugins/skill-intake/skills/run-intake-next-action/references/mode-catalog.md（用途分岐）。
 */
export const hearingUsagePurposeSchema = z.enum([
  'app_development',
  'harness_development',
  'system_development',
  'other',
]);
export type HearingUsagePurpose = z.output<typeof hearingUsagePurposeSchema>;

export const hearingExpertiseSchema = z.enum(['novice', 'intermediate', 'expert']);
export type HearingExpertise = z.output<typeof hearingExpertiseSchema>;

export const hearingRoleSchema = z.enum(['individual', 'employee', 'executive', 'creator']);
export type HearingRole = z.output<typeof hearingRoleSchema>;

export const hearingContextSchema = z.enum(['business', 'personal', 'study', 'hobby']);
export type HearingContext = z.output<typeof hearingContextSchema>;

export const hearingMotivationSchema = z.enum(['efficiency', 'quality', 'learning', 'branding']);
export type HearingMotivation = z.output<typeof hearingMotivationSchema>;

export const hearingSharingIntentSchema = z.enum(['self', 'small_group', 'public', 'customer']);
export type HearingSharingIntent = z.output<typeof hearingSharingIntentSchema>;

export const hearingConstraintTagSchema = z.enum(['time', 'budget', 'authority', 'knowledge']);
export type HearingConstraintTag = z.output<typeof hearingConstraintTagSchema>;

const requiredText = z.string().trim().min(1).max(2_000);
const shortText = z.string().trim().min(1).max(200);

/**
 * S10 の 12 項目 + skill-intake 由来の用途プロファイル 9 項目。salary はこの request 境界だけに存在する。
 * 用途プロファイル項目はすべて選択式（constraintTags/knowledgeAssets は複数選択・タグ追加）で、
 * shareTarget のみ既存項目でカバーできない自由記述（skill-intake 5 軸シートの「共有相手」）。
 */
export const hearingSheetFormInputSchema = z
  .object({
    taskName: shortText,
    company: shortText,
    applicant: shortText,
    domain: shortText,
    issue: requiredText,
    tools: requiredText,
    hours: z.number().int().min(1).max(160),
    people: z.number().int().min(1).max(500),
    salary: z.number().int().min(0).max(100_000_000),
    features: requiredText,
    output: requiredText,
    priority: hearingPrioritySchema,
    usagePurpose: hearingUsagePurposeSchema,
    expertise: hearingExpertiseSchema,
    role: hearingRoleSchema,
    context: hearingContextSchema,
    motivation: hearingMotivationSchema,
    sharingIntent: hearingSharingIntentSchema,
    constraintTags: z.array(hearingConstraintTagSchema).max(4).default([]),
    shareTarget: shortText,
    knowledgeAssets: z.array(shortText).min(1).max(10),
  })
  .strict();
export type HearingSheetFormInput = z.output<typeof hearingSheetFormInputSchema>;

/** DB form_json と AI payload の正本。入力から導出し salary を構造的に除外する。 */
export const hearingSheetFormSnapshotSchema = hearingSheetFormInputSchema.omit({ salary: true });
export type HearingSheetFormSnapshot = z.output<typeof hearingSheetFormSnapshotSchema>;

/**
 * 提出時にサーバで確定する試算 snapshot。
 * hourlyRate は年収を逆算できるため保存・返却しない。
 */
export const hearingSheetEstimateSchema = z
  .object({
    savedMinutesPerYear: z.number().nonnegative(),
    savedHoursPerYear: z.number().nonnegative(),
    savedAmountPerYear: z.number().nonnegative(),
  })
  .strict();
export type HearingSheetEstimate = z.output<typeof hearingSheetEstimateSchema>;

/** POST /api/v1/sheets。未知キーとクライアント計算値を受け付けない。 */
export const createSheetRequestSchema = hearingSheetFormInputSchema;
export type CreateSheetRequest = z.output<typeof createSheetRequestSchema>;

export const createSheetResponseSchema = z
  .object({
    id: identifierSchema,
    code: z.string().regex(/^HS-\d{4,}$/),
    status: z.literal('generating'),
  })
  .strict();
export type CreateSheetResponse = z.output<typeof createSheetResponseSchema>;

export const sheetApplicantSchema = z
  .object({
    id: identifierSchema,
    name: shortText,
  })
  .strict();

export const sheetListItemSchema = z
  .object({
    id: identifierSchema,
    code: z.string().regex(/^HS-\d{4,}$/),
    status: hearingSheetStatusSchema,
    title: shortText,
    domain: shortText,
    department: z.string().max(200).nullable(),
    people: z.number().int().positive(),
    hours: z.number().int().positive(),
    applicant: sheetApplicantSchema,
    updated_at: z.number().int().nonnegative(),
  })
  .strict();
export type SheetListItem = z.output<typeof sheetListItemSchema>;

export const sheetListQuerySchema = paginationQuerySchema.extend({
  status: hearingSheetStatusSchema.optional(),
  department: z.string().trim().min(1).max(200).optional(),
  q: z.string().trim().min(1).max(200).optional(),
});
export type SheetListQuery = z.output<typeof sheetListQuerySchema>;

export const sheetListResponseSchema = paginatedSchema(sheetListItemSchema);
export type SheetListResponse = z.output<typeof sheetListResponseSchema>;

export const generatedSectionsSchema = z
  .object({
    overview: z.string().max(100_000),
    issue: z.string().max(100_000),
    feature_tags: z.array(z.string().trim().min(1).max(100)).max(100),
    estimated_effect: z.string().max(100_000),
  })
  .strict();

export const sheetGenerationPayloadSchema = z
  .object({
    sheet_id: identifierSchema,
    sheet_code: z.string().regex(/^HS-\d{4,}$/),
    form: hearingSheetFormSnapshotSchema,
    estimate: hearingSheetEstimateSchema.pick({
      savedHoursPerYear: true,
      savedAmountPerYear: true,
    }),
  })
  .strict();
export type SheetGenerationPayload = z.output<typeof sheetGenerationPayloadSchema>;

export const sheetGenerationResultSchema = z
  .object({
    generated_sections: generatedSectionsSchema,
  })
  .strict();
export type SheetGenerationResult = z.output<typeof sheetGenerationResultSchema>;

export const sheetDetailSchema = z
  .object({
    id: identifierSchema,
    code: z.string().regex(/^HS-\d{4,}$/),
    status: hearingSheetStatusSchema,
    title: shortText,
    applicant: sheetApplicantSchema,
    department: z.string().max(200).nullable(),
    form_snapshot: hearingSheetFormSnapshotSchema,
    estimate_snapshot: hearingSheetEstimateSchema,
    generated_sections: generatedSectionsSchema.nullable(),
    created_at: z.number().int().nonnegative(),
    updated_at: z.number().int().nonnegative(),
    ai_job_status: z.enum(['queued', 'processing', 'completed', 'failed', 'dead']).nullable(),
    build_ref: identifierSchema.nullable(),
    publish_request_ref: identifierSchema.nullable(),
    can_manage: z.boolean().default(false),
  })
  .strict();
export type SheetDetail = z.output<typeof sheetDetailSchema>;

export const updateSheetStatusRequestSchema = z
  .object({
    status: hearingSheetStatusSchema,
  })
  .strict();
export type UpdateSheetStatusRequest = z.output<typeof updateSheetStatusRequestSchema>;

export const pullSheetGenerationJobRequestSchema = z
  .object({
    kind: z.literal('sheet_generation').default('sheet_generation'),
  })
  .strict();
export type PullSheetGenerationJobRequest = z.output<typeof pullSheetGenerationJobRequestSchema>;

export const pulledAiJobSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal('sheet_generation'),
    payload: sheetGenerationPayloadSchema,
    lease_expires_at: z.number().int().positive(),
  })
  .strict();
export type PulledAiJob = z.output<typeof pulledAiJobSchema>;

export const completeSheetGenerationJobRequestSchema = sheetGenerationResultSchema;
export type CompleteSheetGenerationJobRequest = z.output<typeof completeSheetGenerationJobRequestSchema>;

export const failSheetGenerationJobRequestSchema = z
  .object({
    error: z.string().trim().min(1).max(4_000),
  })
  .strict();
export type FailSheetGenerationJobRequest = z.output<typeof failSheetGenerationJobRequestSchema>;
