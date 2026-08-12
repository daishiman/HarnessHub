import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails, updateSheetStatusRequestSchema } from '@harness-hub/schemas';

import { resolveSheetResource, type SheetParams } from '../../../../../features/hearing-intake/authz-resource.js';
import { parseJsonRequest, problemResponse } from '../../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../../features/hearing-intake/runtime.js';
import { authRuntime, withAuthz } from '../../../../../lib/authz/index.js';

function repositoryContext(tenantId: string, workspaceId: string | null, actorId: string) {
  return createRepositoryContext({
    tenantId,
    ...(workspaceId === null ? {} : { workspaceId }),
    actorId,
  });
}

export const GET = withAuthz<SheetParams>(
  {
    action: 'sheets.read_own',
    deps: () => authRuntime().authz,
    resolveResource: resolveSheetResource,
  },
  async (_request, authz, params) => {
    const detail = await hearingIntakeRuntime().service.getSheet({
      context: repositoryContext(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      id: params.id,
    });
    if (detail === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }
    return Response.json({ ...detail, can_manage: authz.can('sheets.status_change') });
  },
);

export const PATCH = withAuthz<SheetParams>(
  {
    action: 'sheets.status_change',
    deps: () => authRuntime().authz,
    resolveResource: resolveSheetResource,
  },
  async (request, authz, params) => {
    const parsed = await parseJsonRequest(request, updateSheetStatusRequestSchema);
    if (!parsed.ok) return parsed.response;
    if (parsed.data.status !== 'review' && parsed.data.status !== 'completed') {
      return problemResponse(
        problemDetails({
          title: '状態を変更できません',
          status: 409,
          detail: '手動で変更できる状態は review または completed です。',
        }),
      );
    }
    const detail = await hearingIntakeRuntime().service.updateSheetStatus({
      context: repositoryContext(authz.resource.tenantId, authz.resource.workspaceId, authz.principal.userId),
      id: params.id,
      status: parsed.data.status,
    });
    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: authz.resource.workspaceId,
      action: 'sheet.status_changed',
      resourceType: 'hearing_sheet',
      resourceId: params.id,
      metadata: { status: parsed.data.status, credential: authz.principal.credential },
    });
    return Response.json({ ...detail, can_manage: true });
  },
);
