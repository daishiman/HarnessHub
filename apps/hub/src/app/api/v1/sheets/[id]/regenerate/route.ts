import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import { problemResponse } from '../../../../../../features/hearing-intake/http.js';
import { hearingIntakeRuntime } from '../../../../../../features/hearing-intake/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../lib/authz/index.js';

interface SheetParams {
  readonly id: string;
}

export const POST = withAuthz<SheetParams>(
  {
    action: 'sheets.regenerate',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => {
      const base = requestScopedResource(request, { type: 'hearing_sheet', id: params.id });
      if (base === null) return null;
      const sheet = await hearingIntakeRuntime().repository.findSheet(
        createRepositoryContext({ tenantId: base.tenantId }),
        params.id,
      );
      return sheet === null ? base : { ...base, workspaceId: sheet.workspaceId, ownerUserId: sheet.applicantUserId };
    },
  },
  async (_request, authz, params) => {
    const current = await hearingIntakeRuntime().repository.findSheet(
      createRepositoryContext({ tenantId: authz.resource.tenantId }),
      params.id,
    );
    if (current === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }
    const detail = await hearingIntakeRuntime().service.regenerate({
      context: createRepositoryContext({
        tenantId: authz.resource.tenantId,
        workspaceId: current.workspaceId,
        actorId: authz.principal.userId,
      }),
      id: params.id,
    });
    return Response.json(detail, { status: 202 });
  },
);
