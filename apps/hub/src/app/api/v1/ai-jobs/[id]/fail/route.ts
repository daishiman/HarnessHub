import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import { problemResponse } from '../../../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../../../features/hearing-intake/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../lib/authz/index.js';
import { AI_QUEUE_ADAPTERS } from '../../../../../../lib/ai-queue/registry.js';

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
    const job = await hearingIntakeRuntime().repository.findJob(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      params.id,
    );
    const adapter = job === null ? undefined : AI_QUEUE_ADAPTERS[job.kind];
    if (job === null || adapter === undefined) {
      return problemResponse(problemDetails({ title: '対象の AI job が見つかりません', status: 404 }));
    }
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return problemResponse(problemDetails({ title: 'JSON を読み取れません', status: 400 }));
    }
    const parsed = adapter.failRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return problemResponse(problemDetails({ title: 'リクエストが不正です', status: 400 }));
    }
    const tokenId = authz.principal.tokenId;
    if (tokenId === undefined || tokenId === null) {
      return problemResponse(problemDetails({ title: 'Device Flow token が必要です', status: 401 }));
    }
    const failed = await adapter.fail(
      createRepositoryContext({
        tenantId: authz.resource.tenantId,
        ...(authz.resource.workspaceId === null ? {} : { workspaceId: authz.resource.workspaceId }),
        actorId: authz.principal.userId,
      }),
      params.id,
      tokenId,
      (parsed.data as { error: string }).error,
    );
    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'ai_job.fail',
      resourceType: 'ai_job',
      resourceId: params.id,
      metadata: {
        kind: failed.kind,
        attempt: failed.attempt,
        status: failed.status,
        credential: authz.principal.credential,
      },
    });
    return Response.json({ id: failed.id, status: failed.status, attempt: failed.attempt });
  },
);
