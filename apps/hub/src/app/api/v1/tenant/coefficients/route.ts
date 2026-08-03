import { createRepositoryContext } from '@harness-hub/db';
import { updateTenantCoefficientsRequestSchema } from '@harness-hub/schemas';
import { parseJsonRequest } from '../../../../../features/user-org-admin/http.js';
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

/** PATCH /api/v1/tenant/coefficients — owner port 経由の係数更新と値を含めない監査記録。 */
export const PATCH = withAuthz(
  {
    action: 'coefficients.change',
    deps: () => authRuntime().authz,
    resolveResource: async (request) =>
      requestScopedResource(request, { type: 'tenant_coefficients', workspaceId: null }),
  },
  async (request, authz) => {
    const parsed = await parseJsonRequest(request, updateTenantCoefficientsRequestSchema);
    if (!parsed.ok) return parsed.response;
    const result = await userOrgAdminRuntime().service.updateCoefficients(
      contextFor(authz.resource.tenantId, authz.principal.userId),
      parsed.data,
      authz.principal.userId,
    );
    return Response.json(result);
  },
);
