/** Studio S15/B7: Document CMS の wire 契約。 */
import { z } from 'zod';
import { paginatedSchema } from '../src/envelope.js';
import { identifierSchema, listSearchTermSchema, paginationQuerySchema } from '../src/primitives.js';

export const documentScopeSchema = z.enum(['common', 'tenant']);
export type DocumentScope = z.output<typeof documentScopeSchema>;

export const documentStatusSchema = z.enum(['draft', 'published']);
export type DocumentStatus = z.output<typeof documentStatusSchema>;

const titleSchema = z.string().trim().min(1).max(200);
const bodyMarkdownSchema = z.string().max(200_000);

/** 応答では cron 実行待ちで過去になった予約も読める。 */
const publishAtSchema = z.number().int().safe().positive().nullable();

/** 作成・更新で新しく設定する予約日時は、受理時点より未来だけを許可する。 */
const futurePublishAtSchema = publishAtSchema.refine(
  (value) => value === null || value > Date.now(),
  'publish_at は現在より未来の日時を指定してください',
);

export const documentFieldSourceSchema = z.enum(['auto', 'manual']);
export type DocumentFieldSource = z.output<typeof documentFieldSourceSchema>;

const categorySchema = z.string().trim().min(1).max(80);
/** JSON 配列文字列 (例 `["設計","API"]`) を wire 上では素直な文字列配列として扱う。 */
const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(20);
const absoluteHttpImageUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === 'https:' || protocol === 'http:';
    } catch {
      return false;
    }
  }, 'http または https の URL を指定してください');

/**
 * R2 上の認証必須画像は、ブラウザが session cookie を送れる同一 origin の API path で表す。
 * 任意の相対 URL は許可せず、document/image 境界を持つこの route だけを wire 契約にする。
 */
export const documentImageUrlSchema = z.union([
  absoluteHttpImageUrlSchema,
  z
    .string()
    .trim()
    .max(2000)
    .regex(/^\/api\/v1\/docs\/[A-Za-z0-9_-]+\/images\/[A-Za-z0-9-]+\.(?:png|jpg|webp|gif)$/),
]);
const thumbnailUrlSchema = documentImageUrlSchema;
const excerptSchema = z.string().trim().max(400);
export const assetSummarySchema = z
  .object({
    image_count: z.number().int().min(0),
    has_table: z.boolean(),
    has_code: z.boolean(),
  })
  .strict();
export type AssetSummary = z.output<typeof assetSummarySchema>;

/** 外部同期元を識別する公開 namespace。秘密情報や端末の絶対 path は受け付けない。 */
export const externalDocumentSourceSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/);

/** CLI が repository identity + 相対 path から作る SHA-256 hex。 */
export const externalDocumentIdSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const externalDocumentSyncRequestSchema = z
  .object({
    title: titleSchema,
    body_markdown: bodyMarkdownSchema,
  })
  .strict();
export type ExternalDocumentSyncRequest = z.output<typeof externalDocumentSyncRequestSchema>;
export const documentDetailSchema = z
  .object({
    id: identifierSchema,
    scope: documentScopeSchema,
    title: titleSchema,
    body_markdown: bodyMarkdownSchema,
    status: documentStatusSchema,
    created_by: identifierSchema,
    updated_by: identifierSchema,
    created_at: z.number().int().positive(),
    updated_at: z.number().int().positive(),
    category: categorySchema.nullable(),
    tags: tagsSchema.nullable(),
    thumbnail_url: thumbnailUrlSchema.nullable(),
    thumbnail_source: documentFieldSourceSchema,
    excerpt: excerptSchema.nullable(),
    excerpt_source: documentFieldSourceSchema,
    asset_summary: assetSummarySchema.nullable(),
    publish_at: publishAtSchema,
  })
  .strict();
export type DocumentDetail = z.output<typeof documentDetailSchema>;

export const externalDocumentSyncResponseSchema = z
  .object({
    document: documentDetailSchema,
    source: externalDocumentSourceSchema,
    external_document_id: externalDocumentIdSchema,
    revision: z.number().int().positive(),
    sync_state: z.enum(['synced', 'modified']),
    outcome: z.enum(['created', 'updated', 'unchanged', 'fetched']),
  })
  .strict();
export type ExternalDocumentSyncResponse = z.output<typeof externalDocumentSyncResponseSchema>;

/**
 * カード表示に要る要約フィールド (thumbnail_url/excerpt/category/tags/asset_summary/status) は含めつつ、
 * 一覧応答を重くする body_markdown だけ外す。
 */
export const documentListItemSchema = documentDetailSchema.omit({ body_markdown: true });
export type DocumentListItem = z.output<typeof documentListItemSchema>;

export const documentListQuerySchema = paginationQuerySchema.extend({
  scope: documentScopeSchema.optional(),
  status: documentStatusSchema.optional(),
  /**
   * 検索対象は**タイトルのみ**。本文 (body_markdown) は含めない。
   *
   * 本文まで LIKE で舐めると、文書が増えたときに全行走査になるうえ、一覧に出て
   * いない文字列で当たった行が「なぜ出てきたか分からない結果」として並ぶ。
   * 本文を検索対象にするなら全文検索の基盤 (FTS) が要り、それは別の判断になる。
   */
  q: listSearchTermSchema.optional(),
  category: categorySchema.optional(),
  tag: z.string().trim().min(1).max(40).optional(),
});
export type DocumentListQuery = z.output<typeof documentListQuerySchema>;

export const documentListResponseSchema = paginatedSchema(documentListItemSchema);
export type DocumentListResponse = z.output<typeof documentListResponseSchema>;

export const createDocumentRequestSchema = z
  .object({
    scope: documentScopeSchema,
    title: titleSchema,
    body_markdown: bodyMarkdownSchema.default(''),
    category: categorySchema.nullable().optional(),
    tags: tagsSchema.nullable().optional(),
    thumbnail_url: thumbnailUrlSchema.nullable().optional(),
    excerpt: excerptSchema.nullable().optional(),
    publish_at: futurePublishAtSchema.optional(),
  })
  .strict();
export type CreateDocumentRequest = z.output<typeof createDocumentRequestSchema>;

export const updateDocumentRequestSchema = z
  .object({
    title: titleSchema.optional(),
    body_markdown: bodyMarkdownSchema.optional(),
    status: documentStatusSchema.optional(),
    category: categorySchema.nullable().optional(),
    tags: tagsSchema.nullable().optional(),
    thumbnail_url: thumbnailUrlSchema.nullable().optional(),
    excerpt: excerptSchema.nullable().optional(),
    publish_at: futurePublishAtSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === 'published' && value.publish_at != null) {
      context.addIssue({
        code: 'custom',
        path: ['publish_at'],
        message: 'status=published と未来の publish_at は同時に指定できません',
      });
    }
  });
export type UpdateDocumentRequest = z.output<typeof updateDocumentRequestSchema>;

/** ADR §4 の doc_draft AI payload/result。sheet_generation と同じ writeback パターンを踏襲する。 */
export const docDraftPayloadSchema = z
  .object({
    document_id: identifierSchema,
    title: titleSchema,
    outline: z.array(z.string().trim().min(1).max(200)).max(50),
  })
  .strict();
export type DocDraftPayload = z.output<typeof docDraftPayloadSchema>;

export const docDraftResultSchema = z
  .object({
    body_markdown: bodyMarkdownSchema,
  })
  .strict();
export type DocDraftResult = z.output<typeof docDraftResultSchema>;

export const pullDocDraftJobRequestSchema = z
  .object({
    kind: z.literal('doc_draft').default('doc_draft'),
  })
  .strict();
export type PullDocDraftJobRequest = z.output<typeof pullDocDraftJobRequestSchema>;

export const pulledDocDraftJobSchema = z
  .object({
    id: identifierSchema,
    kind: z.literal('doc_draft'),
    payload: docDraftPayloadSchema,
    lease_expires_at: z.number().int().positive(),
  })
  .strict();
export type PulledDocDraftJob = z.output<typeof pulledDocDraftJobSchema>;

export const completeDocDraftJobRequestSchema = docDraftResultSchema;
export type CompleteDocDraftJobRequest = z.output<typeof completeDocDraftJobRequestSchema>;

export const failDocDraftJobRequestSchema = z
  .object({
    error: z.string().trim().min(1).max(4_000),
  })
  .strict();
export type FailDocDraftJobRequest = z.output<typeof failDocDraftJobRequestSchema>;
