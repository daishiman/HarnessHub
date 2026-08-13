import { createRepositoryContext } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import { problemResponse } from '../../../../../features/home-dashboard/http.js';
import { homeDashboardRuntime } from '../../../../../features/home-dashboard/runtime.js';
import { authRuntime, requestScopedResource, sessionActionVisible, withAuthz } from '../../../../../lib/authz/index.js';

export const GET = withAuthz(
  {
    action: 'dashboard.summary_read',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'home_summary' }),
  },
  async (_request, authz) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
        }),
      );
    }

    // 集約 API への到達可否と、機能ごとのデータ閲覧可否は別問題。
    // (home-dashboard/service.ts の JSDoc 参照)。sheets は要対応判定が workspace 内の
    // 全申請者を横断するため `sheets.read_all` (workspace-admin) を要求する — `sheets.read_own`
    // だけでは他利用者のシートが視界に入り、権限混入 (計画のリスク事項) になる。
    // feedback/builds はレコード自体が workspace 共有の資源で所有者限定の閲覧概念がないため、
    // 一覧画面と同じ `*.read` (member) で揃える。
    const visibility = {
      sheets: sessionActionVisible(authz.principal.role, 'sheets.read_own'),
      sheetsReadAll: authz.can('sheets.read_all'),
      feedback: sessionActionVisible(authz.principal.role, 'feedback.read'),
      builds: sessionActionVisible(authz.principal.role, 'builds.read'),
    };

    const result = await homeDashboardRuntime().service.getSummary({
      context: createRepositoryContext({
        tenantId: authz.resource.tenantId,
        workspaceId: authz.resource.workspaceId,
        actorId: authz.principal.userId,
      }),
      workspaceId: authz.resource.workspaceId,
      actorUserId: authz.principal.userId,
      visibility,
    });
    return Response.json(result);
  },
);
