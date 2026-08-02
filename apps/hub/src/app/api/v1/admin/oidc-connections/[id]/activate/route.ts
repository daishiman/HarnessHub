/**
 * `POST /api/v1/admin/oidc-connections/{id}/activate` — 接続の有効化。
 *
 * **ここが唯一、テナントのログイン経路が実際に切り替わる瞬間**。
 * 2 つの意味を 1 本にまとめてある:
 *   - rotation が staging されていれば「新 secret への切替」
 *   - 無ければ `tested` → `active` の「初回有効化」
 *
 * どちらも接続テスト合格が前提で、その判定は DB の述語 (`pendingTestedAt IS NOT NULL` /
 * `expectedStatus = 'tested'`) が持つ。route が順序を守らせるのではなく、順序を破る要求が
 * 0 行更新に落ちる形にしてある。
 *
 * 成功すると同テナントの他の `active` 接続は無効化される (active は 1 件に収束させる)。
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
    const result = await authRuntime().oidcAdmin.activate(
      { tenantId: authz.resource.tenantId, actorSubject: authz.principal.userId },
      { connectionId: params.id },
    );
    return oidcAdminResponse(result, (value) => oidcConnectionMutationResponseSchema.parse(value));
  },
);
