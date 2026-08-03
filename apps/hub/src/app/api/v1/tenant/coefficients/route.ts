import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';
import { problemResponse } from '../../../../../features/user-org-admin/http.js';
import { userOrgAdminRuntime } from '../../../../../features/user-org-admin/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

function contextFor(tenantId: string, actorId: string) {
  return createRepositoryContext({ tenantId, actorId });
}

/** GET /api/v1/tenant/coefficients — 見積係数の読取り (AD-4)。 */
export const GET = withAuthz(
  {
    action: 'coefficients.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) =>
      requestScopedResource(request, { type: 'tenant_coefficients', workspaceId: null }),
  },
  async (_request, authz) => {
    const result = await userOrgAdminRuntime().service.getCoefficients(
      contextFor(authz.resource.tenantId, authz.principal.userId),
    );
    return Response.json(result);
  },
);

/**
 * PATCH /api/v1/tenant/coefficients は未実装。
 * `HearingIntakeRepository` に `updateCoefficients` port が無く (owner は feat-hearing-intake)、
 * 本 feature 側で書込みを自前実装すると repository の二重定義になる (AD-4 決定3)。
 */
export const PATCH = withAuthz(
  {
    action: 'coefficients.change',
    deps: () => authRuntime().authz,
    resolveResource: async (request) =>
      requestScopedResource(request, { type: 'tenant_coefficients', workspaceId: null }),
  },
  async (request) => {
    return problemResponse(
      problemDetails({
        title: '未実装です',
        status: 501,
        detail: '見積係数の更新 port が feat-hearing-intake 側にまだ無いため、この操作は未実装です。',
        instance: new URL(request.url).pathname,
      }),
    );
  },
);
