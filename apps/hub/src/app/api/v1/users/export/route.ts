import { createRepositoryContext } from '@harness-hub/db';
import { problemDetailsFromZodError, userListQuerySchema } from '@harness-hub/schemas';
import { problemResponse } from '../../../../../features/user-org-admin/http.js';
import { userOrgAdminRuntime } from '../../../../../features/user-org-admin/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

function contextFor(tenantId: string, actorId: string) {
  return createRepositoryContext({ tenantId, actorId });
}

function escapeCsv(value: string | null): string {
  const raw = value ?? '';
  return /[",\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

/** GET /api/v1/users/export — salary を常にマスクしたユーザー一覧 CSV。 */
export const GET = withAuthz(
  {
    action: 'users.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'user_collection', workspaceId: null }),
  },
  async (request, authz) => {
    // 一覧と同じ絞り込みを受ける。画面のボタンは「一覧を CSV で書き出す」なので、
    // 絞り込み中に押したときだけ全件が出ると、ラベルと結果が食い違う。
    const url = new URL(request.url);
    const parsed = userListQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return problemResponse(problemDetailsFromZodError(parsed.error, { instance: url.pathname }));
    }
    const rows = await userOrgAdminRuntime().service.exportUsers(
      contextFor(authz.resource.tenantId, authz.principal.userId),
      { ...(parsed.data.q === undefined ? {} : { query: parsed.data.q }) },
    );
    const header = ['name', 'department', 'role', 'status', 'salary'];
    const lines = rows.map((row) =>
      [row.name, row.department, row.role, row.status, row.salary].map(escapeCsv).join(','),
    );
    return new Response([header.join(','), ...lines].join('\r\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="users.csv"',
      },
    });
  },
);
