/** `GET /api/v1/tenant-data/objects/{id}/content` — 復号済み本体の取得。 */

import { createRepositoryContext, EntityNotFoundError } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';
import { problemResponse } from '../../../../../../../features/hearing-intake/http.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../../lib/authz/index.js';
import { checkTenantDataRateLimit, tenantDataRuntime } from '../../../../../../../lib/tenant-data/index.js';

interface ObjectParams {
  readonly id: string;
}

export const GET = withAuthz<ObjectParams>(
  {
    action: 'tenant-data.read_content',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) =>
      requestScopedResource(request, { type: 'tenant_data_object', id: params.id }),
  },
  async (_request, authz, params) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }
    const limit = checkTenantDataRateLimit(authz.resource.tenantId, authz.principal.userId, 'readContent', Date.now());
    if (limit.rejection !== null) return limit.rejection;

    const runtime = await tenantDataRuntime();
    const context = createRepositoryContext({ tenantId: authz.resource.tenantId });
    const row = await runtime.repo.findById(context, params.id);
    if (row === null) {
      return problemResponse(problemDetails({ title: 'オブジェクトが見つかりません', status: 404 }));
    }

    try {
      const content = await runtime.repo.getContent(context, params.id);
      return new Response(content as unknown as BodyInit, {
        headers: {
          'content-type': 'application/octet-stream',
          'content-disposition': `attachment; filename="${encodeURIComponent(row.title)}"`,
          'cache-control': 'no-store',
        },
      });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return problemResponse(problemDetails({ title: 'コンテンツが見つかりません', status: 404 }));
      }
      throw error;
    }
  },
);
