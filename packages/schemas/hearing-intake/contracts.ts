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

/**
 * 優先度は実務では高/中/低の3段階では粒度が粗く、依頼者要件により5段階へ拡張した。
 * 既存の high/medium/low は変更せず、urgent (緊急) / someday (いつか対応) を追加のみ行う
 * (旧データとの後方互換性を壊さないため)。
 */
export const hearingPrioritySchema = z.enum(['urgent', 'high', 'medium', 'low', 'someday']);
export type HearingPriority = z.output<typeof hearingPrioritySchema>;

/**
 * skill-intake プラグイン（深掘りヒアリング用サブエージェント群）が集める軸のうち、
 * クリックで完結できるものをヒアリングシートの選択式項目として取り込んだもの。
 * 由来: .claude/agents/skill-intake-user-profiler.md（6 軸プロファイル）、
 * plugins/skill-intake/skills/run-intake-next-action/references/mode-catalog.md（用途分岐）。
 *
 * `unknown` はどの軸にも例外なく足す (依頼者追加要件: 「不明・わからない」を選べない項目を残さない)。
 * 未回答を空欄で握りつぶさず、値として記録して後段 (要ヒアリング項目抽出) が拾えるようにするため。
 */
// 各 enum とも既存値は変更・削除せず末尾へ追加のみ行う (旧データとの後方互換性を壊さないため)。
// 1画面でスクロールなしに見渡せる分量として、各項目 7〜9個程度 (「不明・わからない」を含む) を目安にする。
export const hearingUsagePurposeSchema = z.enum([
  'app_development',
  'harness_development',
  'system_development',
  'data_analysis',
  'document_creation',
  'customer_support',
  'other',
  'unknown',
]);
export type HearingUsagePurpose = z.output<typeof hearingUsagePurposeSchema>;

export const hearingExpertiseSchema = z.enum(['novice', 'intermediate', 'expert', 'unknown']);
export type HearingExpertise = z.output<typeof hearingExpertiseSchema>;

export const hearingRoleSchema = z.enum([
  'individual',
  'employee',
  'executive',
  'creator',
  'team_lead',
  'freelancer',
  'unknown',
]);
export type HearingRole = z.output<typeof hearingRoleSchema>;

export const hearingContextSchema = z.enum([
  'business',
  'personal',
  'study',
  'hobby',
  'side_business',
  'nonprofit',
  'unknown',
]);
export type HearingContext = z.output<typeof hearingContextSchema>;

export const hearingMotivationSchema = z.enum([
  'efficiency',
  'quality',
  'learning',
  'branding',
  'cost_reduction',
  'risk_reduction',
  'unknown',
]);
export type HearingMotivation = z.output<typeof hearingMotivationSchema>;

export const hearingSharingIntentSchema = z.enum([
  'self',
  'small_group',
  'public',
  'customer',
  'department',
  'partner_company',
  'unknown',
]);
export type HearingSharingIntent = z.output<typeof hearingSharingIntentSchema>;

/** 複数選択タグ。`unknown` を選ぶと他タグと排他 (UI 側で強制) — 「制約はあるが種類が分からない」を表す。 */
export const hearingConstraintTagSchema = z.enum(['time', 'budget', 'authority', 'knowledge', 'unknown']);
export type HearingConstraintTag = z.output<typeof hearingConstraintTagSchema>;

/**
 * よくある要望パターン (依頼者追加要件 1通目 #3)。クリックだけで「何を作りたいか」の大枠を伝えられるようにする。
 */
export const hearingRequestPatternSchema = z.enum(['integration', 'automation', 'data_digitization', 'unknown']);
export type HearingRequestPattern = z.output<typeof hearingRequestPatternSchema>;

/** 連携したい外部ツール。選択肢に無いものは other + 自由入力 (integrationToolsOther) で拾う。 */
export const hearingIntegrationToolSchema = z.enum([
  'slack',
  'notion',
  'gmail',
  'google_calendar',
  'chat_tool_other',
  'file_storage',
  'other',
]);
export type HearingIntegrationTool = z.output<typeof hearingIntegrationToolSchema>;

/** 仕組み化したい既存データの種類。 */
export const hearingExistingDataSourceSchema = z.enum([
  'spreadsheet',
  'paper_documents',
  'email',
  'database',
  'none',
  'other',
]);
export type HearingExistingDataSource = z.output<typeof hearingExistingDataSourceSchema>;

/** FormData の文字数・件数上限。zod schema と wizard 前段判定の共有正本。 */
export const HEARING_SHEET_FORM_LIMITS = {
  requiredTextLength: 2_000,
  shortTextLength: 200,
  informationSources: 10,
  knowledgeAssets: 10,
} as const;

const requiredText = z.string().trim().min(1).max(HEARING_SHEET_FORM_LIMITS.requiredTextLength);
const shortText = z.string().trim().min(1).max(HEARING_SHEET_FORM_LIMITS.shortTextLength);
const optionalLongText = z.string().trim().min(1).max(HEARING_SHEET_FORM_LIMITS.requiredTextLength).optional();
const optionalShortText = z.string().trim().min(1).max(HEARING_SHEET_FORM_LIMITS.shortTextLength).optional();
const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(HEARING_SHEET_FORM_LIMITS.requiredTextLength)
  .refine((value) => value.toLowerCase().startsWith('https://'), 'URL は https:// で始めてください');

/** 参考 URL 一覧項目 (依頼者追加要件 1通目 #4)。note は任意の一言メモ。 */
export const hearingReferenceUrlSchema = z
  .object({
    url: httpsUrl,
    note: optionalShortText,
  })
  .strict();
export type HearingReferenceUrl = z.output<typeof hearingReferenceUrlSchema>;

interface FormRelationshipFields {
  readonly constraintTags: readonly HearingConstraintTag[];
  readonly knowledgeAssets: readonly string[];
  readonly requestPatterns: readonly HearingRequestPattern[];
  readonly integrationTools: readonly HearingIntegrationTool[];
  readonly integrationToolsOther?: string | undefined;
  readonly automationDescription?: string | undefined;
  readonly existingDataSources: readonly HearingExistingDataSource[];
  readonly existingDataSourcesOther?: string | undefined;
  readonly referenceUrls: readonly HearingReferenceUrl[];
}

interface FormRefinementContext {
  addIssue(issue: { readonly code: 'custom'; readonly message: string; readonly path: PropertyKey[] }): void;
}

function addDuplicateIssue<T>(
  values: readonly T[],
  path: string,
  context: FormRefinementContext,
  toKey: (value: T) => string = (value) => String(value),
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const key = toKey(value);
    if (seen.has(key)) {
      context.addIssue({ code: 'custom', path: [path], message: '同じ値を重複して指定できません' });
      return;
    }
    seen.add(key);
  }
}

/** UI の表示状態に依存せず、API 境界で親子関係と排他制約を固定する。 */
function validateFormRelationships(form: FormRelationshipFields, context: FormRefinementContext): void {
  addDuplicateIssue(form.constraintTags, 'constraintTags', context);
  addDuplicateIssue(form.knowledgeAssets, 'knowledgeAssets', context);
  addDuplicateIssue(form.requestPatterns, 'requestPatterns', context);
  addDuplicateIssue(form.integrationTools, 'integrationTools', context);
  addDuplicateIssue(form.existingDataSources, 'existingDataSources', context);
  addDuplicateIssue(form.referenceUrls, 'referenceUrls', context, (item) => item.url);

  if (form.constraintTags.includes('unknown') && form.constraintTags.length > 1) {
    context.addIssue({
      code: 'custom',
      path: ['constraintTags'],
      message: '「不明・わからない」は他の制約と同時に指定できません',
    });
  }
  if (form.requestPatterns.includes('unknown') && form.requestPatterns.length > 1) {
    context.addIssue({
      code: 'custom',
      path: ['requestPatterns'],
      message: '「不明・わからない」は他の要望パターンと同時に指定できません',
    });
  }

  const hasIntegration = form.requestPatterns.includes('integration');
  if (hasIntegration && form.integrationTools.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['integrationTools'],
      message: '「ツール同士を連携」を選んだ場合は連携先を1件以上指定してください',
    });
  }
  if (!hasIntegration && (form.integrationTools.length > 0 || form.integrationToolsOther !== undefined)) {
    context.addIssue({
      code: 'custom',
      path: ['integrationTools'],
      message: '連携先は「ツール同士を連携」を選んだ場合だけ指定できます',
    });
  }
  const hasOtherIntegration = form.integrationTools.includes('other');
  if (hasOtherIntegration !== (form.integrationToolsOther !== undefined)) {
    context.addIssue({
      code: 'custom',
      path: ['integrationToolsOther'],
      message: '「その他」の選択と補足入力を一致させてください',
    });
  }

  const hasAutomation = form.requestPatterns.includes('automation');
  if (!hasAutomation && form.automationDescription !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['automationDescription'],
      message: '自動化の補足は「作業を自動化」を選んだ場合だけ指定できます',
    });
  }

  const hasDataDigitization = form.requestPatterns.includes('data_digitization');
  if (hasDataDigitization && form.existingDataSources.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['existingDataSources'],
      message: '「既存データを仕組み化」を選んだ場合はデータ種別を1件以上指定してください',
    });
  }
  if (!hasDataDigitization && (form.existingDataSources.length > 0 || form.existingDataSourcesOther !== undefined)) {
    context.addIssue({
      code: 'custom',
      path: ['existingDataSources'],
      message: 'データ種別は「既存データを仕組み化」を選んだ場合だけ指定できます',
    });
  }
  if (form.existingDataSources.includes('none') && form.existingDataSources.length > 1) {
    context.addIssue({
      code: 'custom',
      path: ['existingDataSources'],
      message: '「該当なし」は他のデータ種別と同時に指定できません',
    });
  }
  const hasOtherDataSource = form.existingDataSources.includes('other');
  if (hasOtherDataSource !== (form.existingDataSourcesOther !== undefined)) {
    context.addIssue({
      code: 'custom',
      path: ['existingDataSourcesOther'],
      message: '「その他」の選択と補足入力を一致させてください',
    });
  }
}

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

/**
 * skill-intake 由来の用途プロファイル 9 項目 (PR #705)。すべて必須選択式で、
 * `unknown` を選べば「不明・わからない」を明示的に回答として記録できる
 * (依頼者追加要件: 未回答を空欄で握りつぶさない)。
 */
const coreProfileFields = {
  usagePurpose: hearingUsagePurposeSchema,
  expertise: hearingExpertiseSchema,
  role: hearingRoleSchema,
  context: hearingContextSchema,
  motivation: hearingMotivationSchema,
  sharingIntent: hearingSharingIntentSchema,
  constraintTags: z.array(hearingConstraintTagSchema).max(5).default([]),
  shareTarget: shortText,
  knowledgeAssets: z.array(shortText).min(1).max(HEARING_SHEET_FORM_LIMITS.knowledgeAssets),
} as const;

/** PR #705 で追加された、まだ UI 未実装の任意プロファイル 2 項目。旧クライアントは省略可能。 */
const optionalProfileFields = {
  informationSources: z.array(shortText).max(HEARING_SHEET_FORM_LIMITS.informationSources).nullish().default(null),
  trueProblem: requiredText.nullish().default(null),
} as const;

/** 要望パターン・連携先・参考 URL 等 (依頼者追加要件 1通目 #3, #4)。 */
const requestPatternFields = {
  requestPatterns: z.array(hearingRequestPatternSchema).max(4).default([]),
  integrationTools: z.array(hearingIntegrationToolSchema).max(10).default([]),
  integrationToolsOther: optionalShortText,
  automationDescription: optionalLongText,
  existingDataSources: z.array(hearingExistingDataSourceSchema).max(10).default([]),
  existingDataSourcesOther: optionalShortText,
  referenceUrls: z.array(hearingReferenceUrlSchema).max(10).default([]),
} as const;

/**
 * S10 の必須 12 項目 + skill-intake 由来の用途プロファイル 9 項目 + 要望パターン系 7 項目。
 * salary はこの request 境界だけに存在する。
 */
const hearingSheetFormInputObjectSchema = hearingSheetFormV1InputSchema
  .extend(coreProfileFields)
  .extend(optionalProfileFields)
  .extend(requestPatternFields)
  .strict();
export const hearingSheetFormInputSchema = hearingSheetFormInputObjectSchema.superRefine(validateFormRelationships);
export type HearingSheetFormInput = z.output<typeof hearingSheetFormInputSchema>;

/** PR #705 より前に DB form_json / AI payload へ保存された無版 11 項目。 */
const hearingSheetFormSnapshotV1UnversionedSchema = hearingSheetFormV1InputSchema.omit({ salary: true });

/** 旧形式の出自を保持する version 1 契約。 */
export const hearingSheetFormSnapshotV1Schema = hearingSheetFormSnapshotV1UnversionedSchema
  .extend({ schemaVersion: z.literal(1) })
  .strict();
export type HearingSheetFormSnapshotV1 = z.output<typeof hearingSheetFormSnapshotV1Schema>;

/** PR #705 初期実装の、追加 2 軸 (informationSources/trueProblem) を持たない 20 項目 snapshot 本体。 */
const hearingSheetFormSnapshotInitialV2UnversionedSchema = hearingSheetFormSnapshotV1UnversionedSchema
  .extend(coreProfileFields)
  .strict();
const hearingSheetFormSnapshotInitialV2Schema = hearingSheetFormSnapshotInitialV2UnversionedSchema
  .extend({ schemaVersion: z.literal(2) })
  .strict();

/** PR #705 マージ後、informationSources/trueProblem を追加した nullable 22 項目 (プロファイル軸のみ nullable)。 */
const currentProfileSnapshotFieldsNullable = {
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
const hearingSheetFormSnapshotV2BodySchema = hearingSheetFormSnapshotV1UnversionedSchema
  .extend(currentProfileSnapshotFieldsNullable)
  .strict();
const hearingSheetFormSnapshotV2Schema = hearingSheetFormSnapshotV2BodySchema
  .extend({ schemaVersion: z.literal(2) })
  .strict();

export const CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION = 3 as const;

/** 現行の保存本体 (version 3)。要望パターン系 7 項目を追加し、プロファイル軸は再び必須 (`unknown` で明示回答)。 */
const hearingSheetFormSnapshotV3BodySchema = hearingSheetFormSnapshotV1UnversionedSchema
  .extend(coreProfileFields)
  .extend(optionalProfileFields)
  .extend(requestPatternFields)
  .strict();
const hearingSheetFormSnapshotV3Schema = hearingSheetFormSnapshotV3BodySchema
  .extend({ schemaVersion: z.literal(CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION) })
  .strict();

const legacyUnknownText = '不明・わからない';

/** 要望パターン系 7 項目の未回答値。version 2 以前のデータには存在しない。 */
const UNANSWERED_REQUEST_PATTERN_FIELDS: {
  readonly requestPatterns: readonly HearingRequestPattern[];
  readonly integrationTools: readonly HearingIntegrationTool[];
  readonly integrationToolsOther: string | undefined;
  readonly automationDescription: string | undefined;
  readonly existingDataSources: readonly HearingExistingDataSource[];
  readonly existingDataSourcesOther: string | undefined;
  readonly referenceUrls: readonly HearingReferenceUrl[];
} = {
  requestPatterns: [],
  integrationTools: [],
  integrationToolsOther: undefined,
  automationDescription: undefined,
  existingDataSources: [],
  existingDataSourcesOther: undefined,
  referenceUrls: [],
};

/** version 2 (nullable) のプロファイル軸を version 3 (必須 + unknown) へ正規化する。 */
function normalizeNullableProfileToV3(profile: {
  readonly usagePurpose: HearingUsagePurpose | null;
  readonly expertise: HearingExpertise | null;
  readonly role: HearingRole | null;
  readonly context: HearingContext | null;
  readonly motivation: HearingMotivation | null;
  readonly sharingIntent: HearingSharingIntent | null;
  readonly constraintTags: readonly HearingConstraintTag[] | null;
  readonly shareTarget: string | null;
  readonly knowledgeAssets: readonly string[] | null;
}) {
  return {
    usagePurpose: profile.usagePurpose ?? 'unknown',
    expertise: profile.expertise ?? 'unknown',
    role: profile.role ?? 'unknown',
    context: profile.context ?? 'unknown',
    motivation: profile.motivation ?? 'unknown',
    sharingIntent: profile.sharingIntent ?? 'unknown',
    constraintTags: profile.constraintTags ?? [],
    shareTarget: profile.shareTarget ?? legacyUnknownText,
    knowledgeAssets:
      profile.knowledgeAssets && profile.knowledgeAssets.length > 0 ? profile.knowledgeAssets : [legacyUnknownText],
  } as const;
}

const LEGACY_UNANSWERED_PROFILE_V3: {
  readonly usagePurpose: HearingUsagePurpose;
  readonly expertise: HearingExpertise;
  readonly role: HearingRole;
  readonly context: HearingContext;
  readonly motivation: HearingMotivation;
  readonly sharingIntent: HearingSharingIntent;
  readonly constraintTags: readonly HearingConstraintTag[];
  readonly shareTarget: string;
  readonly informationSources: null;
  readonly trueProblem: null;
  readonly knowledgeAssets: readonly string[];
} & typeof UNANSWERED_REQUEST_PATTERN_FIELDS = {
  usagePurpose: 'unknown',
  expertise: 'unknown',
  role: 'unknown',
  context: 'unknown',
  motivation: 'unknown',
  sharingIntent: 'unknown',
  constraintTags: [],
  shareTarget: legacyUnknownText,
  informationSources: null,
  trueProblem: null,
  knowledgeAssets: [legacyUnknownText],
  ...UNANSWERED_REQUEST_PATTERN_FIELDS,
};

/**
 * DB form_json と AI payload の read 境界。
 *
 * - version 3 (現行): 必須プロファイル 9 項目 (`unknown` 明示回答) + 要望パターン系 7 項目。
 * - version 2: PR #705 の nullable プロファイル 9 項目 + informationSources/trueProblem。
 *   null は version 3 へ正規化する際 `unknown` (プロファイル軸) / [] (要望パターン系) として読む。
 * - 初期 version 2: informationSources/trueProblem の無い 20 項目 (プロファイル軸は必須)。
 * - version 1: 旧 11 項目。追加質問は推測せず `unknown`/null として読み、要望パターン系は空とする。
 * - 万一 salary を含む旧 12 項目が残っていても、読取時に salary を破棄する。
 *
 * 出力は必ず schemaVersion を持ち、常に現行 (version 3) の形へ正規化される。
 */
export const hearingSheetFormSnapshotSchema = z
  .union([
    hearingSheetFormSnapshotV3Schema,
    hearingSheetFormSnapshotV3BodySchema.transform((snapshot) => ({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...snapshot,
    })),
    hearingSheetFormSnapshotV2Schema.transform(({ schemaVersion: _discarded, ...snapshot }) => ({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...snapshot,
      ...normalizeNullableProfileToV3(snapshot),
      ...UNANSWERED_REQUEST_PATTERN_FIELDS,
    })),
    hearingSheetFormSnapshotV2BodySchema.transform((snapshot) => ({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...snapshot,
      ...normalizeNullableProfileToV3(snapshot),
      ...UNANSWERED_REQUEST_PATTERN_FIELDS,
    })),
    hearingSheetFormSnapshotInitialV2Schema.transform(({ schemaVersion: _discarded, ...snapshot }) => ({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...snapshot,
      informationSources: null,
      trueProblem: null,
      ...UNANSWERED_REQUEST_PATTERN_FIELDS,
    })),
    hearingSheetFormSnapshotInitialV2UnversionedSchema.transform((snapshot) => ({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...snapshot,
      informationSources: null,
      trueProblem: null,
      ...UNANSWERED_REQUEST_PATTERN_FIELDS,
    })),
    hearingSheetFormSnapshotV1Schema.transform(({ schemaVersion: _discarded, ...snapshot }) => ({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...snapshot,
      ...LEGACY_UNANSWERED_PROFILE_V3,
    })),
    hearingSheetFormSnapshotV1UnversionedSchema.transform((snapshot) => ({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...snapshot,
      ...LEGACY_UNANSWERED_PROFILE_V3,
    })),
    hearingSheetFormV1InputSchema.transform(({ salary: _discardedSalary, ...snapshot }) => ({
      schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
      ...snapshot,
      ...LEGACY_UNANSWERED_PROFILE_V3,
    })),
  ])
  .superRefine((snapshot, context) => validateFormRelationships(snapshot, context));
export type HearingSheetFormSnapshot = z.output<typeof hearingSheetFormSnapshotSchema>;

/** 新規 request を salary を含まない version 3 snapshot へ変換する唯一の write 境界。 */
export function createHearingSheetFormSnapshot(input: HearingSheetFormInput): HearingSheetFormSnapshot {
  const { salary: _discardedSalary, ...snapshot } = input;
  return hearingSheetFormSnapshotSchema.parse({
    schemaVersion: CURRENT_HEARING_SHEET_FORM_SNAPSHOT_VERSION,
    ...snapshot,
  });
}

/** 保存済み form_json / queued AI payload を現行 (version 3) snapshot へ正規化する (読取境界)。 */
export function normalizeHearingSheetFormSnapshot(input: unknown): HearingSheetFormSnapshot {
  return decodeStoredHearingSheetFormSnapshot(input);
}

export function decodeStoredHearingSheetFormSnapshot(input: unknown): HearingSheetFormSnapshot {
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

/** ai_jobs.payload_json の読取専用 decoder。form の legacy 差だけを吸収し、envelope は厳格に保つ。 */
export const storedSheetGenerationPayloadSchema = sheetGenerationPayloadSchema.extend({
  form: hearingSheetFormSnapshotSchema,
});

export function decodeStoredSheetGenerationPayload(input: unknown): SheetGenerationPayload {
  return storedSheetGenerationPayloadSchema.parse(input);
}

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

/**
 * スクリーンショット添付 (依頼者追加要件 1通目 #4)。
 * `linkedItem` は「どのヒアリング項目に紐づく画像か」の自由記述ラベル (例: 「参考URL A の画面」)。
 */
export const hearingScreenshotMetadataSchema = z
  .object({
    linkedItem: optionalShortText,
    note: optionalShortText,
  })
  .strict();
export type HearingScreenshotMetadata = z.output<typeof hearingScreenshotMetadataSchema>;

export const hearingScreenshotSchema = z
  .object({
    id: identifierSchema,
    title: shortText,
    linked_item: z.string().max(200).nullable(),
    note: z.string().max(200).nullable(),
    size_bytes: z.number().int().nonnegative(),
    content_type: z.string().max(100),
    created_at: z.number().int().nonnegative(),
  })
  .strict();
export type HearingScreenshot = z.output<typeof hearingScreenshotSchema>;

export const hearingScreenshotListResponseSchema = z
  .object({
    items: z.array(hearingScreenshotSchema),
  })
  .strict();
export type HearingScreenshotListResponse = z.output<typeof hearingScreenshotListResponseSchema>;

/**
 * 受け渡し用トークン (依頼者追加要件 2通目、API 方式)。
 * audience で HarnessCreator 向け/システム開発向けの指示文を出し分ける。
 */
export const hearingShareTokenAudienceSchema = z.enum(['harness_creator', 'system_orchestrator']);
export type HearingShareTokenAudience = z.output<typeof hearingShareTokenAudienceSchema>;

// Repository/UI の共通日時契約は epoch milliseconds。秒値（約10桁）を誤って渡すと
// 1970年表示や期限判定の取り違えになるため、2000年以降のms値として境界で固定する。
const epochMillisecondsSchema = z.number().int().min(946_684_800_000).max(8_640_000_000_000_000);

export const issueHearingShareTokenRequestSchema = z
  .object({
    audience: hearingShareTokenAudienceSchema,
  })
  .strict();
export type IssueHearingShareTokenRequest = z.output<typeof issueHearingShareTokenRequestSchema>;

/** token は発行応答にしか現れない平文 (DB にはハッシュのみ保存)。 */
export const issueHearingShareTokenResponseSchema = z
  .object({
    id: identifierSchema,
    token: z.string().min(32),
    url: z.string().url(),
    instruction_text: z.string().min(1).max(4_000),
    audience: hearingShareTokenAudienceSchema,
    expires_at: epochMillisecondsSchema,
  })
  .strict();
export type IssueHearingShareTokenResponse = z.output<typeof issueHearingShareTokenResponseSchema>;

export const hearingShareTokenListItemSchema = z
  .object({
    id: identifierSchema,
    audience: hearingShareTokenAudienceSchema,
    expires_at: epochMillisecondsSchema,
    revoked_at: epochMillisecondsSchema.nullable(),
    last_accessed_at: epochMillisecondsSchema.nullable(),
    access_count: z.number().int().nonnegative(),
    created_at: epochMillisecondsSchema,
  })
  .strict();
export type HearingShareTokenListItem = z.output<typeof hearingShareTokenListItemSchema>;

export const hearingShareTokenListResponseSchema = z
  .object({
    items: z.array(hearingShareTokenListItemSchema),
  })
  .strict();
export type HearingShareTokenListResponse = z.output<typeof hearingShareTokenListResponseSchema>;

export const HEARING_HANDOFF_TEXT_MAX_LENGTH = 20_000 as const;
export const HEARING_HANDOFF_TEXT_SOURCE_MAX_LENGTH = 500_000 as const;
export const HEARING_HANDOFF_TEXT_TRUNCATION_MARKER = '\n\n[以降は文字数上限のため省略されました]';

/**
 * generated section の契約上限が合計 20,000 文字を超えても、公開応答全体を失敗させない。
 * 省略位置を明示し、返却値が常に handoff_text の wire 上限内へ収まるようにする。
 */
export function truncateHearingHandoffText(input: string): string {
  if (input.length <= HEARING_HANDOFF_TEXT_MAX_LENGTH) return input;
  const retainedLength = HEARING_HANDOFF_TEXT_MAX_LENGTH - HEARING_HANDOFF_TEXT_TRUNCATION_MARKER.length;
  return `${input.slice(0, retainedLength)}${HEARING_HANDOFF_TEXT_TRUNCATION_MARKER}`;
}

/**
 * `GET /api/hearing/{token}` の公開応答。トークンが有効な間だけ返す (formSnapshot は salary を含まない)。
 * screenshots は同じトークンでスコープされたダウンロード URL のみを返し、公開 R2 URL は含めない。
 */
export const hearingSharePayloadSchema = z
  .object({
    sheet_code: z.string().regex(/^HS-\d{4,}$/),
    audience: hearingShareTokenAudienceSchema,
    form_snapshot: hearingSheetFormSnapshotSchema,
    estimate_snapshot: hearingSheetEstimateSchema,
    generated_sections: generatedSectionsSchema.nullable(),
    reference_urls: z.array(hearingReferenceUrlSchema),
    screenshots: z.array(
      z
        .object({
          id: identifierSchema,
          title: shortText,
          linked_item: z.string().max(200).nullable(),
          note: z.string().max(200).nullable(),
          download_url: z.string().url(),
        })
        .strict(),
    ),
    handoff_text: z.string().min(1).max(HEARING_HANDOFF_TEXT_SOURCE_MAX_LENGTH).transform(truncateHearingHandoffText),
    expires_at: epochMillisecondsSchema,
  })
  .strict();
export type HearingSharePayload = z.output<typeof hearingSharePayloadSchema>;
