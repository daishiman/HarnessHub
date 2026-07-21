// 第 2 consumer 系統による AI job queue (apps/hub/src/shared/aijob) の利用。
// pull 型の境界だけを使い、job 実行そのもの (D5: Claude Code セッション側) には踏み込まない。
import {
  type AiJob,
  type AiJobQueue,
  type AiJobStore,
  createAiJobQueue,
  type EnqueueAiJobInput,
} from '../../../src/shared/aijob/index.js';

export const boundCreateAiJobQueue = createAiJobQueue;

export const sampleEnqueueInput: EnqueueAiJobInput = {
  tenantId: 'tenant-a',
  workspaceId: 'workspace-1',
  kind: 'harness.review',
  payload: { harnessId: 'h-1' },
  idempotencyKey: 'enqueue-1',
};

/** 呼び出しを記録するだけの store。queue の判断が store 側に漏れていないことを見るために使う */
export function createRecordingStore(calls: string[]): AiJobStore {
  const job: AiJob = {
    id: 'job-1',
    tenantId: 'tenant-a',
    workspaceId: 'workspace-1',
    kind: 'harness.review',
    payload: {},
    status: 'queued',
    enqueuedAt: '2026-07-21T00:00:00.000Z',
    leaseExpiresAt: null,
  };
  return {
    upsertQueued: async () => {
      calls.push('upsertQueued');
      return job;
    },
    takeNextQueued: async () => {
      calls.push('takeNextQueued');
      return job;
    },
    markSucceeded: async () => {
      calls.push('markSucceeded');
      return job;
    },
    markFailed: async () => {
      calls.push('markFailed');
      return job;
    },
  };
}

export function queueWith(calls: string[]): AiJobQueue {
  return createAiJobQueue({ store: createRecordingStore(calls) });
}
