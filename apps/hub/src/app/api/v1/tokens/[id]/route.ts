/**
 * `DELETE /api/v1/tokens/{id}` — publisher token の失効。
 *
 * 自分の token は member でも失効できる (`selfOnly`)。他人の token は workspace-admin 以上。
 * 失効は family 単位で、既に失効済みでも成功を返す (冪等 = べきとう: 何度実行しても結果が同じ)。
 */

import { tokenRevocationResponseSchema } from '@harness-hub/schemas';

import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

interface TokenRouteParams {
  readonly id: string;
}

export const DELETE = withAuthz<TokenRouteParams>(
  {
    action: 'token.revoke',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params) => {
      const base = requestScopedResource(request, { type: 'publisher_token', id: params.id });
      if (base === null) return null;

      // 所有者と Workspace は資源側の事実。要求の申告ではなく DB から取る
      const record = await authRuntime().ports.publisherTokens.findById(base.tenantId, params.id);
      if (record === null) {
        // 存在しない token は「所有者なし」として判定へ渡す。
        // member はここで not_owner (403) になり、存在の有無を区別できない
        return base;
      }

      return { ...base, workspaceId: record.workspaceId, ownerUserId: record.userId };
    },
  },
  async (_request, authz, params) => {
    const result = await authRuntime().deviceFlow.revokeToken({
      tenantId: authz.principal.tenantId,
      tokenId: params.id,
      actorUserId: authz.principal.userId,
    });

    if (result === null) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    const body = tokenRevocationResponseSchema.parse({
      id: params.id,
      status: 'revoked',
      revoked_count: result.revokedCount,
    });
    return Response.json(body, { status: 200 });
  },
);
