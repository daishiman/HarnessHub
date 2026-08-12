import { PROBLEM_JSON_MEDIA_TYPE, type ProblemDetails, parseRequest, problemDetails } from '@harness-hub/schemas';
import type { z } from 'zod';

class RequestBodyTooLargeError extends Error {}

async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new RequestBodyTooLargeError();
  if (request.body === null) return JSON.parse('');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel('request body too large');
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

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
