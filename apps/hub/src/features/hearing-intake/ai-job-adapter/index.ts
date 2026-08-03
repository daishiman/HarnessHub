/** 共通 ai_jobs と sheet_generation 固有 DTO の間を結ぶ consumer adapter。 */

import type { AiJobRow } from '@harness-hub/db';
import {
  type HearingSheetEstimate,
  type HearingSheetFormSnapshot,
  type PulledAiJob,
  pulledAiJobSchema,
  type SheetGenerationPayload,
  type SheetGenerationResult,
  sheetGenerationPayloadSchema,
  sheetGenerationResultSchema,
} from '@harness-hub/schemas';

export function buildSheetGenerationPayload(input: {
  readonly sheetId: string;
  readonly sheetCode: string;
  readonly form: HearingSheetFormSnapshot;
  readonly estimate: HearingSheetEstimate;
}): SheetGenerationPayload {
  return sheetGenerationPayloadSchema.parse({
    sheet_id: input.sheetId,
    sheet_code: input.sheetCode,
    form: input.form,
    estimate: {
      savedHoursPerYear: input.estimate.savedHoursPerYear,
      savedAmountPerYear: input.estimate.savedAmountPerYear,
    },
  });
}

export function toPulledJob(row: AiJobRow): PulledAiJob {
  return pulledAiJobSchema.parse({
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(row.payloadJson) as unknown,
    lease_expires_at: row.leaseExpiresAt,
  });
}

export function serializeGenerationResult(input: unknown): string {
  return JSON.stringify(sheetGenerationResultSchema.parse(input));
}

export function parseGenerationResult(input: string | null): SheetGenerationResult | null {
  if (input === null) return null;
  const parsed = sheetGenerationResultSchema.safeParse(JSON.parse(input) as unknown);
  return parsed.success ? parsed.data : null;
}
