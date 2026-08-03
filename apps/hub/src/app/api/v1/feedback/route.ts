import { createRepositoryContext } from '@harness-hub/db';
import {
  createFeedbackRequestSchema,
  type FeedbackSource,
  feedbackListQuerySchema,
  problemDetails,
  problemDetailsFromZodError,
} from '@harness-hub/schemas';

import { parseJsonRequest, problemResponse } from '../../../../features/feedback-loop/http.js';
import { feedbackLoopRuntime } from '../../../../features/feedback-loop/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';

function contextFor(tenantId: string, workspaceId: string | null, actorId: string) {
  return createRepositoryContext({
    tenantId,
    ...(workspaceId === null ? {} : { workspaceId }),
    actorId,
  });
}

/**
 * B6/I12: source はリクエストに含めず principal.credential から自動導出する
 * (Bearer=access_token → harness / session → manual)。2 経路とも同一資源 `feedbacks` へ書き込む。
 */
function deriveSource(credential: 'session' | 'access_token' | 'cwv_probe'): FeedbackSource {
  return credential === 'access_token' ? 'harness' : 'manual';
}

export const POST = withAuthz(
  {
    action: 'feedback.create',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'feedback' }),
  },
  async (request, authz) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }
    const parsed = await parseJsonRequest(request, createFeedbackRequestSchema);
    if (!parsed.ok) return parsed.response;

    const result = await feedbackLoopRuntime().service.createFeedback({
      context: contextFor(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      workspaceId: authz.resource.workspaceId,
      createdBy: authz.principal.userId,
      source: deriveSource(authz.principal.credential),
      request: parsed.data,
    });
    return Response.json(result, { status: 201 });
  },
);

export const GET = withAuthz(
  {
    action: 'feedback.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'feedback_collection' }),
  },
  async (request, authz) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }
    const url = new URL(request.url);
    const parsed = feedbackListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return problemResponse(problemDetailsFromZodError(parsed.error, { instance: url.pathname }));
    }

    const result = await feedbackLoopRuntime().service.listFeedbacks({
      context: contextFor(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      workspaceId: authz.resource.workspaceId,
      query: parsed.data,
    });
    return Response.json(result);
  },
);
