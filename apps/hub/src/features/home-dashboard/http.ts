import { PROBLEM_JSON_MEDIA_TYPE, type ProblemDetails } from '@harness-hub/schemas';

export function problemResponse(problem: ProblemDetails): Response {
  return Response.json(problem, {
    status: problem.status,
    headers: { 'content-type': PROBLEM_JSON_MEDIA_TYPE },
  });
}
