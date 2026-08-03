import { createRepositoryContext } from '@harness-hub/db';
import { parseRequest, problemDetails, pullSheetGenerationJobRequestSchema } from '@harness-hub/schemas';

import { toPulledFeedbackResponseJob } from '../../../../../features/feedback-loop/ai-job-adapter/index.js';
import { feedbackLoopRuntime } from '../../../../../features/feedback-loop/runtime.js';
import { toPulledJob } from '../../../../../features/hearing-intake/ai-job-adapter/index.js';
import { problemResponse } from '../../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../../features/hearing-intake/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

export const POST = withAuthz(
  {
    action: 'aijob.pull',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'ai_job_queue' }),
  },
  async (request, authz) => {
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
    // kind 未指定は sheet_generation 既定 (既存挙動を変えない)。feedback_response のときだけ新分岐へ。
    const requestedKind =
      typeof rawBody === 'object' && rawBody !== null && 'kind' in rawBody
        ? (rawBody as { kind?: unknown }).kind
        : undefined;

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

    if (requestedKind === 'feedback_response') {
      const { pullFeedbackResponseJobRequestSchema } = await import('@harness-hub/schemas');
      const parsed = parseRequest(pullFeedbackResponseJobRequestSchema, rawBody, {
        instance: new URL(request.url).pathname,
      });
      if (!parsed.ok) return problemResponse(parsed.problem);
      const job = await feedbackLoopRuntime().repository.claimNextFeedbackResponseJob(
        createRepositoryContext({
          tenantId: authz.resource.tenantId,
          workspaceId: authz.resource.workspaceId,
          actorId: authz.principal.userId,
        }),
        tokenId,
      );
      return job === null ? new Response(null, { status: 204 }) : Response.json(toPulledFeedbackResponseJob(job));
    }

    const parsed = parseRequest(pullSheetGenerationJobRequestSchema, rawBody, {
      instance: new URL(request.url).pathname,
    });
    if (!parsed.ok) return problemResponse(parsed.problem);
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
