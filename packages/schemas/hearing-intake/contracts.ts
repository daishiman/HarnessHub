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

export const HEARING_SHEET_FORM_LIMITS = {
  requiredTextLength: 2_000,
  shortTextLength: 200,
  informationSources: 10,
  knowledgeAssets: 10,
} as const;

const requiredText = z.string().trim().min(1).max(HEARING_SHEET_FORM_LIMITS.requiredTextLength);
const shortText = z.string().trim().min(1).max(HEARING_SHEET_FORM_LIMITS.shortTextLength);

/** PR #705 より前の request。salary は入力時だけ存在し、保存時に除外されていた。 */
const hearingSheetFormV1InputSchema = z
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
  })
  .strict();

const optionalProfileRequestFields = {
  usagePurpose: hearingUsagePurposeSchema.nullish().default(null),
  expertise: hearingExpertiseSchema.nullish().default(null),
  role: hearingRoleSchema.nullish().default(null),
  context: hearingContextSchema.nullish().default(null),
  motivation: hearingMotivationSchema.nullish().default(null),
  sharingIntent: hearingSharingIntentSchema.nullish().default(null),
  constraintTags: z.array(hearingConstraintTagSchema).max(4).nullish().default(null),
  shareTarget: shortText.nullish().default(null),
  informationSources: z.array(shortText).max(HEARING_SHEET_FORM_LIMITS.informationSources).nullish().default(null),
  trueProblem: requiredText.nullish().default(null),
  knowledgeAssets: z.array(shortText).max(HEARING_SHEET_FORM_LIMITS.knowledgeAssets).nullish().default(null),
} as const;

/**
 * S10 の必須 12 項目 + skill-intake 由来の任意プロファイル 11 項目。
 * 追加項目は未回答を null、回答済みの 0 件を [] とし、旧 12 項目 client も受け付ける。
 * salary はこの request 境界にだけ存在し、snapshot / AI payload には残さない。
 */
export const hearingSheetFormInputSchema = hearingSheetFormV1InputSchema.extend(optionalProfileRequestFields).strict();
export type HearingSheetFormInput = z.output<typeof hearingSheetFormInputSchema>;

/** PR #705 より前に DB form_json / AI payload へ保存された無版 11 項目。 */
const hearingSheetFormSnapshotV1UnversionedSchema = hearingSheetFormV1InputSchema.omit({ salary: true });

/** 旧形式の出自を保持する version 1 契約。 */
export const hearingSheetFormSnapshotV1Schema = hearingSheetFormSnapshotV1UnversionedSchema
  .extend({ schemaVersion: z.literal(1) })
  .strict();
export type HearingSheetFormSnapshotV1 = z.output<typeof hearingSheetFormSnapshotV1Schema>;

export const CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION = 2 as const;

const currentProfileSnapshotFields = {
  usagePurpose: hearingUsagePurposeSchema.nullable(),
  expertise: hearingExpertiseSchema.nullable(),
  role: hearingRoleSchema.nullable(),
  context: hearingContextSchema.nullable(),
  motivation: hearingMotivationSchema.nullable(),
  sharingIntent: hearingSharingIntentSchema.nullable(),
  constraintTags: z.array(hearingConstraintTagSchema).max(4).nullable(),
  shareTarget: shortText.nullable(),
  informationSources: z.array(shortText).max(HEARING_SHEET_FORM_LIMITS.informationSources).nullable(),
  trueProblem: requiredText.nullable(),
  knowledgeAssets: z.array(shortText).max(HEARING_SHEET_FORM_LIMITS.knowledgeAssets).nullable(),
} as const;

/** 現行の保存本体。request の default/optional 解釈と分離し、全キーを明示する。 */
const hearingSheetFormSnapshotV2BodySchema = hearingSheetFormSnapshotV1UnversionedSchema
  .extend(currentProfileSnapshotFields)
  .strict();

const hearingSheetFormSnapshotV2Schema = hearingSheetFormSnapshotV2BodySchema
  .extend({ schemaVersion: z.literal(CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION) })
  .strict();

const hearingSheetFormSnapshotV1NormalizedSchema = hearingSheetFormSnapshotV1UnversionedSchema
  .extend({
    schemaVersion: z.literal(1),
    usagePurpose: z.null(),
    expertise: z.null(),
    role: z.null(),
    context: z.null(),
    motivation: z.null(),
    sharingIntent: z.null(),
    constraintTags: z.null(),
    shareTarget: z.null(),
    informationSources: z.null(),
    trueProblem: z.null(),
    knowledgeAssets: z.null(),
  })
  .strict();

const LEGACY_UNANSWERED_PROFILE = {
  usagePurpose: null,
  expertise: null,
  role: null,
  context: null,
  motivation: null,
  sharingIntent: null,
  constraintTags: null,
  shareTarget: null,
  informationSources: null,
  trueProblem: null,
  knowledgeAssets: null,
} as const;

/** PR #705 初期実装の、追加 2 軸を持たない 20 項目 snapshot 本体。 */
const hearingSheetFormSnapshotInitialV2UnversionedSchema = hearingSheetFormSnapshotV1UnversionedSchema
  .extend({
    usagePurpose: hearingUsagePurposeSchema,
    expertise: hearingExpertiseSchema,
    role: hearingRoleSchema,
    context: hearingContextSchema,
    motivation: hearingMotivationSchema,
    sharingIntent: hearingSharingIntentSchema,
    constraintTags: z.array(hearingConstraintTagSchema).max(4),
    shareTarget: shortText,
    knowledgeAssets: z.array(shortText).max(HEARING_SHEET_FORM_LIMITS.knowledgeAssets),
  })
  .strict();

const hearingSheetFormSnapshotInitialV2Schema = hearingSheetFormSnapshotInitialV2UnversionedSchema
  .extend({ schemaVersion: z.literal(CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION) })
  .strict();

/**
 * DB form_json と AI payload の read 境界。
 *
 * - version 2: 現行 22 項目 + version。version 無しの現行形も version 2 へ読み上げる。
 * - 初期 version 2: informationSources / trueProblem の無い 20 項目は、version 有無を問わず両軸を null として読む。
 * - version 1: 旧 11 項目。追加質問は推測せず null とし、schemaVersion=1 を保持する。
 * - 万一 salary を含む旧 12 項目が残っていても、読取時に salary を破棄する。
 *
 * 出力は必ず schemaVersion を持つため、保存形式が次に変わっても分岐を追加する場所はここだけになる。
 */
export const hearingSheetFormSnapshotSchema = z.union([
  hearingSheetFormSnapshotV2Schema,
  hearingSheetFormSnapshotV2BodySchema.transform((snapshot) => ({
    schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
    ...snapshot,
  })),
  hearingSheetFormSnapshotV1NormalizedSchema,
  hearingSheetFormSnapshotInitialV2Schema.transform((snapshot) => ({
    ...snapshot,
    informationSources: null,
    trueProblem: null,
  })),
  hearingSheetFormSnapshotInitialV2UnversionedSchema.transform((snapshot) => ({
    schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
    ...snapshot,
    informationSources: null,
    trueProblem: null,
  })),
  hearingSheetFormSnapshotV1Schema.transform(({ schemaVersion, ...snapshot }) => ({
    schemaVersion,
    ...snapshot,
    ...LEGACY_UNANSWERED_PROFILE,
  })),
  hearingSheetFormSnapshotV1UnversionedSchema.transform((snapshot) => ({
    schemaVersion: 1 as const,
    ...snapshot,
    ...LEGACY_UNANSWERED_PROFILE,
  })),
  hearingSheetFormV1InputSchema.transform(({ salary: _discardedSalary, ...snapshot }) => ({
    schemaVersion: 1 as const,
    ...snapshot,
    ...LEGACY_UNANSWERED_PROFILE,
  })),
]);
export type HearingSheetFormSnapshot = z.output<typeof hearingSheetFormSnapshotSchema>;

/** 新規 request を salary を含まない version 2 snapshot へ変換する唯一の write 境界。 */
export function createHearingSheetFormSnapshot(input: HearingSheetFormInput): HearingSheetFormSnapshot {
  const { salary: _discardedSalary, ...snapshot } = input;
  return hearingSheetFormSnapshotSchema.parse({
    schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
    ...snapshot,
  });
}

/** 保存済み form_json / queued AI payload を versioned snapshot へ正規化する。 */
export function normalizeHearingSheetFormSnapshot(input: unknown): HearingSheetFormSnapshot {
  return hearingSheetFormSnapshotSchema.parse(input);
}

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
