/**
 * `GET /api/v1/tokens` — publisher token の一覧。
 *
 * `?workspace_id=` の有無で **要求する権限が変わる**ため、action を分けて 2 本の wrapper を用意し、
 * 入口で振り分ける。1 本の handler の中で「管理者なら他人の分も返す」と書くと、
 * 判定が規則表の外へ漏れる。
 *
 * 応答には平文 token を含めない (`tokenSummarySchema` の契約)。
 */

import { tokenListResponseSchema } from '@harness-hub/schemas';

import { authRuntime, type RouteContext, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';

type NoParams = Record<string, never>;

const listSelf = withAuthz<NoParams>(
  {
    action: 'token.list.self',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) =>
      // 自分の一覧なので所有者は呼び出し元。テナントは要求側の申告から取る
      requestScopedResource(request, { type: 'publisher_token', ownerUserId: principal.userId }),
  },
  async (_request, authz) => {
    const items = await authRuntime().deviceFlow.listTokensForUser({
      tenantId: authz.principal.tenantId,
      userId: authz.principal.userId,
    });
    return jsonList(items);
  },
);

const listWorkspace = withAuthz<NoParams>(
  {
    action: 'token.list.workspace',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => {
      const workspaceId = new URL(request.url).searchParams.get('workspace_id');
      if (workspaceId === null || workspaceId.length === 0) return null;
      return requestScopedResource(request, { type: 'publisher_token', workspaceId });
    },
  },
  async (_request, authz) => {
    // resolveResource が null を返さなかった時点で workspaceId は非 null
    const workspaceId = authz.resource.workspaceId as string;
    const items = await authRuntime().deviceFlow.listTokensForWorkspace({
      tenantId: authz.principal.tenantId,
      workspaceId,
    });
    return jsonList(items);
  },
);

export async function GET(request: Request, context?: RouteContext<NoParams>): Promise<Response> {
  const workspaceId = new URL(request.url).searchParams.get('workspace_id');
  return workspaceId === null ? listSelf(request, context) : listWorkspace(request, context);
}

function jsonList(items: readonly unknown[]): Response {
  const body = tokenListResponseSchema.parse({ items });
  return Response.json(body, { status: 200, headers: { 'cache-control': 'no-store' } });
}
