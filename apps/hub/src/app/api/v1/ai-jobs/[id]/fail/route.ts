import { createRepositoryContext } from '@harness-hub/db';
import { failSheetGenerationJobRequestSchema, problemDetails } from '@harness-hub/schemas';

import { parseJsonRequest, problemResponse } from '../../../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../../../features/hearing-intake/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../lib/authz/index.js';

interface JobParams {
  readonly id: string;
}

export const POST = withAuthz<JobParams>(
  {
    action: 'aijob.fail',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => {
      const base = requestScopedResource(request, { type: 'ai_job', id: params.id });
      if (base === null) return null;
      const job = await hearingIntakeRuntime().repository.findJob(
        createRepositoryContext({ tenantId: base.tenantId }),
        params.id,
      );
      if (job === null) return { ...base, ownerUserId: principal.userId };
      return {
        ...base,
        workspaceId: job.workspaceId,
        ownerUserId: job.claimedByTokenId === principal.tokenId ? principal.userId : null,
      };
    },
  },
  async (request, authz, params) => {
    const parsed = await parseJsonRequest(request, failSheetGenerationJobRequestSchema);
    if (!parsed.ok) return parsed.response;
    const tokenId = authz.principal.tokenId;
    if (tokenId === undefined || tokenId === null) {
      return problemResponse(problemDetails({ title: 'Device Flow token が必要です', status: 401 }));
    }
    const job = await hearingIntakeRuntime().repository.failSheetGenerationJob(
      createRepositoryContext({
        tenantId: authz.resource.tenantId,
        ...(authz.resource.workspaceId === null ? {} : { workspaceId: authz.resource.workspaceId }),
        actorId: authz.principal.userId,
      }),
      params.id,
      tokenId,
      parsed.data.error,
    );
    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'ai_job.fail',
      resourceType: 'ai_job',
      resourceId: params.id,
      metadata: {
        kind: job.kind,
        attempt: job.attempt,
        status: job.status,
        credential: authz.principal.credential,
      },
    });
    return Response.json({ id: job.id, status: job.status, attempt: job.attempt });
  },
);
