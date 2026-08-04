import { updateNotificationSettingsRequestSchema } from '@harness-hub/schemas';
import { parseJsonRequest } from '../../../../../features/user-org-admin/http.js';
import { userOrgAdminRuntime } from '../../../../../features/user-org-admin/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

/**
 * GET/PATCH /api/v1/me/notification-settings — `user_settings` の通知種別トグル (AD-7 §3)。
 * `me.read`/`me.update` を再利用する (別 action を新設しない。self-only の強度が同じ member のため)。
 */
export const GET = withAuthz(
  {
    action: 'me.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) =>
      requestScopedResource(request, {
        type: 'user_notification_settings',
        id: principal.userId,
        ownerUserId: principal.userId,
        workspaceId: null,
      }),
  },
  async (_request, authz) => {
    const result = await userOrgAdminRuntime().service.getNotificationSettings(authz.principal.userId);
    return Response.json(result);
  },
);

export const PATCH = withAuthz(
  {
    action: 'me.update',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) =>
      requestScopedResource(request, {
        type: 'user_notification_settings',
        id: principal.userId,
        ownerUserId: principal.userId,
        workspaceId: null,
      }),
  },
  async (request, authz) => {
    const parsed = await parseJsonRequest(request, updateNotificationSettingsRequestSchema);
    if (!parsed.ok) return parsed.response;
    const result = await userOrgAdminRuntime().service.updateNotificationSettings(authz.principal.userId, parsed.data);
    return Response.json(result);
  },
);
