// feat-tenant-data-retention AD-5: Turso/R2 使用量監視の閾値判定と cron 統合を検証する。
// 通知の永続化は別途通知基盤 feature のスコープのため、ここでは in_app transport への送出だけを確認する。

import { describe, expect, it } from 'vitest';
import {
  createUsageMonitorJob,
  evaluateUsageRatio,
  fetchTursoUsage,
  measureR2StorageBytes,
  R2_FREE_LIMITS,
  type R2ListCapable,
  TURSO_FREE_LIMITS,
} from '../../src/lib/scheduled/usage-monitor.js';
import type { NotificationMessage } from '../../src/shared/notification/index.js';
import type { CronJobContext } from '../../src/worker/cron.js';

function baseContext(overrides: Partial<CronJobContext> = {}): CronJobContext {
  return {
    scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
    cron: '0 15 * * *',
    runKey: '0 15 * * *@2026-08-03T15:00:00.000Z',
    env: {},
    ...overrides,
  };
}

function fakeR2Bucket(sizes: readonly number[]): R2ListCapable {
  return {
    list: async (options) => {
      const cursor = options?.cursor;
      const start = cursor === undefined ? 0 : Number(cursor);
      const page = sizes.slice(start, start + 2);
      const truncated = start + 2 < sizes.length;
      return truncated
        ? { objects: page.map((size) => ({ size })), truncated, cursor: String(start + 2) }
        : { objects: page.map((size) => ({ size })), truncated };
    },
  };
}

describe('evaluateUsageRatio', () => {
  it('70% 未満は ok', () => {
    expect(evaluateUsageRatio(69, 100)).toBe('ok');
  });

  it('70% 以上 90% 未満は warning', () => {
    expect(evaluateUsageRatio(70, 100)).toBe('warning');
    expect(evaluateUsageRatio(89, 100)).toBe('warning');
  });

  it('90% 以上は critical', () => {
    expect(evaluateUsageRatio(90, 100)).toBe('critical');
  });

  it('limit が 0 以下なら ok (ゼロ割を避ける)', () => {
    expect(evaluateUsageRatio(1, 0)).toBe('ok');
  });
});

describe('measureR2StorageBytes', () => {
  it('list() のページングを辿って size を積算する', async () => {
    const bucket = fakeR2Bucket([100, 200, 300, 400, 500]);
    await expect(measureR2StorageBytes(bucket)).resolves.toBe(1500);
  });

  it('空バケットは 0', async () => {
    await expect(measureR2StorageBytes(fakeR2Bucket([]))).resolves.toBe(0);
  });
});

describe('fetchTursoUsage', () => {
  it('secret が未投入なら null を返しスキップする', async () => {
    await expect(fetchTursoUsage({})).resolves.toBeNull();
  });

  it('Turso Platform API の応答を rows_read/rows_written/storage_bytes へ写す', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      calls.push(String(input));
      return new Response(
        JSON.stringify({ database: { total: { rows_read: 10, rows_written: 20, storage_bytes: 30 } } }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await fetchTursoUsage(
      { TURSO_API_TOKEN: 'tok', TURSO_ORG_SLUG: 'org', TURSO_DATABASE_NAME: 'harness-hub-prod' },
      { fetchImpl, now: new Date('2026-08-03T00:00:00.000Z') },
    );

    expect(result).toStrictEqual({ rowsRead: 10, rowsWritten: 20, storageBytes: 30 });
    expect(calls[0]).toContain('/organizations/org/databases/harness-hub-prod/usage');
  });

  it('HTTP エラーは status のみを含む例外にする (接続情報を漏らさない)', async () => {
    const fetchImpl = (async () => new Response(null, { status: 500 })) as typeof fetch;

    await expect(
      fetchTursoUsage({ TURSO_API_TOKEN: 'tok', TURSO_ORG_SLUG: 'org', TURSO_DATABASE_NAME: 'db' }, { fetchImpl }),
    ).rejects.toThrow('turso_usage_http_500');
  });
});

describe('createUsageMonitorJob (cron 統合)', () => {
  it('閾値未満なら通知を送出しない', async () => {
    const sent: NotificationMessage[] = [];
    const job = createUsageMonitorJob({
      transport: { channel: 'in_app', send: async (message) => void sent.push(message) },
    });

    await job.run(
      baseContext({
        env: { TENANT_DATA_BUCKET: fakeR2Bucket([1024]), PACKAGES_BUCKET: fakeR2Bucket([1024]) },
      }),
    );

    expect(sent).toStrictEqual([]);
  });

  it('R2 ストレージが 90% を超えたら critical 通知をバケット別に送出する', async () => {
    const sent: NotificationMessage[] = [];
    const job = createUsageMonitorJob({
      transport: { channel: 'in_app', send: async (message) => void sent.push(message) },
    });
    const overThreshold = Math.ceil(R2_FREE_LIMITS.storageBytes * 0.95);

    await job.run(
      baseContext({
        env: {
          TENANT_DATA_BUCKET: fakeR2Bucket([overThreshold]),
          PACKAGES_BUCKET: fakeR2Bucket([1024]),
        },
      }),
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]?.kind).toBe('usage.r2_tenant_data_threshold');
    expect(sent[0]?.recipientSubject).toBe('provider-admin');
    expect(sent[0]?.idempotencyKey).toBe(`${baseContext().runKey}:r2_tenant_data`);
  });

  it('Turso 読取行数が 70% を超えたら warning 通知を送出する', async () => {
    const sent: NotificationMessage[] = [];
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          database: {
            total: {
              rows_read: Math.ceil(TURSO_FREE_LIMITS.rowsReadPerMonth * 0.8),
              rows_written: 0,
              storage_bytes: 0,
            },
          },
        }),
        { status: 200 },
      )) as typeof fetch;
    const job = createUsageMonitorJob({
      fetchImpl,
      transport: { channel: 'in_app', send: async (message) => void sent.push(message) },
    });

    await job.run(
      baseContext({
        env: { TURSO_API_TOKEN: 'tok', TURSO_ORG_SLUG: 'org', TURSO_DATABASE_NAME: 'harness-hub-prod' },
      }),
    );

    expect(sent.map((m) => m.kind)).toStrictEqual(['usage.turso_rows_read_threshold']);
    expect(sent[0]?.subject).toContain('80%');
  });

  it('R2 binding が無い環境ではその指標だけ静かにスキップする (未設定を落とさない)', async () => {
    const sent: NotificationMessage[] = [];
    const job = createUsageMonitorJob({
      transport: { channel: 'in_app', send: async (message) => void sent.push(message) },
    });

    await expect(job.run(baseContext({ env: {} }))).resolves.toBeUndefined();
    expect(sent).toStrictEqual([]);
  });
});
