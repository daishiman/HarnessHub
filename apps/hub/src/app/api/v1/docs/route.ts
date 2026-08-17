import { createRepositoryContext, RepositoryError } from '@harness-hub/db';
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
import {
  buildEntityCreateWireResponse,
  canonicalPayloadHash,
  MutationRequestError,
  mutationErrorResponse,
  mutationWireResponse,
  parseIdempotencyKey,
} from '../../../../lib/http/mutation-safety.js';

const DOCS_MUTATION_JSON_MAX_BYTES = 250_000;

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
      // 状態タブの件数。cursor 適用前・認可適用後の集合から数えた値なので、
      // ページを送っても件数は動かない (受入条件 6)。
      status_counts: page.statusCounts,
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
    let idempotencyKey: string;
    try {
      idempotencyKey = parseIdempotencyKey(request.headers.get('idempotency-key'));
      if (authz.resource.workspaceId === null) {
        throw new MutationRequestError(400, '冪等性の所有スコープに Workspace が必要です');
      }
    } catch (error) {
      if (error instanceof MutationRequestError) return mutationErrorResponse(error);
      throw error;
    }
    const parsed = await parseJsonRequest(request, createDocumentRequestSchema, {
      maxBytes: DOCS_MUTATION_JSON_MAX_BYTES,
    });
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

    let result: Awaited<ReturnType<ReturnType<typeof docsCmsRuntime>['repository']['createDocumentIdempotent']>>;
    try {
      result = await docsCmsRuntime().repository.createDocumentIdempotent(
        createRepositoryContext({
          tenantId: authz.resource.tenantId,
          workspaceId: authz.resource.workspaceId,
          actorId: authz.principal.userId,
        }),
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
        { key: idempotencyKey, payloadHash: await canonicalPayloadHash(parsed.data) },
        (document, expiresAt) =>
          buildEntityCreateWireResponse(toDocumentDetail(document), {
            namespace: 'docs',
            revision: document.entityRevision,
            expiresAt,
          }),
        {
          actorType: authz.principal.credential === 'access_token' ? 'publisher_token' : 'user',
          actorId: authz.principal.userId,
          summary: { scope: parsed.data.scope, credential: authz.principal.credential },
        },
      );
    } catch (error) {
      if (error instanceof RepositoryError && error.code === 'invalid-context') {
        return Response.json(
          { type: 'about:blank', title: '入力内容を確認してください', status: 422, detail: error.message },
          { status: 422, headers: { 'cache-control': 'no-store', 'content-type': 'application/problem+json' } },
        );
      }
      throw error;
    }

    if (result.outcome === 'conflict') {
      return mutationErrorResponse(
        new MutationRequestError(422, '同じ Idempotency-Key は別のリクエスト本文で使用済みです'),
      );
    }
    return mutationWireResponse(result.wireResponse, result.outcome === 'replayed');
  },
);
