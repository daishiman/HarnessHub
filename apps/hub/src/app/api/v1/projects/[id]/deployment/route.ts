/**
 * `POST /api/v1/projects/{id}/deployment` — web_app の deploy 結果を登録する。
 *
 * `exit_code` が 0 以外でも 201 を返す。「失敗したので登録しない」にすると、
 * 実際には公開されてしまった deployment が Hub から見えない孤児になり、
 * 後片付けの手掛かりが消える (§4.6 の注記)。
 */

import { deploymentReferenceSchema, registerDeploymentSchema } from '@harness-hub/schemas';

import { authRuntime, withAuthz } from '../../../../../../lib/authz/index.js';
import {
  jsonFailure,
  jsonOk,
  registerDeployment,
  resolveProjectResource,
  toDeploymentView,
  withPublishMutation,
} from '../../../../../../lib/publish/index.js';

interface ProjectRouteParams {
  readonly id: string;
}

export const POST = withAuthz<ProjectRouteParams>(
  {
    action: 'deployment.register',
    deps: () => authRuntime().authz,
    resolveResource: async (request, params, principal) => resolveProjectResource(request, params.id, principal),
  },
  async (request, authz, params) =>
    withPublishMutation(
      request,
      authz,
      { ledgerScope: 'deployment.register', schema: registerDeploymentSchema },
      async (input, runtime, scope) => {
        const result = await registerDeployment(runtime, scope, {
          projectId: params.id,
          channelId: input.channel_id,
          releaseId: input.release_id,
          url: input.url,
          provider: input.provider,
          exitCode: input.exit_code,
        });
        return result.ok
          ? jsonOk(deploymentReferenceSchema.parse(toDeploymentView(result.value)), 201)
          : jsonFailure(result);
      },
    ),
);
