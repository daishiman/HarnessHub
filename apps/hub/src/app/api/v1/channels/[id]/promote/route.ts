/**
 * `POST /api/v1/channels/{id}/promote` — stable pointer を指定 Release へ進める。
 *
 * rollback と実装は共有だが route と認可 action を分けている。同じ操作でも
 * 「新しい版へ進める」と「前の版へ戻す」は運用上まったく別の判断で、
 * 監査ログでも権限設計でも区別できないと困る。
 */

import { promoteRequestSchema, targetChannelSchema } from '@harness-hub/schemas';

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  jsonFailure,
  jsonOk,
  promoteChannel,
  resolveChannelResource,
  toChannelView,
  withPublishMutation,
} from '../../../../../../lib/publish/index.js';

interface ChannelRouteParams {
  readonly id: string;
}

export const POST = withAuthz<ChannelRouteParams>(
  {
    action: 'channel.promote',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolveChannelResource(request, params.id, principal),
  },
  async (request, authz, params) =>
    withPublishMutation(
      request,
      authz,
      { ledgerScope: 'channel.promote', schema: promoteRequestSchema },
      async (input, runtime, scope) => {
        const result = await promoteChannel(runtime, scope, params.id, input.release_id);
        return result.ok ? jsonOk(targetChannelSchema.parse(toChannelView(result.value))) : jsonFailure(result);
      },
    ),
);
