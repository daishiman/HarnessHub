/**
 * `POST /api/v1/admin/oidc-connections/{id}/test` — 接続テスト。
 *
 * 利用者を巻き込まずに credential の生死を確かめる唯一の経路
 * (仕組みは `lib/auth/oidc-admin/connection-test.ts` の冒頭)。
 *
 * この route は**状態を進める**ことがある: `pending` の接続が合格すれば `tested` へ、
 * rotation 中の secret が合格すれば「検証済み」印が付く。読み取りではないので
 * `idp.connection_change` を要求する。
 */

import { oidcConnectionTestRequestSchema, oidcConnectionTestResponseSchema } from '@harness-hub/schemas';

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

export const POST = withAuthz<OidcConnectionRouteParams>(
  {
    action: 'idp.connection_change',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) =>
      requestScopedResource(request, { type: OIDC_CONNECTION_RESOURCE_TYPE, id: params.id }),
  },
  async (request, authz, params) => {
    // 本文なしを許す。既定は current — rotation していない接続の「とりあえずテスト」を
    // 空 POST でできるようにするため
    const parsed = oidcConnectionTestRequestSchema.safeParse((await readJsonBody(request)) ?? {});
    if (!parsed.success) return oidcAdminErrorResponse('invalid_request');

    const result = await authRuntime().oidcAdmin.test(
      { tenantId: authz.resource.tenantId, actorSubject: authz.principal.userId },
      { connectionId: params.id, target: parsed.data.target },
    );
    // テスト不合格は業務上の正常系 (200 + passed:false)。HTTP エラーにすると
    // 「Hub が壊れた」と「credential が違う」を client が区別できない
    return oidcAdminResponse(result, (value) => oidcConnectionTestResponseSchema.parse(value));
  },
);
