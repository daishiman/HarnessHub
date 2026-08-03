import { createRepositoryContext } from '@harness-hub/db';
import { type FeedbackDetail, problemDetails, updateFeedbackStatusRequestSchema } from '@harness-hub/schemas';

import { parseJsonRequest, problemResponse } from '../../../../../features/feedback-loop/http.js';
import { feedbackLoopRuntime } from '../../../../../features/feedback-loop/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

interface FeedbackParams {
  readonly id: string;
}

function repositoryContext(tenantId: string, workspaceId: string | null, actorId: string) {
  return createRepositoryContext({
    tenantId,
    ...(workspaceId === null ? {} : { workspaceId }),
    actorId,
  });
}

async function resolveFeedback(request: Request, params: FeedbackParams, principal: { readonly userId: string }) {
  const base = requestScopedResource(request, { type: 'feedback', id: params.id });
  if (base === null) return null;
  const row = await feedbackLoopRuntime().repository.findFeedback(
    createRepositoryContext({ tenantId: base.tenantId }),
    params.id,
  );
  if (row === null) return { ...base, ownerUserId: principal.userId };
  return {
    ...base,
    workspaceId: row.workspaceId,
    ownerUserId: row.createdBy,
  };
}

export const GET = withAuthz<FeedbackParams>(
  {
    action: 'feedback.read',
    deps: () => authRuntime().authz,
    resolveResource: resolveFeedback,
  },
  async (_request, authz, params) => {
    const detail = await feedbackLoopRuntime().service.getFeedback({
      context: repositoryContext(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      id: params.id,
    });
    if (detail === null) {
      return problemResponse(problemDetails({ title: '改善要望が見つかりません', status: 404 }));
    }
    return Response.json({ ...detail, can_manage: authz.can('feedback.status_change') });
  },
);

export const PATCH = withAuthz<FeedbackParams>(
  {
    action: 'feedback.status_change',
    deps: () => authRuntime().authz,
    resolveResource: resolveFeedback,
  },
  async (request, authz, params) => {
    const parsed = await parseJsonRequest(request, updateFeedbackStatusRequestSchema);
    if (!parsed.ok) return parsed.response;

    // SEC6-104: 不正遷移は 422 を返し、監査 event は記録しない (audit.record は成功後にのみ呼ぶ)。
    let detail: FeedbackDetail;
    try {
      detail = await feedbackLoopRuntime().service.updateFeedbackStatus({
        context: repositoryContext(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
        id: params.id,
        status: parsed.data.status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '状態を更新できませんでした';
      return problemResponse(
        problemDetails({
          title: '状態を変更できません',
          status: 422,
          detail: message,
        }),
      );
    }

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'feedback.status_change',
      resourceType: 'feedback',
      resourceId: params.id,
      metadata: { status: parsed.data.status, credential: authz.principal.credential },
    });
    return Response.json({ ...detail, can_manage: true });
  },
);
