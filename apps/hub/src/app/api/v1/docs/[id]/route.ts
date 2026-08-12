import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails, updateDocumentRequestSchema } from '@harness-hub/schemas';

import { toDocumentDetail } from '../../../../../features/docs-cms/dto.js';
import { parseJsonRequest, problemResponse } from '../../../../../features/docs-cms/http.js';
import { docsCmsRuntime } from '../../../../../features/docs-cms/runtime.js';
import { AuthzError, authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

interface DocParams {
  readonly id: string;
}

export const GET = withAuthz<DocParams>(
  {
    action: 'docs.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => requestScopedResource(request, { type: 'document', id: params.id }),
  },
  async (_request, authz, params) => {
    const doc = await docsCmsRuntime().repository.getDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      params.id,
    );
    if (doc === null) {
      return problemResponse(problemDetails({ title: 'ドキュメントが見つかりません', status: 404 }));
    }
    return Response.json(toDocumentDetail(doc));
  },
);

export const PATCH = withAuthz<DocParams>(
  {
    action: 'docs.write_tenant',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => requestScopedResource(request, { type: 'document', id: params.id }),
  },
  async (request, authz, params) => {
    const parsed = await parseJsonRequest(request, updateDocumentRequestSchema);
    if (!parsed.ok) return parsed.response;

    const existing = await docsCmsRuntime().repository.getDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      params.id,
    );
    if (existing === null) {
      return problemResponse(problemDetails({ title: 'ドキュメントが見つかりません', status: 404 }));
    }

    // docs.write_tenant は共通ゲート。common スコープ doc の更新はさらに docs.write_common を要求する (ADR §3)。
    if (existing.scope === 'common' && !authz.can('docs.write_common')) {
      throw new AuthzError('insufficient_role', 403);
    }

    const updated = await docsCmsRuntime().repository.updateDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId }),
      params.id,
      {
        ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
        ...(parsed.data.body_markdown === undefined ? {} : { bodyMarkdown: parsed.data.body_markdown }),
        ...(parsed.data.status === undefined ? {} : { status: parsed.data.status }),
        ...(parsed.data.category === undefined ? {} : { category: parsed.data.category }),
        ...(parsed.data.tags === undefined ? {} : { tagsJson: JSON.stringify(parsed.data.tags) }),
        ...(parsed.data.eyecatch_image_url === undefined ? {} : { eyecatchImageUrl: parsed.data.eyecatch_image_url }),
        ...(parsed.data.publish_at === undefined ? {} : { publishAt: parsed.data.publish_at }),
        actorId: authz.principal.userId,
      },
    );

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'docs.update',
      resourceType: 'document',
      resourceId: params.id,
      metadata: { scope: updated.scope, credential: authz.principal.credential },
    });

    return Response.json(toDocumentDetail(updated));
  },
);
