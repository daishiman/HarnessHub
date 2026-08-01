/**
 * `POST /api/v1/publish/{id}/submit` — 検査へ送る。
 *
 * 本文を持たない。何を公開するかは既にアップロード済みのパッケージが決めており、
 * ここで内容を渡せるようにすると「検査した物と公開する物が違う」経路ができる。
 */

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  jsonFailure,
  jsonOk,
  resolvePublishRequestResource,
  submitPublishRequest,
  toPublishRequestView,
  withPublishMutation,
} from '../../../../../../lib/publish/index.js';

interface SubmitRouteParams {
  readonly id: string;
}

export const POST = withAuthz<SubmitRouteParams>(
  {
    action: 'publish.write',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolvePublishRequestResource(request, params.id, principal),
  },
  async (request, authz, params) =>
    withPublishMutation(request, authz, { ledgerScope: 'publish.submit' }, async (_input, runtime, scope) => {
      const result = await submitPublishRequest(runtime, scope, params.id);
      return result.ok ? jsonOk(toPublishRequestView(result.value)) : jsonFailure(result);
    }),
);
