/**
 * feat-tenant-data-retention の wire 契約 (AD-4: エンドポイント 5 本)。
 *
 * upload の `file` は multipart なので zod では検証しない (route 側が formData から取り出す)。
 * ここで検証するのはメタデータ側 (workspaceId/kind/title) のみ。
 */
import { z } from 'zod';
import { paginatedSchema } from '../src/envelope.js';
import { identifierSchema } from '../src/primitives.js';

export const tenantDataObjectKindSchema = z.enum(['knowledge_doc', 'run_input', 'run_output']);
export type TenantDataObjectKind = z.output<typeof tenantDataObjectKindSchema>;

const titleSchema = z.string().trim().min(1).max(200);

/** `POST /api/v1/tenant-data/objects` のメタデータ部 (multipart のフィールド)。 */
export const uploadTenantDataMetadataSchema = z
  .object({
    workspaceId: identifierSchema,
    kind: tenantDataObjectKindSchema,
    title: titleSchema,
  })
  .strict();
export type UploadTenantDataMetadata = z.output<typeof uploadTenantDataMetadataSchema>;

export const tenantDataObjectSchema = z
  .object({
    id: identifierSchema,
    workspace_id: identifierSchema,
    kind: tenantDataObjectKindSchema,
    title: titleSchema,
    size_bytes: z.number().int().nonnegative(),
    content_hash: z.string().regex(/^[0-9a-f]{64}$/),
    uploaded_by: identifierSchema,
    created_at: z.number().int().nonnegative(),
  })
  .strict();
export type TenantDataObject = z.output<typeof tenantDataObjectSchema>;

/** `GET /api/v1/tenant-data/objects` の query。 */
export const tenantDataObjectListQuerySchema = z
  .object({
    workspaceId: identifierSchema,
    kind: tenantDataObjectKindSchema.optional(),
    cursor: z.string().min(1).max(512).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type TenantDataObjectListQuery = z.output<typeof tenantDataObjectListQuerySchema>;

export const tenantDataObjectListResponseSchema = paginatedSchema(tenantDataObjectSchema);
export type TenantDataObjectListResponse = z.output<typeof tenantDataObjectListResponseSchema>;
