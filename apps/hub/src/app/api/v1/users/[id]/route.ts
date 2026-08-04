import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails, updateUserRequestSchema } from '@harness-hub/schemas';
import { parseJsonRequest, problemResponse } from '../../../../../features/user-org-admin/http.js';
import { userOrgAdminRuntime } from '../../../../../features/user-org-admin/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

function contextFor(tenantId: string, actorId: string) {
  return createRepositoryContext({ tenantId, actorId });
}

type Params = { readonly id: string };

/** GET /api/v1/users/:id — 個別ダッシュボード (workspace-admin+)。 */
export const GET = withAuthz<Params>(
  {
    action: 'users.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) =>
      requestScopedResource(request, { type: 'user', id: params.id, workspaceId: null }),
  },
  async (_request, authz, params) => {
    const result = await userOrgAdminRuntime().service.getUser(
      contextFor(authz.resource.tenantId, authz.principal.userId),
      params.id,
      authz.effectiveRole,
      authz.principal.userId,
    );
    if (result === null) {
      return problemResponse(problemDetails({ title: '見つかりません', status: 404 }));
    }
    return Response.json(result);
  },
);

/**
 * PATCH /api/v1/users/:id — role/status/department/salary の更新 (AD-3)。
 * role/salary を含む要求は、`users.write` に加えてそれぞれ `users.role_change`/`users.write_salary` を
 * 追加で要求する (現行の規則表では強度は同じ workspace-admin だが、AD-3 の語彙分離を route でも保つ)。
 */
export const PATCH = withAuthz<Params>(
  {
    action: 'users.write',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) =>
      requestScopedResource(request, { type: 'user', id: params.id, workspaceId: null }),
  },
  async (request, authz, params) => {
    const parsed = await parseJsonRequest(request, updateUserRequestSchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.role !== undefined && !authz.can('users.role_change')) {
      return problemResponse(
        problemDetails({ title: '権限が不足しています', status: 403, detail: 'role の変更には追加の権限が必要です。' }),
      );
    }
    if (parsed.data.salary !== undefined && !authz.can('users.write_salary')) {
      return problemResponse(
        problemDetails({
          title: '権限が不足しています',
          status: 403,
          detail: 'salary の変更には追加の権限が必要です。',
        }),
      );
    }

    const result = await userOrgAdminRuntime().service.updateUser(
      contextFor(authz.resource.tenantId, authz.principal.userId),
      params.id,
      parsed.data,
      authz.principal.userId,
    );
    return Response.json(result);
  },
);
