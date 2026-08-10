/**
 * `POST /api/v1/projects` — S01 Web 公開の開始点。
 *
 * tenant/workspace と owner は認可済み session からだけ導出する。本文にこれらを持たせないため、
 * Project を新規作成する Web 経路も既存 Project を使う CLI 経路より広い scope を持たない。
 */
import { createPublishProjectSchema, publishProjectSchema } from '@harness-hub/schemas';

import { authRuntime, requestScopedResource, withAuthz } from '../../../../lib/authz/index.js';
import { createPublishProject, jsonFailure, jsonOk, withPublishMutation } from '../../../../lib/publish/index.js';

export const POST = withAuthz(
  {
    action: 'projects.create',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'project' }),
  },
  async (request, authz) =>
    withPublishMutation(
      request,
      authz,
      { ledgerScope: 'projects.create', schema: createPublishProjectSchema },
      async (input, runtime, scope) => {
        const result = await createPublishProject(runtime, scope, input);
        if (!result.ok) return jsonFailure(result);
        return jsonOk(
          publishProjectSchema.parse({
            id: result.value.id,
            name: result.value.name,
            description: result.value.description,
          }),
          201,
        );
      },
    ),
);
