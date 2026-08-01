/**
 * `GET /api/v1/publish/{id}` — 公開要求 1 件の取得。
 *
 * 認可 action が `publish.write` なのは、この応答に findings (検査で見つかった問題の詳細) が
 * 含まれるため。閲覧専用の権限で他人のパッケージの弱点まで読めてしまうのを避ける。
 */

import { authRuntime, withAuthz } from '../../../../../lib/authz/index.js';
import {
  getPublishRequest,
  jsonFailure,
  jsonOk,
  publishRuntime,
  publishScopeOf,
  resolvePublishRequestResource,
  toPublishRequestView,
} from '../../../../../lib/publish/index.js';

interface PublishRouteParams {
  readonly id: string;
}

export const GET = withAuthz<PublishRouteParams>(
  {
    action: 'publish.write',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolvePublishRequestResource(request, params.id, principal),
  },
  async (_request, authz, params) => {
    const runtime = await publishRuntime();
    const result = await getPublishRequest(runtime, publishScopeOf(authz), params.id);
    return result.ok ? jsonOk(toPublishRequestView(result.value)) : jsonFailure(result);
  },
);
