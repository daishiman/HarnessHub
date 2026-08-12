import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';
import { problemResponse } from '../../../../../../features/docs-cms/http.js';
import { docsImagesRuntime } from '../../../../../../features/docs-cms/image-runtime.js';
import { createDocsImageService, MAX_IMAGE_BYTES } from '../../../../../../features/docs-cms/image-service.js';
import { docsCmsRuntime } from '../../../../../../features/docs-cms/runtime.js';
import { AuthzError, authRuntime, requestScopedResource, withAuthz } from '../../../../../../lib/authz/index.js';

interface DocParams {
  readonly id: string;
}

/**
 * ドキュメント本文への画像アップロード。
 * 認可は対象ドキュメントの scope に応じて PATCH ([id]/route.ts) と同じ 2 段ゲート
 * (docs.write_tenant を最低ゲート、common scope はさらに docs.write_common) を再利用する。
 */
export const POST = withAuthz<DocParams>(
  {
    action: 'docs.write_tenant',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => requestScopedResource(request, { type: 'document', id: params.id }),
  },
  async (request, authz, params) => {
    const existing = await docsCmsRuntime().repository.getDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      params.id,
    );
    if (existing === null) {
      return problemResponse(problemDetails({ title: 'ドキュメントが見つかりません', status: 404 }));
    }
    if (existing.scope === 'common' && !authz.can('docs.write_common')) {
      throw new AuthzError('insufficient_role', 403);
    }

    const contentType = request.headers.get('content-type');
    const contentLength = Number(request.headers.get('content-length') ?? 'NaN');
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      return problemResponse(
        problemDetails({
          title: '画像サイズが大きすぎます',
          status: 413,
          detail: `上限は ${MAX_IMAGE_BYTES / (1024 * 1024)}MB です。`,
        }),
      );
    }

    const buffer = new Uint8Array(await request.arrayBuffer());
    const { bucket } = await docsImagesRuntime();
    const service = createDocsImageService(bucket);
    const result = await service.upload(authz.resource.tenantId, existing.id, contentType ?? '', buffer);
    if (!result.ok) {
      const status = result.error.code === 'payload_too_large' ? 413 : 415;
      return problemResponse(problemDetails({ title: result.error.message, status }));
    }

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'docs.image.upload',
      resourceType: 'document',
      resourceId: existing.id,
      metadata: { imageId: result.imageId, credential: authz.principal.credential },
    });

    return Response.json(
      {
        image_id: result.imageId,
        url: `/api/v1/docs/${existing.id}/images/${result.imageId}`,
      },
      { status: 201 },
    );
  },
);
