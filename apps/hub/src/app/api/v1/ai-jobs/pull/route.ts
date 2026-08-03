import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import { problemResponse } from '../../../../../features/hearing-intake/http.js';
import { AI_QUEUE_ADAPTERS, resolveAiQueueKind } from '../../../../../lib/ai-queue/registry.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

export const POST = withAuthz(
  {
    action: 'aijob.pull',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'ai_job_queue' }),
  },
  async (request, authz) => {
    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      // body 省略時は sheet_generation 既定へフォールバックする (後方互換)
    }
    const kind = resolveAiQueueKind((rawBody as { kind?: unknown } | null)?.kind);
    const adapter = AI_QUEUE_ADAPTERS[kind];
    if (adapter === undefined) {
      return problemResponse(problemDetails({ title: '未対応の kind です', status: 400, detail: kind }));
    }
    const parsed = adapter.pullRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return problemResponse(problemDetails({ title: 'リクエストが不正です', status: 400 }));
    }
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }
    const tokenId = authz.principal.tokenId;
    if (tokenId === undefined || tokenId === null) {
      return problemResponse(problemDetails({ title: 'Device Flow token が必要です', status: 401 }));
    }
    const job = await adapter.claim(
      createRepositoryContext({
        tenantId: authz.resource.tenantId,
        workspaceId: authz.resource.workspaceId,
        actorId: authz.principal.userId,
      }),
      tokenId,
    );
    return job === null ? new Response(null, { status: 204 }) : Response.json(adapter.toPulled(job));
  },
);
