import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import { problemResponse } from '../../../../../../../features/docs-cms/http.js';
import { docsImagesRuntime } from '../../../../../../../features/docs-cms/image-runtime.js';
import { createDocsImageService } from '../../../../../../../features/docs-cms/image-service.js';
import { docsCmsRuntime } from '../../../../../../../features/docs-cms/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../../lib/authz/index.js';

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

    const { bucket } = await docsImagesRuntime();
    const service = createDocsImageService(bucket);
    const object = await service.fetch(authz.resource.tenantId, existing.id, params.imageId);
    if (object === null) {
      return problemResponse(problemDetails({ title: '画像が見つかりません', status: 404 }));
    }

    return new Response(object.body, {
      status: 200,
      headers: {
        'content-type': object.contentType,
        // ドキュメント本文中の画像は差し替え可能な URL では参照しない (常に新規 imageId) ため、長期キャッシュしてよい。
        'cache-control': 'private, max-age=31536000, immutable',
      },
    });
  },
);
