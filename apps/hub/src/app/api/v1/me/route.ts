import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails, updateMeRequestSchema } from '@harness-hub/schemas';
import { parseJsonRequest, problemResponse } from '../../../../features/user-org-admin/http.js';
import { userOrgAdminRuntime } from '../../../../features/user-org-admin/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';

function contextFor(tenantId: string, actorId: string) {
  return createRepositoryContext({ tenantId, actorId });
}

/** GET/PATCH /api/v1/me — session 本人限定 (S18)。role/salary は含まない自己編集不可な項目のみ。 */
export const GET = withAuthz(
  {
    action: 'me.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) =>
      requestScopedResource(request, {
        type: 'user_self',
        id: principal.userId,
        ownerUserId: principal.userId,
        workspaceId: null,
      }),
  },
  async (_request, authz) => {
    const result = await userOrgAdminRuntime().service.getMe(
      contextFor(authz.resource.tenantId, authz.principal.userId),
      authz.principal.userId,
    );
    if (result === null) {
      return problemResponse(problemDetails({ title: '見つかりません', status: 404 }));
    }
    return Response.json(result);
  },
);

export const PATCH = withAuthz(
  {
    action: 'me.update',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) =>
      requestScopedResource(request, {
        type: 'user_self',
        id: principal.userId,
        ownerUserId: principal.userId,
        workspaceId: null,
      }),
  },
  async (request, authz) => {
    const parsed = await parseJsonRequest(request, updateMeRequestSchema);
    if (!parsed.ok) return parsed.response;
    const result = await userOrgAdminRuntime().service.updateMe(
      contextFor(authz.resource.tenantId, authz.principal.userId),
      authz.principal.userId,
      parsed.data,
    );
    return Response.json(result);
  },
);
