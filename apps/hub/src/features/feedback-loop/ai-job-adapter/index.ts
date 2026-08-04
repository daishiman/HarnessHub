/** 共通 ai_jobs と feedback_response 固有 DTO の間を結ぶ consumer adapter。 */

import type { AiJobRow } from '@harness-hub/db';
import {
  type FeedbackResponseJobPayload,
  type FeedbackResponseJobResult,
  feedbackResponseJobPayloadSchema,
  feedbackResponseJobResultSchema,
  type PulledFeedbackResponseJob,
  pulledFeedbackResponseJobSchema,
} from '@harness-hub/schemas';

export function buildFeedbackResponsePayload(input: {
  readonly feedbackId: string;
  readonly feedbackCode: string;
  readonly type: FeedbackResponseJobPayload['type'];
  readonly body: string;
}): FeedbackResponseJobPayload {
  return feedbackResponseJobPayloadSchema.parse({
    feedback_id: input.feedbackId,
    feedback_code: input.feedbackCode,
    type: input.type,
    body: input.body,
  });
}

export function toPulledFeedbackResponseJob(row: AiJobRow): PulledFeedbackResponseJob {
  return pulledFeedbackResponseJobSchema.parse({
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(row.payloadJson) as unknown,
    lease_expires_at: row.leaseExpiresAt,
  });
}

export function serializeFeedbackResponseResult(input: unknown): string {
  return JSON.stringify(feedbackResponseJobResultSchema.parse(input));
}

export function parseFeedbackResponseResult(input: string | null): FeedbackResponseJobResult | null {
  if (input === null) return null;
  const parsed = feedbackResponseJobResultSchema.safeParse(JSON.parse(input) as unknown);
  return parsed.success ? parsed.data : null;
}
