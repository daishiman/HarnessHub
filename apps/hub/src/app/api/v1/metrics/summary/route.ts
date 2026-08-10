/**
 * GET /api/v1/metrics/summary — S09 ダッシュボード / S16 の供給元 (sys-metrics-tracking-p05 / I10)。
 *
 * 何を: 期間を指定して KPI・推移・ハーネス別ランキング・部門別内訳を返す。
 * なぜ: 画面が rollup を自分で畳み込むと、同じ数字が画面ごとに違う値になりうるため、
 *       集計はサーバ側の 1 経路に閉じる (受入条件「S09/S16 が rollup 由来のデータで描画される」)。
 *
 * 金額はすべて cron が確定させた rollup の値をそのまま返す。この route は換算を行わない。
 */
import { createRepositoryContext } from '@harness-hub/db';
import { metricsSummaryQuerySchema, problemDetails } from '@harness-hub/schemas';

import { parseQuery, problemResponse } from '../../../../../features/metrics-tracking/http.js';
import { metricsTrackingRuntime } from '../../../../../features/metrics-tracking/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

export const GET = withAuthz(
  {
    action: 'metrics.read_aggregate',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'metrics_summary' }),
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

    const parsed = parseQuery(request, metricsSummaryQuerySchema);
    if (!parsed.ok) return parsed.response;

    const summary = await metricsTrackingRuntime().service.getSummary({
      context: createRepositoryContext({
        tenantId: authz.resource.tenantId,
        workspaceId: authz.resource.workspaceId,
        actorId: authz.principal.userId,
      }),
      query: parsed.data,
    });
    return Response.json(summary);
  },
);
