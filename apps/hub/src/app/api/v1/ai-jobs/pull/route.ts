import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails, pullSheetGenerationJobRequestSchema } from '@harness-hub/schemas';

import { toPulledJob } from '../../../../../features/hearing-intake/ai-job-adapter/index.js';
import { parseJsonRequest, problemResponse } from '../../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../../features/hearing-intake/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

export const POST = withAuthz(
  {
    action: 'aijob.pull',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'ai_job_queue' }),
  },
  async (request, authz) => {
    const parsed = await parseJsonRequest(request, pullSheetGenerationJobRequestSchema);
    if (!parsed.ok) return parsed.response;
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
    const job = await hearingIntakeRuntime().repository.claimNextSheetGenerationJob(
      createRepositoryContext({
        tenantId: authz.resource.tenantId,
        workspaceId: authz.resource.workspaceId,
        actorId: authz.principal.userId,
      }),
      tokenId,
    );
    return job === null ? new Response(null, { status: 204 }) : Response.json(toPulledJob(job));
  },
);
