/**
 * `POST /api/v1/admin/oidc-connections/{id}/disable` — 接続の無効化。
 *
 * 削除ではない。行を消すと「いつ・誰が止めたか」と last4 が同時に消え、
 * 障害調査で「そもそも登録されていたのか」から始めることになる。
 *
 * 無効化した接続は認証解決の対象外になり、復帰は `pending` からやり直す
 * (再度の接続テストを要求する)。`disabled → active` の近道を作らないのは、
 * 止めている間に Google 側で失効した credential を無検証で戻さないため。
 */

import { oidcConnectionMutationResponseSchema } from '@harness-hub/schemas';

import { OIDC_CONNECTION_RESOURCE_TYPE, oidcAdminResponse } from '../../../../../../../lib/auth/oidc-admin/index.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../../lib/authz/index.js';

interface OidcConnectionRouteParams {
  readonly id: string;
}

export const POST = withAuthz<OidcConnectionRouteParams>(
  {
    action: 'idp.connection_change',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) =>
      requestScopedResource(request, { type: OIDC_CONNECTION_RESOURCE_TYPE, id: params.id }),
  },
  async (_request, authz, params) => {
    const result = await authRuntime().oidcAdmin.disable(
      { tenantId: authz.resource.tenantId, actorSubject: authz.principal.userId },
      { connectionId: params.id },
    );
    return oidcAdminResponse(result, (value) => oidcConnectionMutationResponseSchema.parse(value));
  },
);
