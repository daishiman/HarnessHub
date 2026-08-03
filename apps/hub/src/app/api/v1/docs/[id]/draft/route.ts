import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';
import { z } from 'zod';

import { buildDocDraftPayload } from '../../../../../../features/docs-cms/ai-job-adapter/index.js';
import { parseJsonRequest, problemResponse } from '../../../../../../features/docs-cms/http.js';
import { docsCmsRuntime } from '../../../../../../features/docs-cms/runtime.js';
import { AuthzError, authRuntime, requestScopedResource, withAuthz } from '../../../../../../lib/authz/index.js';

interface DocParams {
  readonly id: string;
}

const draftRequestSchema = z
  .object({
    outline: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  })
  .strict();

export const POST = withAuthz<DocParams>(
  {
    // AI 下書きの投入も本文編集の起点なので、POST/PATCH と同じ docs.write_tenant を最低ゲートにする。
    action: 'docs.write_tenant',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => requestScopedResource(request, { type: 'document', id: params.id }),
  },
  async (request, authz, params) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }

    const existing = await docsCmsRuntime().repository.getDocument(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      params.id,
    );
    if (existing === null) {
      return problemResponse(problemDetails({ title: 'ドキュメントが見つかりません', status: 404 }));
    }

    // common スコープ doc への AI 下書き投入も docs.write_common を追加で要求する (ADR §3 の 2 段ゲート)。
    if (existing.scope === 'common' && !authz.can('docs.write_common')) {
      throw new AuthzError('insufficient_role', 403);
    }

    const parsed = await parseJsonRequest(request, draftRequestSchema);
    if (!parsed.ok) return parsed.response;

    const payload = buildDocDraftPayload({
      documentId: existing.id,
      title: existing.title,
      outline: parsed.data.outline,
    });

    await docsCmsRuntime().repository.enqueueDocDraft(
      createRepositoryContext({ tenantId: authz.resource.tenantId, actorId: authz.principal.userId }),
      existing.id,
      authz.resource.workspaceId,
      JSON.stringify(payload),
    );

    return new Response(null, { status: 202 });
  },
);
