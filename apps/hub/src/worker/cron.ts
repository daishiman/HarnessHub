// Workers scheduled handler の dispatch 骨格。infrastructure-spec §5 の cron 2 系統をジョブ単位で冪等実行する。
// ジョブ本体 (rollup・使用量監視など) は各ドメイン feature の責務なので、ここには業務ロジックを書かない。

/** 日次バッチ (JST 0:00)。infrastructure-spec §5 */
export const DAILY_CRON = '0 15 * * *';
/** 週次バッチ (JST 月曜 9:00)。infrastructure-spec §5 */
export const WEEKLY_CRON = '0 0 * * 1';

/** cron heartbeat の ping 先を持つ実行環境。未設定なら ping しない (ローカル・preview 想定) */
export interface CronEnv {
  /** 外形監視 (Better Stack) の heartbeat URL。infrastructure-spec §5 */
  readonly CRON_HEARTBEAT_URL?: string;
  readonly [key: string]: unknown;
}

export interface CronJobContext {
  /** この起動が担当する論理時刻。event.scheduledTime をそのまま渡す */
  readonly scheduledAt: Date;
  readonly cron: string;
  /** 冪等キー。同じ cron の同じ論理時刻なら再実行しても同一値になる */
  readonly runKey: string;
  readonly env: CronEnv;
}

export interface CronJob {
  readonly id: string;
  run(context: CronJobContext): Promise<void>;
}

/**
 * 実行済み判定の置き場。Workers は同一 cron を再送しうるため、
 * 「同じ runKey は 1 回しか実行しない」を担保する境界をここで切っておく。
 * 永続実装 (DB テーブル) は feat-domain-model-db 側で差し込む。
 */
export interface CronRunLedger {
  /** 実行権を取れたら true。既に実行済みなら false */
  claim(runKey: string): Promise<boolean>;
}

export type CronJobStatus = 'succeeded' | 'failed';

export interface CronJobRecord {
  readonly jobId: string;
  readonly status: CronJobStatus;
  /** 失敗理由。secret を載せないため例外の message のみを短く保持する */
  readonly detail?: string;
}

export interface CronDispatchResult {
  readonly cron: string;
  readonly runKey: string;
  /** 既に同じ runKey が実行済みで、ジョブを 1 件も動かさなかった場合に true */
  readonly skipped: boolean;
  readonly jobs: readonly CronJobRecord[];
  readonly heartbeatSent: boolean;
}

export interface DispatchOptions {
  readonly cron: string;
  readonly scheduledAt: Date;
  readonly env: CronEnv;
  readonly ledger: CronRunLedger;
  /** 差し替え可能にしてテストからネットワークに出ないようにする */
  readonly fetchImpl?: typeof fetch;
  /** cron → ジョブ列の対応表。既定は本 module の registry */
  readonly registry?: CronRegistry;
}

export type CronRegistry = Readonly<Record<string, readonly CronJob[]>>;

/**
 * ジョブ本体は各 feature が実装する。ここでは「dispatch 対象として登録されている」ことだけを表現する。
 * 空実装のまま成功扱いにすると「cron は動いたが何もしていない」を検知できないため、
 * 未実装であることを id から読み取れる命名にしている。
 */
function pendingJob(id: string): CronJob {
  return {
    id,
    // 未実装ジョブは何もしないが、dispatch 対象からは外さない (外すと配線の欠落に気づけない)
    run: async () => {},
  };
}

/** infrastructure-spec §5 の割当。日次 4 ジョブ・週次 2 ジョブ */
export const DEFAULT_CRON_REGISTRY: CronRegistry = {
  [DAILY_CRON]: [
    pendingJob('metrics-rollup-daily'),
    pendingJob('turso-usage-monitor'),
    pendingJob('orphan-candidate-notify'),
    pendingJob('token-cleanup'),
  ],
  [WEEKLY_CRON]: [pendingJob('metrics-rollup-weekly'), pendingJob('weekly-summary-mail')],
};

/** 同じ cron の同じ論理時刻に対して安定する冪等キー */
export function buildRunKey(cron: string, scheduledAt: Date): string {
  return `${cron}@${scheduledAt.toISOString()}`;
}

/** 実行済み runKey をメモリ上に持つ既定実装。Worker isolate をまたぐ重複は防げない (永続実装は feat-domain-model-db) */
export function createInMemoryCronRunLedger(): CronRunLedger {
  const claimed = new Set<string>();
  return {
    claim: async (runKey) => {
      if (claimed.has(runKey)) return false;
      claimed.add(runKey);
      return true;
    },
  };
}

/**
 * cron を対応ジョブ列へ振り分けて順次実行する。
 * 失敗はジョブ単位で記録して後続を止めない (infrastructure-spec §5)。
 */
export async function dispatchScheduled(options: DispatchOptions): Promise<CronDispatchResult> {
  const registry = options.registry ?? DEFAULT_CRON_REGISTRY;
  const jobs = registry[options.cron];
  const runKey = buildRunKey(options.cron, options.scheduledAt);

  // 未登録の cron 式は「設定と実装の食い違い」なので黙って成功にしない
  if (jobs === undefined) {
    return {
      cron: options.cron,
      runKey,
      skipped: false,
      jobs: [{ jobId: 'dispatch', status: 'failed', detail: 'unregistered_cron' }],
      heartbeatSent: false,
    };
  }

  if (!(await options.ledger.claim(runKey))) {
    return { cron: options.cron, runKey, skipped: true, jobs: [], heartbeatSent: false };
  }

  const context: CronJobContext = {
    scheduledAt: options.scheduledAt,
    cron: options.cron,
    runKey,
    env: options.env,
  };

  const records: CronJobRecord[] = [];
  for (const job of jobs) {
    try {
      await job.run(context);
      records.push({ jobId: job.id, status: 'succeeded' });
    } catch (error) {
      records.push({ jobId: job.id, status: 'failed', detail: describeError(error) });
    }
  }

  // heartbeat は日次バッチの完走検知用 (infrastructure-spec §5 / qa-027)。
  // 1 件でも失敗していれば ping しない = 外形監視側が「cron が完走しなかった」と判定できる
  const allSucceeded = records.every((record) => record.status === 'succeeded');
  const heartbeatSent =
    options.cron === DAILY_CRON && allSucceeded
      ? await sendHeartbeat(options.env.CRON_HEARTBEAT_URL, options.fetchImpl)
      : false;

  return { cron: options.cron, runKey, skipped: false, jobs: records, heartbeatSent };
}

async function sendHeartbeat(url: string | undefined, fetchImpl?: typeof fetch): Promise<boolean> {
  if (typeof url !== 'string' || url.trim().length === 0) return false;
  const doFetch = fetchImpl ?? globalThis.fetch;
  try {
    const response = await doFetch(url, { method: 'POST' });
    return response.ok;
  } catch {
    // heartbeat の失敗自体で cron を失敗にしない (監視側が未達として検知する)
    return false;
  }
}

/** 例外 message をそのまま載せると接続文字列などが混ざりうるため長さを切る */
function describeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'unknown_error';
  return raw.length > 200 ? `${raw.slice(0, 197)}...` : raw;
}
