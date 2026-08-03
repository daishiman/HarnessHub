/**
 * `GET /api/v1/projects/{id}/releases` — project 配下の Release 一覧。
 *
 * 認可 action は `harnesses.read` (member 以上)。Release の一覧は「何が配られているか」であり、
 * 公開作業の権限が無い利用者にも見える必要がある。
 */

import { releaseListResponseSchema } from '@harness-hub/schemas';

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  jsonOk,
  listProjectReleases,
  nextCursorOf,
  publishRuntime,
  publishScopeOf,
  resolveProjectResource,
  toReleaseView,
} from '../../../../../../lib/publish/index.js';

interface ProjectRouteParams {
  readonly id: string;
}

export const GET = withAuthz<ProjectRouteParams>(
  {
    action: 'harnesses.read',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolveProjectResource(request, params.id, principal),
  },
  async (_request, authz, params) => {
    const runtime = await publishRuntime();
    const items = await listProjectReleases(runtime, publishScopeOf(authz), params.id);
    const body = releaseListResponseSchema.parse({
      items: items.map(toReleaseView),
      // channel を跨いで集めた結果なので、ここでは分割せず全件を返す。
      // 契約上 next_cursor は必須キーなので null を明示する
      next_cursor: nextCursorOf(items, Number.POSITIVE_INFINITY),
    });
    return jsonOk(body);
  },
);
