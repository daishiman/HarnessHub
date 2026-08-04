import { createRepositoryContext } from '@harness-hub/db';
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
  async (_request, authz) => {
    const rows = await userOrgAdminRuntime().service.exportUsers(
      contextFor(authz.resource.tenantId, authz.principal.userId),
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
