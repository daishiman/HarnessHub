import { createRepositoryContext, ExternalDocumentPreconditionError } from '@harness-hub/db';
import {
  externalDocumentIdSchema,
  externalDocumentSourceSchema,
  externalDocumentSyncRequestSchema,
  problemDetails,
} from '@harness-hub/schemas';
import {
  extractExcerpt,
  extractFirstImageUrl,
  summarizeAssets,
} from '../../../../../../../features/docs-cms/content-analysis.js';
import { assetSummaryToStorage } from '../../../../../../../features/docs-cms/dto.js';
import {
  externalDocumentEtag,
  externalDocumentResponse,
  revisionFromIfMatch,
} from '../../../../../../../features/docs-cms/external-sync.js';
import { parseJsonRequest, problemResponse } from '../../../../../../../features/docs-cms/http.js';
import { docsCmsRuntime } from '../../../../../../../features/docs-cms/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../../lib/authz/index.js';

interface ExternalDocParams {
  readonly source: string;
  readonly externalId: string;
}

// body_markdown 200,000文字のUTF-8/JSON escapeを受け止めつつ、Workerのbufferを有限にする。
const EXTERNAL_SYNC_REQUEST_MAX_BYTES = 1_250_000;

function parseParams(
  params: ExternalDocParams,
):
  | { readonly ok: true; readonly source: string; readonly externalId: string }
  | { readonly ok: false; readonly response: Response } {
  const source = externalDocumentSourceSchema.safeParse(params.source);
  const externalId = externalDocumentIdSchema.safeParse(params.externalId);
  if (!source.success || !externalId.success) {
    return {
      ok: false,
      response: problemResponse(
        problemDetails({
          title: '外部ドキュメント識別子が不正です',
          status: 422,
          detail: 'sourceは安全なslug、externalIdはSHA-256 hexで指定してください。',
        }),
      ),
    };
  }
  return { ok: true, source: source.data, externalId: externalId.data };
}

export const GET = withAuthz<ExternalDocParams>(
  {
    action: 'docs.external_sync',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) =>
      requestScopedResource(request, { type: 'document', id: `${params.source}:${params.externalId}` }),
  },
  async (_request, authz, params) => {
    const parsedParams = parseParams(params);
    if (!parsedParams.ok) return parsedParams.response;
    const existing = await docsCmsRuntime().repository.getExternalDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      parsedParams.source,
      parsedParams.externalId,
    );
    if (existing === null) {
      return problemResponse(problemDetails({ title: '同期済みドキュメントが見つかりません', status: 404 }));
    }
    return externalDocumentResponse(existing, 'fetched');
  },
);

export const PUT = withAuthz<ExternalDocParams>(
  {
    action: 'docs.external_sync',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) =>
      requestScopedResource(request, { type: 'document', id: `${params.source}:${params.externalId}` }),
  },
  async (request, authz, params) => {
    const parsedParams = parseParams(params);
    if (!parsedParams.ok) return parsedParams.response;
    const parsedBody = await parseJsonRequest(request, externalDocumentSyncRequestSchema, {
      maxBytes: EXTERNAL_SYNC_REQUEST_MAX_BYTES,
    });
    if (!parsedBody.ok) return parsedBody.response;
    const expectedRevision = revisionFromIfMatch(request.headers.get('if-match'));
    if (expectedRevision === null) {
      return problemResponse(
        problemDetails({
          title: 'If-Match が不正です',
          status: 400,
          detail: 'GETで返されたETagを変更せず指定してください。',
        }),
      );
    }

    try {
      const result = await docsCmsRuntime().repository.syncExternalDocument(
        createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId }),
        {
          source: parsedParams.source,
          externalDocumentId: parsedParams.externalId,
          title: parsedBody.data.title,
          bodyMarkdown: parsedBody.data.body_markdown,
          autoThumbnailUrl: extractFirstImageUrl(parsedBody.data.body_markdown),
          autoExcerpt: extractExcerpt(parsedBody.data.body_markdown),
          assetSummary: assetSummaryToStorage(summarizeAssets(parsedBody.data.body_markdown)),
          actorId: authz.principal.userId,
          ...(expectedRevision === undefined ? {} : { expectedRevision }),
        },
      );

      await authRuntime().authz.audit.record({
        actorSubject: authz.principal.userId,
        tenantId: authz.resource.tenantId,
        workspaceId: authz.resource.workspaceId,
        action: 'docs.external_sync',
        resourceType: 'document',
        resourceId: result.document.id,
        metadata: {
          outcome: result.outcome,
          source: parsedParams.source,
          external_document_id: parsedParams.externalId,
          revision: result.document.externalRevision,
          credential: authz.principal.credential,
        },
      });

      return externalDocumentResponse(result.document, result.outcome, result.outcome === 'created' ? 201 : 200);
    } catch (error) {
      if (!(error instanceof ExternalDocumentPreconditionError)) throw error;
      const response = problemResponse(
        problemDetails({
          title:
            error.reason === 'required'
              ? 'If-Match が必要です'
              : error.reason === 'missing'
                ? '同期対象ドキュメントが削除されています'
                : 'ドキュメントが更新されています',
          status: error.reason === 'required' ? 428 : 412,
          detail:
            error.current === null
              ? '古いETagでは再作成できません。GETで404を確認し、明示的な新規同期として再送してください。'
              : error.current.externalContentHash === null
                ? 'Harness Hub側で編集されています。内容を確認してから明示的に再同期してください。'
                : 'GETで最新ETagを取得してから再同期してください。',
        }),
      );
      if (error.current !== null) response.headers.set('etag', externalDocumentEtag(error.current.externalRevision));
      response.headers.set('cache-control', 'private, no-store');
      return response;
    }
  },
);
