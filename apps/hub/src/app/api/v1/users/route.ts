import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails, problemDetailsFromZodError, userListQuerySchema } from '@harness-hub/schemas';
import { problemResponse } from '../../../../features/user-org-admin/http.js';
import { userOrgAdminRuntime } from '../../../../features/user-org-admin/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';

function contextFor(tenantId: string, actorId: string) {
  return createRepositoryContext({ tenantId, actorId });
}

/** GET /api/v1/users — 一覧 (workspace-admin+)。salary は viewer role に応じて service 側でマスクされる。 */
export const GET = withAuthz(
  {
    action: 'users.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'user_collection', workspaceId: null }),
  },
  async (request, authz) => {
    const url = new URL(request.url);
    const parsed = userListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return problemResponse(problemDetailsFromZodError(parsed.error, { instance: url.pathname }));
    }
    const result = await userOrgAdminRuntime().service.listUsers(
      contextFor(authz.resource.tenantId, authz.principal.userId),
      authz.effectiveRole,
      authz.principal.userId,
      { ...(parsed.data.q === undefined ? {} : { query: parsed.data.q }) },
    );
    return Response.json(result);
  },
);

/**
 * POST /api/v1/users (AD-3 の「事前登録」) は未実装。
 * 理由: `apps/hub/src/lib/auth/db-ports.ts` の JIT provisioning (`createFromOidc`) には
 * 事前登録行をメール等で引き取る仕組みが無く、先に事前登録行を作ると初回ログインで
 * 別行が作られ二重登録になる。この紐付けは feat-auth-tenancy 側の変更を要するため、
 * `tenant_coefficients` の書込み port 未実装と同じ扱いで 501 を返す (AD-4 決定3 と同型の判断)。
 */
export const POST = withAuthz(
  {
    action: 'users.write',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'user_collection', workspaceId: null }),
  },
  async (request) => {
    return problemResponse(
      problemDetails({
        title: '未実装です',
        status: 501,
        detail:
          '事前登録による利用者作成は、初回ログイン (JIT provisioning) との紐付け機構が feat-auth-tenancy 側に無いため未実装です。',
        instance: new URL(request.url).pathname,
      }),
    );
  },
);
