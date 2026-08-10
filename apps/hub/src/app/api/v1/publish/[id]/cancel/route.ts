/**
 * `POST /api/v1/publish/{id}/cancel` — 公開要求を draft へ戻す。
 *
 * 取消は Publisher CLI と Web S01 が自分の Project に対して行うため session/Bearer の owner 限定。
 * workspace-admin が他者の要求を却下する `publish.reject` とは所有関係の契約が異なるので、
 * 認可 action も `publish.cancel` として分ける。
 */

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  cancelPublishRequest,
  jsonFailure,
  jsonOk,
  resolvePublishRequestResource,
  toPublishRequestView,
  withPublishMutation,
} from '../../../../../../lib/publish/index.js';

interface CancelRouteParams {
  readonly id: string;
}

export const POST = withAuthz<CancelRouteParams>(
  {
    action: 'publish.cancel',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolvePublishRequestResource(request, params.id, principal),
  },
  async (request, authz, params) =>
    withPublishMutation(request, authz, { ledgerScope: 'publish.cancel' }, async (_input, runtime, scope) => {
      const result = await cancelPublishRequest(runtime, scope, params.id);
      return result.ok ? jsonOk(toPublishRequestView(result.value)) : jsonFailure(result);
    }),
);
