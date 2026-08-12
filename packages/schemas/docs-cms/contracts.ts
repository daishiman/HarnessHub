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
/** ブログ的分類の 1 語 (例: 'release-note')。未分類は null。 */
const categorySchema = z.string().trim().min(1).max(80).nullable();
/** タグは配列で受け渡す (保存表現の JSON 文字列化は repository 層の関心)。 */
const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(20);
const eyecatchImageUrlSchema = z.string().trim().url().max(2_000).nullable();
/** 予約公開の実行予定時刻 (epoch ms)。未来日時のみ許可 — 過去日時は「今すぐ公開」と区別が付かず事故のもと。 */
const publishAtSchema = z.number().int().positive().nullable();

export const documentDetailSchema = z
  .object({
    id: identifierSchema,
    scope: documentScopeSchema,
    title: titleSchema,
    body_markdown: bodyMarkdownSchema,
    status: documentStatusSchema,
    // 既存文書はいずれも未設定 (null) のまま読める。旧クライアントが知らないフィールドとして
    // 無視しても壊れないよう、追加はここまで全て optional 相当 (null 許容) にする。
    category: categorySchema,
    tags: tagsSchema,
    eyecatch_image_url: eyecatchImageUrlSchema,
    publish_at: publishAtSchema,
    created_by: identifierSchema,
    updated_by: identifierSchema,
    created_at: z.number().int().positive(),
    updated_at: z.number().int().positive(),
  })
  .strict();
export type DocumentDetail = z.output<typeof documentDetailSchema>;

export const documentListItemSchema = documentDetailSchema.omit({ body_markdown: true });
export type DocumentListItem = z.output<typeof documentListItemSchema>;

export const documentListQuerySchema = paginationQuerySchema.extend({
  scope: documentScopeSchema.optional(),
  status: documentStatusSchema.optional(),
  category: z.string().trim().min(1).max(80).optional(),
  /**
   * 検索対象は**タイトルのみ**。本文 (body_markdown) は含めない。
   *
   * 本文まで LIKE で舐めると、文書が増えたときに全行走査になるうえ、一覧に出て
   * いない文字列で当たった行が「なぜ出てきたか分からない結果」として並ぶ。
   * 本文を検索対象にするなら全文検索の基盤 (FTS) が要り、それは別の判断になる。
   */
  q: listSearchTermSchema.optional(),
});
export type DocumentListQuery = z.output<typeof documentListQuerySchema>;

export const documentListResponseSchema = paginatedSchema(documentListItemSchema);
export type DocumentListResponse = z.output<typeof documentListResponseSchema>;

export const createDocumentRequestSchema = z
  .object({
    scope: documentScopeSchema,
    title: titleSchema,
    body_markdown: bodyMarkdownSchema.default(''),
    category: categorySchema.optional(),
    tags: tagsSchema.optional(),
    eyecatch_image_url: eyecatchImageUrlSchema.optional(),
    publish_at: publishAtSchema.optional(),
  })
  .strict();
export type CreateDocumentRequest = z.output<typeof createDocumentRequestSchema>;

export const updateDocumentRequestSchema = z
  .object({
    title: titleSchema.optional(),
    body_markdown: bodyMarkdownSchema.optional(),
    status: documentStatusSchema.optional(),
    category: categorySchema.optional(),
    tags: tagsSchema.optional(),
    eyecatch_image_url: eyecatchImageUrlSchema.optional(),
    publish_at: publishAtSchema.optional(),
  })
  .strict();
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
