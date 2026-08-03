/**
 * ai-jobs/pull・complete・fail の kind-dispatch レジストリ (AD-4 汎化)。
 *
 * ai_jobs は kind を問わず 1 テーブル・1 CAS 実装を共有する (packages/db/repository/hearing-intake-queue.ts)。
 * route 側で残る差分は「どの feature の runtime へ委譲し、どの zod 契約と adapter を使うか」だけなので、
 * それを kind ごとに 1 エントリへ閉じ、pull/complete/fail route 本体は kind を知らなくてよい形にする。
 * 新しい kind (feedback_response 等) を足すときはここへ 1 エントリ追加するだけでよい。
 */
import type { AiJobRow, RepositoryContext } from '@harness-hub/db';
import {
  completeDocDraftJobRequestSchema,
  completeSheetGenerationJobRequestSchema,
  failDocDraftJobRequestSchema,
  failSheetGenerationJobRequestSchema,
  pullDocDraftJobRequestSchema,
  pullSheetGenerationJobRequestSchema,
} from '@harness-hub/schemas';
import type { z } from 'zod';

import { serializeDocDraftResult, toPulledDocDraftJob } from '../../features/docs-cms/ai-job-adapter/index.js';
import { docsCmsRuntime } from '../../features/docs-cms/runtime.js';
import { serializeGenerationResult, toPulledJob } from '../../features/hearing-intake/ai-job-adapter/index.js';
import { hearingIntakeRuntime } from '../../features/hearing-intake/runtime.js';

export interface AiQueueAdapter {
  readonly pullRequestSchema: z.ZodType;
  readonly completeRequestSchema: z.ZodType;
  readonly failRequestSchema: z.ZodType;
  toPulled(job: AiJobRow): unknown;
  serializeResult(input: unknown): string;
  claim(context: RepositoryContext, tokenId: string): Promise<AiJobRow | null>;
  complete(context: RepositoryContext, id: string, tokenId: string, resultJson: string): Promise<AiJobRow>;
  fail(context: RepositoryContext, id: string, tokenId: string, error: string): Promise<AiJobRow>;
}

export const AI_QUEUE_ADAPTERS: Readonly<Record<string, AiQueueAdapter>> = {
  sheet_generation: {
    pullRequestSchema: pullSheetGenerationJobRequestSchema,
    completeRequestSchema: completeSheetGenerationJobRequestSchema,
    failRequestSchema: failSheetGenerationJobRequestSchema,
    toPulled: (job) => toPulledJob(job),
    serializeResult: (input) => serializeGenerationResult(input),
    claim: (context, tokenId) => hearingIntakeRuntime().repository.claimNextSheetGenerationJob(context, tokenId),
    complete: (context, id, tokenId, resultJson) =>
      hearingIntakeRuntime().repository.completeSheetGenerationJob(context, id, tokenId, resultJson),
    fail: (context, id, tokenId, error) =>
      hearingIntakeRuntime().repository.failSheetGenerationJob(context, id, tokenId, error),
  },
  doc_draft: {
    pullRequestSchema: pullDocDraftJobRequestSchema,
    completeRequestSchema: completeDocDraftJobRequestSchema,
    failRequestSchema: failDocDraftJobRequestSchema,
    toPulled: (job) => toPulledDocDraftJob(job),
    serializeResult: (input) => serializeDocDraftResult(input),
    claim: (context, tokenId) => docsCmsRuntime().repository.claimNextDocDraftJob(context, tokenId),
    complete: (context, id, tokenId, resultJson) =>
      docsCmsRuntime().repository.completeDocDraftJob(context, id, tokenId, resultJson),
    fail: (context, id, tokenId, error) => docsCmsRuntime().repository.failDocDraftJob(context, id, tokenId, error),
  },
};

export function resolveAiQueueKind(rawKind: unknown): string {
  return typeof rawKind === 'string' && rawKind.length > 0 ? rawKind : 'sheet_generation';
}
