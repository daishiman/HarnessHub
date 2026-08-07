import { updateDisplaySettingsRequestSchema } from '@harness-hub/schemas';
import { parseJsonRequest } from '../../../../../features/user-org-admin/http.js';
import { userOrgAdminRuntime } from '../../../../../features/user-org-admin/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

/**
 * GET/PATCH /api/v1/me/display-settings — `user_settings` の theme/density/language (AD-2 §S18)。
 * `me.read`/`me.update` を再利用する (notification-settings と同じ判断。self-only の強度が同じ member のため)。
 */
export const GET = withAuthz(
  {
    action: 'me.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) =>
      requestScopedResource(request, {
        type: 'user_display_settings',
        id: principal.userId,
        ownerUserId: principal.userId,
        workspaceId: null,
      }),
  },
  async (_request, authz) => {
    const result = await userOrgAdminRuntime().service.getDisplaySettings(authz.principal.userId);
    return Response.json(result);
  },
);

export const PATCH = withAuthz(
  {
    action: 'me.update',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) =>
      requestScopedResource(request, {
        type: 'user_display_settings',
        id: principal.userId,
        ownerUserId: principal.userId,
        workspaceId: null,
      }),
  },
  async (request, authz) => {
    const parsed = await parseJsonRequest(request, updateDisplaySettingsRequestSchema);
    if (!parsed.ok) return parsed.response;
    const result = await userOrgAdminRuntime().service.updateDisplaySettings(authz.principal.userId, parsed.data);
    return Response.json(result);
  },
);
