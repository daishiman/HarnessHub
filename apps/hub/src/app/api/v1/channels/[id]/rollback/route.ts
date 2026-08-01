/**
 * `POST /api/v1/channels/{id}/rollback` — stable pointer を過去の Release へ戻す。
 *
 * 戻す先の Release を**再検査しない**。既に一度通った物であり、
 * 障害時に「検査に時間がかかって戻せない」のが最悪の結果になるため。
 */

import { rollbackRequestSchema, targetChannelSchema } from '@harness-hub/schemas';

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  jsonFailure,
  jsonOk,
  resolveChannelResource,
  rollbackChannel,
  toChannelView,
  withPublishMutation,
} from '../../../../../../lib/publish/index.js';

interface ChannelRouteParams {
  readonly id: string;
}

export const POST = withAuthz<ChannelRouteParams>(
  {
    action: 'channel.rollback',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolveChannelResource(request, params.id, principal),
  },
  async (request, authz, params) =>
    withPublishMutation(
      request,
      authz,
      { ledgerScope: 'channel.rollback', schema: rollbackRequestSchema },
      async (input, runtime, scope) => {
        const result = await rollbackChannel(runtime, scope, params.id, input.release_id);
        return result.ok ? jsonOk(targetChannelSchema.parse(toChannelView(result.value))) : jsonFailure(result);
      },
    ),
);
