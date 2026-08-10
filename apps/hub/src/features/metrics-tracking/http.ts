/**
 * metrics-tracking の HTTP 境界ヘルパー (sys-metrics-tracking-p05 / B2)。
 *
 * 何を: problem+json (RFC7807) の応答生成と、JSON body / query string の parse を 1 箇所へ寄せる。
 * なぜ: 3 つの route (`events` / `summary` / `rollups`) が同じ失敗形を返すため。
 *       route ごとに `Response.json({error})` を書くと、片方だけ media type や instance が欠ける。
 *
 * 他 feature (feedback-loop / docs-cms 等) も同名の薄い helper を各自持っている。
 * ここを共有 package へ引き上げないのは、共通層の owner が feat-hub-foundation であり、
 * 本 task の write scope 外だから (P05 の scope out: 共通部品自体の実装)。
 */
import { PROBLEM_JSON_MEDIA_TYPE, type ProblemDetails, parseRequest, problemDetails } from '@harness-hub/schemas';
import type { z } from 'zod';

export function problemResponse(problem: ProblemDetails): Response {
  return Response.json(problem, {
    status: problem.status,
    headers: { 'content-type': PROBLEM_JSON_MEDIA_TYPE },
  });
}

/** parse 系 helper の共通返り値。失敗側は「そのまま返せる Response」まで組み立てて返す。 */
export type ParseOutcome<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly response: Response };

export async function parseJsonRequest<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<ParseOutcome<z.output<TSchema>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: problemResponse(
        problemDetails({
          title: 'JSON を読み取れません',
          status: 400,
          detail: 'Content-Type: application/json で正しい JSON を送信してください。',
          instance: new URL(request.url).pathname,
        }),
      ),
    };
  }
  const parsed = parseRequest(schema, body, { instance: new URL(request.url).pathname });
  return parsed.ok ? parsed : { ok: false, response: problemResponse(parsed.problem) };
}

/**
 * query string を schema で検証する。
 * `.strict()` な query schema に対して未知パラメータを 400 にするため、
 * `Object.fromEntries` した生の値をそのまま渡す (既知キーだけを拾い直さない)。
 */
export function parseQuery<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): ParseOutcome<z.output<TSchema>> {
  const url = new URL(request.url);
  const parsed = parseRequest(schema, Object.fromEntries(url.searchParams.entries()), { instance: url.pathname });
  return parsed.ok ? parsed : { ok: false, response: problemResponse(parsed.problem) };
}

/** ingest の冪等キー header 名。CLI と route の双方がこの 1 箇所を参照する。 */
export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

/** 冪等キーの上限長。repository の一意索引に載る値なので、無制限に長い値は入口で落とす。 */
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;

/**
 * `Idempotency-Key` を必須として読む。
 *
 * 欠落を許して「無ければ毎回新規計上」にすると、CLI のリトライがそのまま二重計上になる。
 * 冪等性は運用で担保できない性質のものなので、header 無しは 400 で拒否する (backend-spec §4.9)。
 */
export function readIdempotencyKey(request: Request): ParseOutcome<string> {
  const raw = request.headers.get(IDEMPOTENCY_KEY_HEADER)?.trim() ?? '';
  if (raw.length === 0 || raw.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return {
      ok: false,
      response: problemResponse(
        problemDetails({
          title: 'Idempotency-Key ヘッダーが必要です',
          status: 400,
          detail: `1〜${MAX_IDEMPOTENCY_KEY_LENGTH} 文字の Idempotency-Key ヘッダーを付けて送信してください。`,
          instance: new URL(request.url).pathname,
        }),
      ),
    };
  }
  return { ok: true, data: raw };
}
