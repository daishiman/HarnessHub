import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import { problemResponse } from '../../../../../../../features/docs-cms/http.js';
import { docsImagesRuntime } from '../../../../../../../features/docs-cms/image-runtime.js';
import { createDocsImageService } from '../../../../../../../features/docs-cms/image-service.js';
import { docsCmsRuntime } from '../../../../../../../features/docs-cms/runtime.js';
import { AuthzError, authRuntime, requestScopedResource, withAuthz } from '../../../../../../../lib/authz/index.js';

interface ImageParams {
  readonly id: string;
  readonly imageId: string;
}

/**
 * 画像の取得。docs.read の可視性条件 (scope='common' OR tenant_id=tenant) を documents 行の
 * 取得経由でそのまま踏襲するため、画像も非公開ドキュメントと同じ認証保護下に置かれる。
 * 外部への公開 URL ではない (認証必須)。
 */
export const GET = withAuthz<ImageParams>(
  {
    action: 'docs.read',
    deps: () => authRuntime().authz,
    // <img> は custom tenant header を送れない。docs.read は session 専用かつ documents が
    // workspace_id を持たないため、この browser subresource に限り認証済み閲覧者 tenant を
    // repository の可視性コンテキストとして使う。実 object の所有 tenant は取得した文書行から解決する。
    resolveResource: async (_request, params, principal) => ({
      type: 'document',
      id: params.id,
      tenantId: principal.tenantId,
      workspaceId: null,
      ownerUserId: null,
    }),
  },
  async (_request, authz, params) => {
    const existing = await docsCmsRuntime().repository.getDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      params.id,
    );
    if (existing === null) {
      return problemResponse(problemDetails({ title: 'ドキュメントが見つかりません', status: 404 }));
    }

    const { bucket } = await docsImagesRuntime();
    const service = createDocsImageService(bucket);
    const object = await service.fetch(existing.tenantId, existing.id, params.imageId);
    if (object === null) {
      return problemResponse(problemDetails({ title: '画像が見つかりません', status: 404 }));
    }

    return new Response(object.body, {
      status: 200,
      headers: {
        'content-type': object.contentType,
        // tenant ごとに可視性が変わる認証必須資源を browser/CDN の永続 cache へ残さない。
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  },
);

/**
 * 明示的な orphan 回収口。R2 delete は対象が無くても成功するため、妥当な imageId は 204 に揃える。
 * common 文書は upload/PATCH と同じ docs.write_common の追加ゲートを通す。
 */
export const DELETE = withAuthz<ImageParams>(
  {
    action: 'docs.write_tenant',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => requestScopedResource(request, { type: 'document', id: params.id }),
  },
  async (_request, authz, params) => {
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

    const { bucket } = await docsImagesRuntime();
    const service = createDocsImageService(bucket);
    if (!(await service.delete(existing.tenantId, existing.id, params.imageId))) {
      return problemResponse(problemDetails({ title: '画像が見つかりません', status: 404 }));
    }

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: existing.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'docs.image.delete',
      resourceType: 'document',
      resourceId: existing.id,
      metadata: { imageId: params.imageId, credential: authz.principal.credential },
    });

    return new Response(null, { status: 204 });
  },
);
