import { createRepositoryContext } from '@harness-hub/db';
import {
  failFeedbackResponseJobRequestSchema,
  failSheetGenerationJobRequestSchema,
  parseRequest,
  problemDetails,
} from '@harness-hub/schemas';

import { feedbackLoopRuntime } from '../../../../../../features/feedback-loop/runtime.js';
import { problemResponse } from '../../../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../../../features/hearing-intake/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../lib/authz/index.js';

interface JobParams {
  readonly id: string;
}

// complete/route.ts と同じ理由で、body に kind が無いので既存 ai_jobs 行から kind を判定する。
async function findJobKind(
  tenantId: string,
  id: string,
): Promise<'sheet_generation' | 'feedback_response' | 'doc_draft' | null> {
  const context = createRepositoryContext({ tenantId });
  const sheetJob = await hearingIntakeRuntime().repository.findJob(context, id);
  if (sheetJob !== null) return sheetJob.kind;
  const feedbackJob = await feedbackLoopRuntime().repository.findFeedbackResponseJob(context, id);
  return feedbackJob?.kind ?? null;
}

export const POST = withAuthz<JobParams>(
  {
    action: 'aijob.fail',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => {
      const base = requestScopedResource(request, { type: 'ai_job', id: params.id });
      if (base === null) return null;
      const context = createRepositoryContext({ tenantId: base.tenantId });
      const sheetJob = await hearingIntakeRuntime().repository.findJob(context, params.id);
      if (sheetJob !== null) {
        return {
          ...base,
          workspaceId: sheetJob.workspaceId,
          ownerUserId: sheetJob.claimedByTokenId === principal.tokenId ? principal.userId : null,
        };
      }
      const feedbackJob = await feedbackLoopRuntime().repository.findFeedbackResponseJob(context, params.id);
      if (feedbackJob !== null) {
        return {
          ...base,
          workspaceId: feedbackJob.workspaceId,
          ownerUserId: feedbackJob.claimedByTokenId === principal.tokenId ? principal.userId : null,
        };
      }
      return { ...base, ownerUserId: principal.userId };
    },
  },
  async (request, authz, params) => {
    const tokenId = authz.principal.tokenId;
    if (tokenId === undefined || tokenId === null) {
      return problemResponse(problemDetails({ title: 'Device Flow token が必要です', status: 401 }));
    }
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return problemResponse(
        problemDetails({
          title: 'JSON を読み取れません',
          status: 400,
          detail: 'Content-Type: application/json で正しい JSON を送信してください。',
          instance: new URL(request.url).pathname,
        }),
      );
    }

    const kind = await findJobKind(authz.resource.tenantId, params.id);

    if (kind === 'feedback_response') {
      const parsed = parseRequest(failFeedbackResponseJobRequestSchema, rawBody, {
        instance: new URL(request.url).pathname,
      });
      if (!parsed.ok) return problemResponse(parsed.problem);
      const job = await feedbackLoopRuntime().repository.failFeedbackResponseJob(
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
    }

    const parsed = parseRequest(failSheetGenerationJobRequestSchema, rawBody, {
      instance: new URL(request.url).pathname,
    });
    if (!parsed.ok) return problemResponse(parsed.problem);
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
