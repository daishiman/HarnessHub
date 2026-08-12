import { createRepositoryContext } from '@harness-hub/db';
import { createDocumentRequestSchema, documentListQuerySchema } from '@harness-hub/schemas';

import {
  extractExcerpt,
  extractFirstImageUrl,
  resolveInitialDerivedField,
  summarizeAssets,
} from '../../../../features/docs-cms/content-analysis.js';
import {
  assetSummaryToStorage,
  tagsToStorage,
  toDocumentDetail,
  toDocumentListItem,
} from '../../../../features/docs-cms/dto.js';
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
    const { limit, cursor, scope, status, q, category, tag } = parsed.data;
    const page = await docsCmsRuntime().repository.listDocuments(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      {
        limit,
        ...(cursor !== undefined ? { cursor } : {}),
        ...(scope !== undefined ? { scope } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(q !== undefined ? { query: q } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(tag !== undefined ? { tag } : {}),
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

    // thumbnail_url/excerpt はリクエストに明示されていればそれを 'manual' 採用、無ければ本文から自動算出する。
    // category/tags は完全手動項目 (自動抽出しない, 残課題に記載)。asset_summary は常に自動算出。
    const body = parsed.data.body_markdown;
    const thumbnail = resolveInitialDerivedField(parsed.data.thumbnail_url, () => extractFirstImageUrl(body));
    const excerpt = resolveInitialDerivedField(parsed.data.excerpt, () => extractExcerpt(body));

    const created = await docsCmsRuntime().repository.createDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId }),
      {
        scope: parsed.data.scope,
        title: parsed.data.title,
        bodyMarkdown: body,
        actorId: authz.principal.userId,
        category: parsed.data.category ?? null,
        tags: tagsToStorage(parsed.data.tags) ?? null,
        thumbnailUrl: thumbnail.value,
        thumbnailSource: thumbnail.source,
        excerpt: excerpt.value,
        excerptSource: excerpt.source,
        assetSummary: assetSummaryToStorage(summarizeAssets(body)),
        publishAt: parsed.data.publish_at ?? null,
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
