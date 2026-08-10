/**
 * POST /api/v1/metrics/events — 実行ログ ingest (sys-metrics-tracking-p05 / B2 / SEC5)。
 *
 * 何を: CLI/ハーネスが「何回実行したか」だけを短命 Bearer token で申告する口。
 * なぜ: 削減効果 (G5) の母数になる実行実績を、クライアントの自己申告に汚染されずに集めるため。
 *
 * SEC5 の担保が 3 段になっている:
 *   1. 認可規則 (`metrics.ingest`) が `credential: access_token` + `scope: metrics:write` を要求する。
 *      ブラウザ session では呼べない (人手で回数を水増しする経路を塞ぐ)。
 *   2. body schema が `.strict()` なので、時刻・金額・係数を含む要求は parse 段階で 400 になる。
 *   3. repository の入力型に `occurredAt` が無く、発生時刻は `serverNow()` しか採れない。
 *
 * 冪等性は `Idempotency-Key` ヘッダ必須。CLI のリトライが二重計上にならないよう、
 * 同じキーの再送は新規計上せず既存 event の応答を 200 で返す (`deduplicated: true`)。
 */
import { createRepositoryContext, MetricsIdempotencyKeyReuseError } from '@harness-hub/db';
import { type MetricsEventIngestResponse, metricsEventIngestRequestSchema, problemDetails } from '@harness-hub/schemas';

import {
  parseJsonRequest,
  problemResponse,
  readIdempotencyKey,
} from '../../../../../features/metrics-tracking/http.js';
import { metricsTrackingRuntime } from '../../../../../features/metrics-tracking/runtime.js';
import { authRuntime, requestScopedResource, withAuthz } from '../../../../../lib/authz/index.js';

export const POST = withAuthz(
  {
    action: 'metrics.ingest',
    deps: () => authRuntime().authz,
    resolveResource: async (request) => requestScopedResource(request, { type: 'metrics_event' }),
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

    const idempotencyKey = readIdempotencyKey(request);
    if (!idempotencyKey.ok) return idempotencyKey.response;

    const parsed = await parseJsonRequest(request, metricsEventIngestRequestSchema);
    if (!parsed.ok) return parsed.response;

    let result: MetricsEventIngestResponse;
    try {
      result = await metricsTrackingRuntime().service.ingestEvent({
        context: createRepositoryContext({
          tenantId: authz.resource.tenantId,
          workspaceId: authz.resource.workspaceId,
          // client body ではなく、検証済み access token の principal を唯一の主体情報にする。
          actorId: authz.principal.userId,
        }),
        workspaceId: authz.resource.workspaceId,
        idempotencyKey: idempotencyKey.data,
        request: parsed.data,
      });
    } catch (error) {
      if (!(error instanceof MetricsIdempotencyKeyReuseError)) throw error;
      return problemResponse(
        problemDetails({
          title: 'Idempotency-Key が別の要求に使用されています',
          status: 422,
          detail: error.message,
          instance: new URL(request.url).pathname,
        }),
      );
    }

    // 重複でも 200。新規計上だけ 201 にすると、CLI が「再送で 200 が返った = 失敗」と誤読しかねない。
    return Response.json(result, { status: result.deduplicated ? 200 : 201 });
  },
);
