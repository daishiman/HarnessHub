/**
 * `POST /api/v1/sheets/{id}/screenshots` — スクリーンショット添付 (multipart)。
 * `GET  /api/v1/sheets/{id}/screenshots` — 一覧。
 *
 * 認可境界はシートの所有者/workspace (`resolveSheetResource`)。R2 実体・暗号化は
 * `hearing-share` runtime が `tenant-data` と同じ機序 (hearing_screenshot 種別) に委譲する。
 */
import { createRepositoryContext } from '@harness-hub/db';
import { hearingScreenshotSchema, problemDetails } from '@harness-hub/schemas';
import { z } from 'zod';

import {
  findSheetRow,
  resolveSheetResource,
  type SheetParams,
} from '../../../../../../features/hearing-intake/authz-resource.js';
import { problemResponse } from '../../../../../../features/hearing-intake/http.js';
import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import { hearingShareRuntime } from '../../../../../../lib/hearing-share/index.js';
import { normalizeSafeImageContentType, validateSafeImage } from '../../../../../../lib/hearing-share/safe-image.js';
import { checkTenantDataRateLimit } from '../../../../../../lib/tenant-data/index.js';

/** `tenant-data/objects/route.ts` と同じ実用上限 (R2 単一 PUT)。 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const uploadMetadataSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    linkedItem: z.string().trim().min(1).max(200).optional(),
    note: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

function contextFor(tenantId: string, workspaceId: string, actorId: string) {
  return createRepositoryContext({ tenantId, workspaceId, actorId });
}

export const POST = withAuthz<SheetParams>(
  {
    action: 'sheets.screenshots.upload',
    deps: () => authRuntime().authz,
    resolveResource: resolveSheetResource,
  },
  async (request, authz, params) => {
    const sheet = await findSheetRow(authz.resource.tenantId, params.id);
    if (sheet === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }

    // hearing screenshot も tenant-data と同じ R2/暗号化機構を使うため、同じ upload bucket を共有する。
    // limiter の実装・scope を複製せず、principal 単位の総 upload 量として制限する。
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
    // allowlist は arrayBuffer 化より前に見る。unsupported な巨大 payload を追加で複製しない。
    const declaredContentType = normalizeSafeImageContentType(file.type);
    if (declaredContentType === null) {
      return problemResponse(
        problemDetails({
          title: '対応していない画像形式です',
          status: 400,
          detail: 'PNG、JPEG、WebP を指定してください。',
        }),
      );
    }

    const linkedItemRaw = form.get('linkedItem');
    const noteRaw = form.get('note');
    const metadataInput = {
      title: form.get('title'),
      ...(typeof linkedItemRaw === 'string' && linkedItemRaw.length > 0 ? { linkedItem: linkedItemRaw } : {}),
      ...(typeof noteRaw === 'string' && noteRaw.length > 0 ? { note: noteRaw } : {}),
    };
    const parsedMetadata = uploadMetadataSchema.safeParse(metadataInput);
    if (!parsedMetadata.success) {
      return problemResponse(problemDetails({ title: 'title が不正です', status: 400 }));
    }

    // size/MIME/metadata が安価な検査を通った後に 1 度だけ buffer 化する。
    // File.type は利用者が申告できるため、実バイトの signature/container と必ず突き合わせる。
    const plaintext = new Uint8Array(await file.arrayBuffer());
    const validatedImage = validateSafeImage(declaredContentType, plaintext);
    if (!validatedImage.ok) {
      return problemResponse(
        problemDetails({
          title: '画像ファイルの内容が不正です',
          status: 400,
          detail: '拡張子や MIME ではなく、PNG、JPEG、WebP の実データを送信してください。',
        }),
      );
    }

    const runtime = await hearingShareRuntime();
    const context = contextFor(authz.resource.tenantId, sheet.workspaceId, authz.principal.userId);
    const row = await runtime.screenshots.upload(context, {
      workspaceId: sheet.workspaceId,
      sheetId: params.id,
      title: parsedMetadata.data.title,
      linkedItem: parsedMetadata.data.linkedItem ?? null,
      note: parsedMetadata.data.note ?? null,
      contentType: validatedImage.contentType,
      plaintext,
      uploadedBy: authz.principal.userId,
    });

    return Response.json(
      hearingScreenshotSchema.parse({
        id: row.id,
        title: row.title,
        linked_item: row.linkedItem,
        note: row.note,
        size_bytes: plaintext.byteLength,
        content_type: row.contentType,
        created_at: row.createdAt,
      }),
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  },
);

export const GET = withAuthz<SheetParams>(
  {
    action: 'sheets.screenshots.read',
    deps: () => authRuntime().authz,
    resolveResource: resolveSheetResource,
  },
  async (_request, authz, params) => {
    const sheet = await findSheetRow(authz.resource.tenantId, params.id);
    if (sheet === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }

    // 一覧も同じ tenant-data read budget に合流させ、別 limiter/scope は増やさない。
    const limit = checkTenantDataRateLimit(authz.resource.tenantId, authz.principal.userId, 'read', Date.now());
    if (limit.rejection !== null) return limit.rejection;

    const runtime = await hearingShareRuntime();
    const context = createRepositoryContext({ tenantId: authz.resource.tenantId });
    const rows = await runtime.screenshots.listBySheetId(context, params.id);

    const items = await Promise.all(
      rows.map(async (row) => {
        const object = await runtime.tenantData.findById(context, row.tenantDataObjectId);
        return hearingScreenshotSchema.parse({
          id: row.id,
          title: row.title,
          linked_item: row.linkedItem,
          note: row.note,
          size_bytes: object?.sizeBytes ?? 0,
          content_type: row.contentType,
          created_at: row.createdAt,
        });
      }),
    );

    return Response.json({ items }, { headers: { 'cache-control': 'no-store' } });
  },
);
