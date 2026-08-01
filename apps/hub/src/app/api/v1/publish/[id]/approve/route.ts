/**
 * `POST /api/v1/publish/{id}/approve` — 承認し、そのまま公開まで進める。
 *
 * 認可 action は `publish.approve` (workspace-admin 以上・セッション限定)。
 * publisher token では通らない — 承認は人の判断であり、CI から自動で押せる形にしない。
 */

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  approvePublishRequest,
  jsonFailure,
  jsonOk,
  resolvePublishRequestResource,
  toPublishRequestView,
  withPublishMutation,
} from '../../../../../../lib/publish/index.js';

interface ApproveRouteParams {
  readonly id: string;
}

export const POST = withAuthz<ApproveRouteParams>(
  {
    action: 'publish.approve',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolvePublishRequestResource(request, params.id, principal),
  },
  async (request, authz, params) =>
    withPublishMutation(request, authz, { ledgerScope: 'publish.approve' }, async (_input, runtime, scope) => {
      const result = await approvePublishRequest(runtime, scope, params.id);
      return result.ok ? jsonOk(toPublishRequestView(result.value)) : jsonFailure(result);
    }),
);
