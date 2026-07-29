import { PROBLEM_JSON_MEDIA_TYPE, type ProblemDetails, parseRequest, problemDetails } from '@harness-hub/schemas';
import type { z } from 'zod';

export function problemResponse(problem: ProblemDetails): Response {
  return Response.json(problem, {
    status: problem.status,
    headers: { 'content-type': PROBLEM_JSON_MEDIA_TYPE },
  });
}

export async function parseJsonRequest<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<
  { readonly ok: true; readonly data: z.output<TSchema> } | { readonly ok: false; readonly response: Response }
> {
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
