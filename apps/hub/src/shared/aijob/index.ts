// AI 処理キューの公開 contract。pull 型 (Claude Code セッションが取得して書戻す) の境界のみを定義する (shared-layers §2 / D5)

export type AiJobStatus = 'queued' | 'leased' | 'succeeded' | 'failed';

export interface AiJob {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  /** job 種別。語彙は consumer feature が定義する */
  readonly kind: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: AiJobStatus;
  readonly enqueuedAt: string;
  /** lease 期限。過ぎた leased job は再び pull 可能になる */
  readonly leaseExpiresAt: string | null;
}

export interface EnqueueAiJobInput {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly kind: string;
  readonly payload: Readonly<Record<string, unknown>>;
  /** 同一キーの再投入を 1 件に畳む冪等キー */
  readonly idempotencyKey: string;
}

export interface LeaseAiJobInput {
  readonly tenantId: string;
  /** 空配列を渡した場合は「対象なし」として何も返さない (deny-by-default と同じ思想) */
  readonly kinds: readonly string[];
  readonly leaseSeconds: number;
}

export interface CompleteAiJobInput {
  readonly jobId: string;
  readonly tenantId: string;
  readonly result: Readonly<Record<string, unknown>>;
}

export interface FailAiJobInput {
  readonly jobId: string;
  readonly tenantId: string;
  readonly reason: string;
}

/**
 * push (Hub からワーカーを叩く) ではなく pull を公開 contract とする。
 * Claude Code セッションは常時接続を持たないため、Hub 側から起動できない。
 */
export interface AiJobQueue {
  enqueue(input: EnqueueAiJobInput): Promise<AiJob>;
  /** 取得できる job が無ければ null。ポーリング側で例外処理を強いない */
  lease(input: LeaseAiJobInput): Promise<AiJob | null>;
  complete(input: CompleteAiJobInput): Promise<AiJob>;
  fail(input: FailAiJobInput): Promise<AiJob>;
}

/** queue 実体の永続化境界。実装は feat-domain-model-db / 後続 feature が提供する */
export interface AiJobStore {
  upsertQueued(input: EnqueueAiJobInput, now: Date): Promise<AiJob>;
  takeNextQueued(input: LeaseAiJobInput, now: Date): Promise<AiJob | null>;
  markSucceeded(input: CompleteAiJobInput, now: Date): Promise<AiJob>;
  markFailed(input: FailAiJobInput, now: Date): Promise<AiJob>;
}

export interface AiJobQueueOptions {
  readonly store: AiJobStore;
  readonly now?: () => Date;
}

export function createAiJobQueue(options: AiJobQueueOptions): AiJobQueue {
  const now = options.now ?? (() => new Date());

  return {
    enqueue: (input) => options.store.upsertQueued(input, now()),
    lease: (input) =>
      input.kinds.length === 0
        ? Promise.resolve(null)
        : options.store.takeNextQueued(input, now()),
    complete: (input) => options.store.markSucceeded(input, now()),
    fail: (input) => options.store.markFailed(input, now()),
  };
}
