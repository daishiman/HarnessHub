/**
 * GET /api/v1/metrics/rollups — 確定済み rollup の読取専用 API (sys-metrics-tracking-p05 / B3 / SEC4)。
 *
 * 何を: 期間・粒度・集計次元を指定して rollup 行をそのまま返す。書込 method は生やさない。
 * なぜ: rollup を確定させてよいのは Workers cron だけ。API から書けるようにすると、
 *       サーバ側でのみ金額換算する (SEC5) という前提が API 経由で崩れる。
 *
 * `dim=user` だけ扱いが違う。個人別の削減額が見えるため、金額から年収を逆算されうる (SEC4)。
 * 判定には `users.read_salary` の認可規則を使う — 「個人の給与に相当する情報を見てよいか」という
 * 同じ問いだから。role 文字列をここで比較しないのは、認可の正本を `lib/authz` の規則表 1 箇所に
 * 保つため (`apps/hub/scripts/check-single-authz-middleware.mjs` が機械検査する)。
 */
import { createRepositoryContext } from '@harness-hub/db';
import { metricsRollupsQuerySchema, problemDetails } from '@harness-hub/schemas';

import { parseQuery, problemResponse } from '../../../../../features/metrics-tracking/http.js';
import { metricsTrackingRuntime } from '../../../../../features/metrics-tracking/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

export const GET = withAuthz(
  {
    action: 'metrics.read_aggregate',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'metrics_rollup' }),
  },
  async (request, authz) => {
    if (authz.resource.workspaceId === null) {
      return problemResponse(
        problemDetails({
          title: 'Workspace を指定してください',
          status: 400,
          detail: 'x-harness-workspace-id ヘッダーが必要です。',
          instance: new URL(request.url).pathname,
        }),
      );
    }

    const parsed = parseQuery(request, metricsRollupsQuerySchema);
    if (!parsed.ok) return parsed.response;

    if (parsed.data.dim === 'user' && !authz.can('users.read_salary')) {
      return problemResponse(
        problemDetails({
          title: '個人別の集計を参照する権限がありません',
          status: 403,
          detail: 'dim=user の集計は管理者のみ参照できます。',
          instance: new URL(request.url).pathname,
        }),
      );
    }

    const rollups = await metricsTrackingRuntime().service.listRollups({
      context: createRepositoryContext({
        tenantId: authz.resource.tenantId,
        workspaceId: authz.resource.workspaceId,
        actorId: authz.principal.userId,
      }),
      query: parsed.data,
    });
    return Response.json(rollups);
  },
);
