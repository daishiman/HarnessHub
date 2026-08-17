import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails, updateDocumentRequestSchema } from '@harness-hub/schemas';

import {
  extractExcerpt,
  extractFirstImageUrl,
  resolveUpdatedDerivedField,
  summarizeAssets,
} from '../../../../../features/docs-cms/content-analysis.js';
import { assetSummaryToStorage, tagsToStorage, toDocumentDetail } from '../../../../../features/docs-cms/dto.js';
import { parseJsonRequest, problemResponse } from '../../../../../features/docs-cms/http.js';
import { docsCmsRuntime } from '../../../../../features/docs-cms/runtime.js';
import { AuthzError, authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';
import {
  entityJsonResponse,
  MutationRequestError,
  mutationErrorResponse,
  parseEntityIfMatch,
  revisionConflictResponse,
} from '../../../../../lib/http/mutation-safety.js';

const DOCS_MUTATION_JSON_MAX_BYTES = 250_000;

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
    return entityJsonResponse(toDocumentDetail(doc), { namespace: 'docs', revision: doc.entityRevision });
  },
);

export const PATCH = withAuthz<DocParams>(
  {
    action: 'docs.write_tenant',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => requestScopedResource(request, { type: 'document', id: params.id }),
  },
  async (request, authz, params) => {
    let expectedRevision: number;
    try {
      expectedRevision = parseEntityIfMatch(request.headers.get('if-match'), 'docs');
    } catch (error) {
      if (error instanceof MutationRequestError) return mutationErrorResponse(error);
      throw error;
    }
    const parsed = await parseJsonRequest(request, updateDocumentRequestSchema, {
      maxBytes: DOCS_MUTATION_JSON_MAX_BYTES,
    });
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

    // 本文が更新されたときだけ asset_summary を再計算し、thumbnail/excerpt が明示されていなければ
    // 更新後の本文から自動算出する (既存値が既に手動指定済みでも、body 未変更時は上書きしない)。
    const effectiveBody = parsed.data.body_markdown ?? existing.bodyMarkdown;
    const bodyChanged = parsed.data.body_markdown !== undefined;

    const thumbnail = resolveUpdatedDerivedField({
      requested: parsed.data.thumbnail_url,
      currentSource: existing.thumbnailSource,
      bodyChanged,
      derive: () => extractFirstImageUrl(effectiveBody),
    });
    const excerpt = resolveUpdatedDerivedField({
      requested: parsed.data.excerpt,
      currentSource: existing.excerptSource,
      bodyChanged,
      derive: () => extractExcerpt(effectiveBody),
    });

    const result = await docsCmsRuntime().repository.updateDocumentCas(
      createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId }),
      params.id,
      {
        ...(parsed.data.title === undefined ? {} : { title: parsed.data.title }),
        ...(parsed.data.body_markdown === undefined ? {} : { bodyMarkdown: parsed.data.body_markdown }),
        // 未来の予約指定は repository が draft へ導出する。ここで status も渡すと、
        // 「明示status変更は予約解除」という repository 契約が優先され予約が消えるため渡さない。
        ...(parsed.data.publish_at != null || parsed.data.status === undefined ? {} : { status: parsed.data.status }),
        ...(parsed.data.category === undefined ? {} : { category: parsed.data.category }),
        ...(parsed.data.tags === undefined ? {} : { tags: tagsToStorage(parsed.data.tags) ?? null }),
        ...(thumbnail === null ? {} : { thumbnailUrl: thumbnail.value, thumbnailSource: thumbnail.source }),
        ...(excerpt === null ? {} : { excerpt: excerpt.value, excerptSource: excerpt.source }),
        ...(bodyChanged ? { assetSummary: assetSummaryToStorage(summarizeAssets(effectiveBody)) } : {}),
        ...(parsed.data.publish_at === undefined
          ? parsed.data.status === undefined
            ? {}
            : { publishAt: null }
          : { publishAt: parsed.data.publish_at }),
        actorId: authz.principal.userId,
      },
      expectedRevision,
    );

    if (result.outcome === 'conflict') {
      if (result.current === null) {
        return problemResponse(problemDetails({ title: 'ドキュメントが見つかりません', status: 404 }));
      }
      return revisionConflictResponse(toDocumentDetail(result.current), {
        namespace: 'docs',
        revision: result.current.entityRevision,
      });
    }
    const updated = result.document;

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'docs.update',
      resourceType: 'document',
      resourceId: params.id,
      metadata: { scope: updated.scope, credential: authz.principal.credential },
    });

    return entityJsonResponse(toDocumentDetail(updated), {
      namespace: 'docs',
      revision: updated.entityRevision,
    });
  },
);
