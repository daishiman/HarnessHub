import { createRepositoryContext } from '@harness-hub/db';
import { createDocumentRequestSchema, documentListQuerySchema } from '@harness-hub/schemas';

import { toDocumentDetail, toDocumentListItem } from '../../../../features/docs-cms/dto.js';
import { parseJsonRequest, problemResponse } from '../../../../features/docs-cms/http.js';
import { docsCmsRuntime } from '../../../../features/docs-cms/runtime.js';
import { AuthzError, authRuntime, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';

export const GET = withAuthz(
  {
    action: 'docs.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'document_collection' }),
  },
  async (request, authz) => {
    const url = new URL(request.url);
    const parsed = documentListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      const { problemDetailsFromZodError } = await import('@harness-hub/schemas');
      return problemResponse(problemDetailsFromZodError(parsed.error, { instance: url.pathname }));
    }
    const { limit, cursor, scope, status, category, q } = parsed.data;
    const page = await docsCmsRuntime().repository.listDocuments(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      {
        limit,
        ...(cursor !== undefined ? { cursor } : {}),
        ...(scope !== undefined ? { scope } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(q !== undefined ? { query: q } : {}),
      },
    );
    return Response.json({
      items: page.items.map(toDocumentListItem),
      next_cursor: page.nextCursor,
    });
  },
);

export const POST = withAuthz(
  {
    action: 'docs.write_tenant',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'document' }),
  },
  async (request, authz) => {
    const parsed = await parseJsonRequest(request, createDocumentRequestSchema);
    if (!parsed.ok) return parsed.response;

    // docs.write_tenant は共通ゲート。common スコープはさらに docs.write_common を要求する (ADR §3)。
    if (parsed.data.scope === 'common' && !authz.can('docs.write_common')) {
      throw new AuthzError('insufficient_role', 403);
    }

    const created = await docsCmsRuntime().repository.createDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId }),
      {
        scope: parsed.data.scope,
        title: parsed.data.title,
        bodyMarkdown: parsed.data.body_markdown,
        actorId: authz.principal.userId,
        ...(parsed.data.category === undefined ? {} : { category: parsed.data.category }),
        ...(parsed.data.tags === undefined ? {} : { tagsJson: JSON.stringify(parsed.data.tags) }),
        ...(parsed.data.eyecatch_image_url === undefined ? {} : { eyecatchImageUrl: parsed.data.eyecatch_image_url }),
        ...(parsed.data.publish_at === undefined ? {} : { publishAt: parsed.data.publish_at }),
      },
    );

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'docs.create',
      resourceType: 'document',
      resourceId: created.id,
      metadata: { scope: created.scope, credential: authz.principal.credential },
    });

    return Response.json(toDocumentDetail(created), { status: 201 });
  },
);
