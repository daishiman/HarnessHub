/**
 * `POST /api/v1/admin/oidc-connections/{id}/rotation` — 新 client_secret の staging。
 * `DELETE /api/v1/admin/oidc-connections/{id}/rotation` — staging の破棄 (rotation の取消)。
 *
 * **どちらも現行 credential に触れない。** staging 中もテナントのログインは旧 secret で動き続け、
 * 切替が起きるのは activate だけ。rotation を「保存 → テスト → 切替」の 3 手に割ってあるのは、
 * 1 手で差し替える設計だと Google Cloud Console 側の反映待ちや打ち間違いが
 * そのまま全員のログイン不能になるため。
 */

import { oidcConnectionMutationResponseSchema, oidcSecretRotationStageRequestSchema } from '@harness-hub/schemas';

import {
  OIDC_CONNECTION_RESOURCE_TYPE,
  oidcAdminErrorResponse,
  oidcAdminResponse,
  readJsonBody,
} from '../../../../../../../lib/auth/oidc-admin/index.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../../../lib/authz/index.js';

interface OidcConnectionRouteParams {
  readonly id: string;
}

const resolveConnectionResource = async (request: Request, params: OidcConnectionRouteParams) =>
  requestScopedResource(request, { type: OIDC_CONNECTION_RESOURCE_TYPE, id: params.id });

export const POST = withAuthz<OidcConnectionRouteParams>(
  {
    action: 'idp.connection_change',
    deps: () => authRuntime().authz,
    resolveResource: resolveConnectionResource,
  },
  async (request, authz, params) => {
    const parsed = oidcSecretRotationStageRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return oidcAdminErrorResponse('invalid_request');

    const result = await authRuntime().oidcAdmin.stageRotation(
      { tenantId: authz.resource.tenantId, actorSubject: authz.principal.userId },
      { connectionId: params.id, clientSecret: parsed.data.client_secret },
    );
    return oidcAdminResponse(result, (value) => oidcConnectionMutationResponseSchema.parse(value));
  },
);

export const DELETE = withAuthz<OidcConnectionRouteParams>(
  {
    action: 'idp.connection_change',
    deps: () => authRuntime().authz,
    resolveResource: resolveConnectionResource,
  },
  async (_request, authz, params) => {
    const result = await authRuntime().oidcAdmin.discardRotation(
      { tenantId: authz.resource.tenantId, actorSubject: authz.principal.userId },
      { connectionId: params.id },
    );
    return oidcAdminResponse(result, (value) => oidcConnectionMutationResponseSchema.parse(value));
  },
);
