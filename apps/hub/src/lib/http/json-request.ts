import { PROBLEM_JSON_MEDIA_TYPE, type ProblemDetails, parseRequest, problemDetails } from '@harness-hub/schemas';
import type { z } from 'zod';

import { RequestBodyTooLargeError, readBoundedJson } from './bounded-json.js';

export function problemResponse(problem: ProblemDetails): Response {
  return Response.json(problem, {
    status: problem.status,
    headers: { 'content-type': PROBLEM_JSON_MEDIA_TYPE },
  });
}

export async function parseJsonRequest<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
  options: { readonly maxBytes?: number } = {},
): Promise<
  { readonly ok: true; readonly data: z.output<TSchema> } | { readonly ok: false; readonly response: Response }
> {
  let body: unknown;
  try {
    body = options.maxBytes === undefined ? await request.json() : await readBoundedJson(request, options.maxBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return {
        ok: false,
        response: problemResponse(
          problemDetails({
            title: 'リクエスト本文が大きすぎます',
            status: 413,
            detail: `JSON本文は${options.maxBytes} bytes以下で送信してください。`,
            instance: new URL(request.url).pathname,
          }),
        ),
      };
    }
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
