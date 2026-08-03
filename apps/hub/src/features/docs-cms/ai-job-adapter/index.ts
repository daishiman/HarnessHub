/** 共通 ai_jobs と doc_draft 固有 DTO の間を結ぶ consumer adapter。 */

import type { AiJobRow } from '@harness-hub/db';
import {
  type DocDraftPayload,
  type DocDraftResult,
  docDraftPayloadSchema,
  docDraftResultSchema,
  type PulledDocDraftJob,
  pulledDocDraftJobSchema,
} from '@harness-hub/schemas';

export function buildDocDraftPayload(input: {
  readonly documentId: string;
  readonly title: string;
  readonly outline: readonly string[];
}): DocDraftPayload {
  return docDraftPayloadSchema.parse({
    document_id: input.documentId,
    title: input.title,
    outline: input.outline,
  });
}

export function toPulledDocDraftJob(row: AiJobRow): PulledDocDraftJob {
  return pulledDocDraftJobSchema.parse({
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(row.payloadJson) as unknown,
    lease_expires_at: row.leaseExpiresAt,
  });
}

export function serializeDocDraftResult(input: unknown): string {
  return JSON.stringify(docDraftResultSchema.parse(input));
}

export function parseDocDraftResult(input: string | null): DocDraftResult | null {
  if (input === null) return null;
  const parsed = docDraftResultSchema.safeParse(JSON.parse(input) as unknown);
  return parsed.success ? parsed.data : null;
}
