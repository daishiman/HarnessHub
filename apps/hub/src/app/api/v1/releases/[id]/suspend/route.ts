/**
 * `POST /api/v1/releases/{id}/suspend` — Release の配布停止。
 *
 * Release は immutable だが `status` だけは更新できる (専用 endpoint に限る)。
 * 現在 stable の Release は停止できない — 先に rollback で pointer を移すのが正しい順序。
 */

import { releaseSchema } from '@harness-hub/schemas';

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  jsonFailure,
  jsonOk,
  resolveReleaseResource,
  suspendRelease,
  toReleaseView,
  withPublishMutation,
} from '../../../../../../lib/publish/index.js';

interface ReleaseRouteParams {
  readonly id: string;
}

export const POST = withAuthz<ReleaseRouteParams>(
  {
    action: 'release.suspend',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolveReleaseResource(request, params.id, principal),
  },
  async (request, authz, params) =>
    withPublishMutation(request, authz, { ledgerScope: 'release.suspend' }, async (_input, runtime, scope) => {
      const result = await suspendRelease(runtime, scope, params.id);
      return result.ok ? jsonOk(releaseSchema.parse(toReleaseView(result.value))) : jsonFailure(result);
    }),
);
