import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';
import { problemResponse } from '../../../../../../features/hearing-intake/http.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../lib/authz/index.js';
import { checkTenantDataRateLimit, tenantDataRuntime } from '../../../../../../lib/tenant-data/index.js';

interface ObjectParams {
  readonly id: string;
}

async function resolveObject(request: Request, params: ObjectParams) {
  return requestScopedResource(request, { type: 'tenant_data_object', id: params.id });
}

function toResponseBody(row: {
  readonly id: string;
  readonly workspaceId: string;
  readonly kind: string;
  readonly title: string;
  readonly sizeBytes: number;
  readonly contentHash: string;
  readonly uploadedBy: string;
  readonly createdAt: number;
}) {
  return {
    id: row.id,
    workspace_id: row.workspaceId,
    kind: row.kind,
    title: row.title,
    size_bytes: row.sizeBytes,
    content_hash: row.contentHash,
    uploaded_by: row.uploadedBy,
    created_at: row.createdAt,
  };
}

export const GET = withAuthz<ObjectParams>(
  {
    action: 'tenant-data.read',
    deps: () => authRuntime().authz,
    resolveResource: resolveObject,
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
    const limit = checkTenantDataRateLimit(authz.resource.tenantId, authz.principal.userId, 'read', Date.now());
    if (limit.rejection !== null) return limit.rejection;

    const runtime = await tenantDataRuntime();
    const row = await runtime.repo.findById(createRepositoryContext({ tenantId: authz.resource.tenantId }), params.id);
    if (row === null) {
      return problemResponse(problemDetails({ title: 'オブジェクトが見つかりません', status: 404 }));
    }
    return Response.json(toResponseBody(row), { headers: { 'cache-control': 'no-store' } });
  },
);

export const DELETE = withAuthz<ObjectParams>(
  {
    action: 'tenant-data.delete',
    deps: () => authRuntime().authz,
    resolveResource: resolveObject,
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
    const limit = checkTenantDataRateLimit(authz.resource.tenantId, authz.principal.userId, 'delete', Date.now());
    if (limit.rejection !== null) return limit.rejection;

    const runtime = await tenantDataRuntime();
    const context = createRepositoryContext({
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      actorId: authz.principal.userId,
    });
    const existing = await runtime.repo.findById(context, params.id);
    if (existing === null) {
      return problemResponse(problemDetails({ title: 'オブジェクトが見つかりません', status: 404 }));
    }
    await runtime.repo.deleteTenantDataObject(context, params.id);
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  },
);
