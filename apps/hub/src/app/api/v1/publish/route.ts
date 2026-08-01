/**
 * `POST /api/v1/publish` — 公開要求の作成 / `GET /api/v1/publish` — 一覧。
 *
 * どちらも認可 action は `publish.request`。読み取りに別 action を作らないのは、
 * 「自分が出せる要求は自分で見られる」が成り立つ範囲で権限を増やさないため。
 */

import { createPublishRequestSchema, publishListQuerySchema, publishListResponseSchema } from '@harness-hub/schemas';

import { authRuntime, withAuthz } from '../../../../lib/authz/index.js';
import {
  createPublishRequest,
  jsonFailure,
  jsonOk,
  listPublishRequests,
  nextCursorOf,
  publishRuntime,
  publishScopeOf,
  resolvePublishCreateResource,
  resolvePublishListResource,
  toPublishRequestView,
  withPublishMutation,
} from '../../../../lib/publish/index.js';

export const POST = withAuthz(
  {
    action: 'publish.request',
    deps: () => authRuntime().authz,
    // 作成前なので body の project_id から所有者を解決する。Request 本体は clone で保持される。
    resolveResource: async (request, _params, principal) => resolvePublishCreateResource(request, principal),
  },
  async (request, authz) =>
    withPublishMutation(
      request,
      authz,
      { ledgerScope: 'publish.create', schema: createPublishRequestSchema },
      async (input, runtime, scope) => {
        const result = await createPublishRequest(runtime, scope, {
          projectId: input.project_id,
          target: input.target,
          visibility: input.visibility,
        });
        return result.ok ? jsonOk(toPublishRequestView(result.value), 201) : jsonFailure(result);
      },
    ),
);

export const GET = withAuthz(
  {
    action: 'publish.request',
    deps: () => authRuntime().authz,
    resolveResource: async (request, _params, principal) => resolvePublishListResource(request, principal),
  },
  async (request, authz) => {
    const query = publishListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) return Response.json({ error: 'invalid_query' }, { status: 400 });

    const runtime = await publishRuntime();
    const items = await listPublishRequests(runtime, publishScopeOf(authz), {
      projectId: query.data.project_id,
      channelId: query.data.channel_id,
      status: query.data.status,
      cursor: query.data.cursor,
      limit: query.data.limit,
    });

    const body = publishListResponseSchema.parse({
      items: items.map(toPublishRequestView),
      next_cursor: nextCursorOf(items, query.data.limit),
    });
    return jsonOk(body);
  },
);
