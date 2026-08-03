/**
 * `POST /api/v1/tenant-data/objects` — アップロード (multipart)。
 * `GET  /api/v1/tenant-data/objects` — 一覧 (cursor pagination)。
 *
 * multipart なのはアップロードだけ (`publish/[id]/package/route.ts` の生バイト列と異なり、
 * ここは metadata + file を同時に受け取る必要があるため)。
 */

import { createRepositoryContext } from '@harness-hub/db';
import {
  problemDetails,
  problemDetailsFromZodError,
  tenantDataObjectListQuerySchema,
  uploadTenantDataMetadataSchema,
} from '@harness-hub/schemas';
import { problemResponse } from '../../../../../features/hearing-intake/http.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';
import { checkTenantDataRateLimit, tenantDataRuntime } from '../../../../../lib/tenant-data/index.js';

/** アップロード本文の上限。security-spec に明示値が無いため、R2 単一 PUT の実用上限に合わせた判断値。 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function contextFor(tenantId: string, workspaceId: string, actorId: string) {
  return createRepositoryContext({ tenantId, workspaceId, actorId });
}

export const POST = withAuthz(
  {
    action: 'tenant-data.upload',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'tenant_data_object_collection' }),
  },
  async (request, authz) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }

    const limit = checkTenantDataRateLimit(authz.resource.tenantId, authz.principal.userId, 'upload', Date.now());
    if (limit.rejection !== null) return limit.rejection;

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return problemResponse(
        problemDetails({
          title: '本文を読み取れません',
          status: 400,
          detail: 'multipart/form-data で送信してください。',
        }),
      );
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return problemResponse(problemDetails({ title: 'file が必要です', status: 400 }));
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return problemResponse(problemDetails({ title: 'ファイルサイズが上限を超えています', status: 413 }));
    }

    const metadataInput = {
      workspaceId: form.get('workspaceId'),
      kind: form.get('kind'),
      title: form.get('title'),
    };
    const parsedMetadata = uploadTenantDataMetadataSchema.safeParse(metadataInput);
    if (!parsedMetadata.success) {
      return problemResponse(
        problemDetailsFromZodError(parsedMetadata.error, { instance: new URL(request.url).pathname }),
      );
    }
    // header の申告 workspace が認可境界の正本 (`requestScopedResource` の方針と同じ)。
    // multipart の workspaceId は表示/契約のための冗長フィールドなので、一致しない要求は弾く。
    if (parsedMetadata.data.workspaceId !== authz.resource.workspaceId) {
      return problemResponse(
        problemDetails({
          title: 'workspaceId が一致しません',
          status: 400,
          detail: 'x-harness-workspace-id と本文の workspaceId を揃えてください。',
        }),
      );
    }

    const runtime = await tenantDataRuntime();
    const plaintext = new Uint8Array(await file.arrayBuffer());
    const row = await runtime.repo.upload(
      contextFor(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      {
        workspaceId: parsedMetadata.data.workspaceId,
        kind: parsedMetadata.data.kind,
        title: parsedMetadata.data.title,
        plaintext,
        uploadedBy: authz.principal.userId,
      },
    );

    return Response.json(
      {
        id: row.id,
        workspace_id: row.workspaceId,
        kind: row.kind,
        title: row.title,
        size_bytes: row.sizeBytes,
        content_hash: row.contentHash,
        uploaded_by: row.uploadedBy,
        created_at: row.createdAt,
      },
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  },
);

export const GET = withAuthz(
  {
    action: 'tenant-data.list',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'tenant_data_object_collection' }),
  },
  async (request, authz) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }

    const limit = checkTenantDataRateLimit(authz.resource.tenantId, authz.principal.userId, 'list', Date.now());
    if (limit.rejection !== null) return limit.rejection;

    const url = new URL(request.url);
    const parsed = tenantDataObjectListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return problemResponse(problemDetailsFromZodError(parsed.error, { instance: url.pathname }));
    }
    if (parsed.data.workspaceId !== authz.resource.workspaceId) {
      return problemResponse(
        problemDetails({
          title: 'workspaceId が一致しません',
          status: 400,
          detail: 'x-harness-workspace-id と query の workspaceId を揃えてください。',
        }),
      );
    }

    const runtime = await tenantDataRuntime();
    const page = await runtime.repo.list(
      contextFor(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      {
        workspaceId: authz.resource.workspaceId,
        ...(parsed.data.kind === undefined ? {} : { kind: parsed.data.kind }),
        ...(parsed.data.cursor === undefined ? {} : { cursor: parsed.data.cursor }),
        limit: parsed.data.limit,
      },
    );

    return Response.json(
      {
        items: page.items.map((row) => ({
          id: row.id,
          workspace_id: row.workspaceId,
          kind: row.kind,
          title: row.title,
          size_bytes: row.sizeBytes,
          content_hash: row.contentHash,
          uploaded_by: row.uploadedBy,
          created_at: row.createdAt,
        })),
        next_cursor: page.nextCursor,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  },
);
