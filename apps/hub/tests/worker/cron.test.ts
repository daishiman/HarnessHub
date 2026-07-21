// HF-CRON-001〜005: scheduled handler の dispatch 骨格を検証する (ADR §4 / infrastructure-spec §5)。
// ジョブ本体は各ドメイン feature の責務なので、ここで見るのは
// 「正しい cron に正しいジョブ列が割り当たる」「冪等である」「失敗が後続を止めない」「heartbeat が鳴る」の 4 点。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildRunKey,
  type CronJob,
  type CronRegistry,
  createInMemoryCronRunLedger,
  DAILY_CRON,
  DEFAULT_CRON_REGISTRY,
  dispatchScheduled,
  WEEKLY_CRON,
} from '../../src/worker/cron.js';

const SCHEDULED_AT = new Date('2026-07-21T15:00:00.000Z');
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** wrangler.jsonc を読む。行コメントを落としてから JSON として解釈する */
function readWranglerConfig(): { main?: string; triggers?: { crons?: string[] } } {
  const raw = readFileSync(path.join(APP_ROOT, 'wrangler.jsonc'), 'utf8');
  const stripped = raw
    .split('\n')
    .map((line) => line.replace(/^\s*\/\/.*$/, ''))
    .join('\n');
  return JSON.parse(stripped) as { main?: string; triggers?: { crons?: string[] } };
}

function baseOptions(overrides: Partial<Parameters<typeof dispatchScheduled>[0]> = {}) {
  return {
    cron: DAILY_CRON,
    scheduledAt: SCHEDULED_AT,
    env: {},
    ledger: createInMemoryCronRunLedger(),
    fetchImpl: (async () => new Response(null, { status: 200 })) as typeof fetch,
    ...overrides,
  };
}

function job(id: string, run: () => Promise<void> = async () => {}): CronJob {
  return { id, run };
}

describe('cron dispatch', () => {
  it('HF-CRON-001: wrangler.jsonc の cron 式と registry の key が一致している', () => {
    // 設定側にだけ cron を足して実装を忘れる (逆も同じ) 事故を検出する
    const config = readWranglerConfig();

    expect([...(config.triggers?.crons ?? [])].sort()).toStrictEqual(Object.keys(DEFAULT_CRON_REGISTRY).sort());
    expect([WEEKLY_CRON, DAILY_CRON].sort()).toStrictEqual(Object.keys(DEFAULT_CRON_REGISTRY).sort());
  });

  it('HF-CRON-001: wrangler.jsonc の main が scheduled handler を持つ custom entry を指している', () => {
    // .open-next/worker.js を直接指すと fetch handler だけになり cron が配線されない
    expect(readWranglerConfig().main).toBe('src/worker.ts');
  });

  it('HF-CRON-001: infrastructure-spec §5 の割当どおりに日次 4 / 週次 2 ジョブを持つ', () => {
    expect(DEFAULT_CRON_REGISTRY[DAILY_CRON]?.map((entry) => entry.id)).toStrictEqual([
      'metrics-rollup-daily',
      'turso-usage-monitor',
      'orphan-candidate-notify',
      'token-cleanup',
    ]);
    expect(DEFAULT_CRON_REGISTRY[WEEKLY_CRON]?.map((entry) => entry.id)).toStrictEqual([
      'metrics-rollup-weekly',
      'weekly-summary-mail',
    ]);
  });

  it('HF-CRON-001: cron ごとに対応するジョブ列だけを実行する', async () => {
    const executed: string[] = [];
    const registry: CronRegistry = {
      [DAILY_CRON]: [job('daily-a', async () => void executed.push('daily-a'))],
      [WEEKLY_CRON]: [job('weekly-a', async () => void executed.push('weekly-a'))],
    };

    const result = await dispatchScheduled(baseOptions({ cron: WEEKLY_CRON, registry }));

    expect(executed).toStrictEqual(['weekly-a']);
    expect(result.jobs).toStrictEqual([{ jobId: 'weekly-a', status: 'succeeded' }]);
  });

  it('HF-CRON-004: 未登録の cron 式は黙って成功にせず失敗として記録する', async () => {
    const result = await dispatchScheduled(baseOptions({ cron: '* * * * *' }));

    expect(result.jobs).toStrictEqual([{ jobId: 'dispatch', status: 'failed', detail: 'unregistered_cron' }]);
    expect(result.heartbeatSent).toBe(false);
  });

  it('HF-CRON-002: 同じ論理時刻の再送ではジョブを再実行しない (冪等)', async () => {
    let runs = 0;
    const registry: CronRegistry = {
      [DAILY_CRON]: [
        job('counted', async () => {
          runs += 1;
        }),
      ],
    };
    const ledger = createInMemoryCronRunLedger();

    const first = await dispatchScheduled(baseOptions({ registry, ledger }));
    const second = await dispatchScheduled(baseOptions({ registry, ledger }));

    expect(runs).toBe(1);
    expect(first.skipped).toBe(false);
    expect(second.skipped).toBe(true);
    expect(second.jobs).toStrictEqual([]);
  });

  it('HF-CRON-002: 論理時刻が変われば別の実行として扱う', async () => {
    let runs = 0;
    const registry: CronRegistry = {
      [DAILY_CRON]: [
        job('counted', async () => {
          runs += 1;
        }),
      ],
    };
    const ledger = createInMemoryCronRunLedger();

    await dispatchScheduled(baseOptions({ registry, ledger }));
    await dispatchScheduled(baseOptions({ registry, ledger, scheduledAt: new Date('2026-07-22T15:00:00.000Z') }));

    expect(runs).toBe(2);
  });

  it('HF-CRON-002: runKey が cron と論理時刻から決定的に決まる', () => {
    expect(buildRunKey(DAILY_CRON, SCHEDULED_AT)).toBe('0 15 * * *@2026-07-21T15:00:00.000Z');
  });

  it('HF-CRON-003: ジョブが失敗しても後続ジョブを止めない', async () => {
    const executed: string[] = [];
    const registry: CronRegistry = {
      [DAILY_CRON]: [
        job('first', async () => {
          executed.push('first');
          throw new Error('boom');
        }),
        job('second', async () => void executed.push('second')),
      ],
    };

    const result = await dispatchScheduled(baseOptions({ registry }));

    expect(executed).toStrictEqual(['first', 'second']);
    expect(result.jobs).toStrictEqual([
      { jobId: 'first', status: 'failed', detail: 'boom' },
      { jobId: 'second', status: 'succeeded' },
    ]);
  });
});

describe('cron heartbeat (qa-027: cron が動かなかったことの検知)', () => {
  const registry: CronRegistry = { [DAILY_CRON]: [job('ok')], [WEEKLY_CRON]: [job('ok')] };

  it('HF-CRON-005: 日次バッチ完走時に heartbeat URL へ ping する', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      calls.push(String(input));
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    const result = await dispatchScheduled(
      baseOptions({ registry, fetchImpl, env: { CRON_HEARTBEAT_URL: 'https://heartbeat.example/abc' } }),
    );

    expect(calls).toStrictEqual(['https://heartbeat.example/abc']);
    expect(result.heartbeatSent).toBe(true);
  });

  it('HF-CRON-005: ジョブが 1 件でも失敗したら ping しない (未達で異常を検知させる)', async () => {
    const failing: CronRegistry = {
      [DAILY_CRON]: [
        job('bad', async () => {
          throw new Error('boom');
        }),
      ],
    };
    const result = await dispatchScheduled(
      baseOptions({ registry: failing, env: { CRON_HEARTBEAT_URL: 'https://heartbeat.example/abc' } }),
    );

    expect(result.heartbeatSent).toBe(false);
  });

  it('HF-CRON-005: heartbeat URL 未設定なら ping しない (ローカル・preview)', async () => {
    const result = await dispatchScheduled(baseOptions({ registry }));
    expect(result.heartbeatSent).toBe(false);
  });

  it('HF-CRON-005: heartbeat の失敗自体は cron の失敗にしない', async () => {
    const fetchImpl = (async () => {
      throw new Error('network');
    }) as typeof fetch;

    const result = await dispatchScheduled(
      baseOptions({ registry, fetchImpl, env: { CRON_HEARTBEAT_URL: 'https://heartbeat.example/abc' } }),
    );

    expect(result.heartbeatSent).toBe(false);
    expect(result.jobs.every((entry) => entry.status === 'succeeded')).toBe(true);
  });
});
