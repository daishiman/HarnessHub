// feat-metrics-tracking の永続層 (I10 / B2 / B3 / SEC5)。
// 検証するのは 3 点 — ingest が重複計上しないこと、rollup の再集計が行を増やさないこと、
// そして読取が他テナントへ一切漏れないこと (D4 row-level scope)。
//
// 注: DDL は `support/schema-harness.ts` が schema barrel から実行時生成する。
// `schema/index.ts` へ metrics-tracking が登録されるまで、この file のテーブルは作られない。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TursoAdapter } from '../connection/turso';
import { createScopedCrud } from '../repository/crud';
import {
  createMetricsTrackingRepository,
  type IngestMetricsEventInput,
  METRICS_INGEST_IDEMPOTENCY_TTL_MS,
  MetricsIdempotencyKeyReuseError,
  type UpsertRollupInput,
} from '../repository/metrics-tracking';
import { createTenantsRepo } from '../repository/tenants';
import { workspaces } from '../schema/core/identity';
import { metricsEvents, metricsRollups } from '../schema/metrics-tracking/schema';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  adapter.close();
});

interface MetricsTenant {
  readonly context: RepositoryContext;
  readonly tenantId: string;
  readonly workspaceId: string;
}

/** tenant + workspace だけを持つ最小 fixture。metrics 表は他表への FK を持たない。 */
async function seedTenant(slug: string): Promise<MetricsTenant> {
  const tenant = await createTenantsRepo(asCore(adapter)).create({ slug, name: `Tenant ${slug}`, plan: 'free' });
  const tenantContext = createRepositoryContext({ tenantId: tenant.id });
  const workspace = await createScopedCrud(asCore(adapter), workspaces).insert(tenantContext, {
    slug: `ws-${slug}`,
    name: `WS ${slug}`,
  });
  const workspaceId = workspace.id as string;
  return {
    context: createRepositoryContext({ tenantId: tenant.id, workspaceId, actorId: `actor-${slug}` }),
    tenantId: tenant.id,
    workspaceId,
  };
}

const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;

function eventInput(tenant: MetricsTenant, overrides: Partial<IngestMetricsEventInput> = {}): IngestMetricsEventInput {
  return {
    workspaceId: tenant.workspaceId,
    harnessId: 'harness-alpha',
    runCount: 1,
    idempotencyKey: 'idem-001',
    ...overrides,
  };
}

function rollupInput(tenant: MetricsTenant, overrides: Partial<UpsertRollupInput> = {}): UpsertRollupInput {
  return {
    workspaceId: tenant.workspaceId,
    period: 'weekly',
    dimension: 'tenant',
    dimensionKey: tenant.tenantId,
    periodStart: 0,
    periodEnd: WEEK,
    runCount: 10,
    savedMinutes: 150,
    savedAmount: 45_000,
    ...overrides,
  };
}

describe('MET-DB: metrics-tracking repository', () => {
  it('MET-INGEST-001: 同一 idempotencyKey の二重 ingest は 1 行しか作らず deduplicated を返す', async () => {
    const tenant = await seedTenant('met-a');
    const repository = createMetricsTrackingRepository(asCore(adapter));

    const first = await repository.ingestEvent(tenant.context, eventInput(tenant));
    const second = await repository.ingestEvent(tenant.context, eventInput(tenant));

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(second.row.id).toBe(first.row.id);
    expect(second.row.runCount).toBe(1);
    expect(second.row.actorUserId).toBe('actor-met-a');
    expect(second.row.departmentId).toBeNull();
    expect(second.row.requestDigest).toMatch(/^[0-9a-f]{64}$/);

    const stored = await adapter.client.select().from(metricsEvents);
    expect(stored).toHaveLength(1);
  });

  it('MET-INGEST-002: 有効期間内に同じ key を異なる payload へ再利用すると domain error になる', async () => {
    const tenant = await seedTenant('met-a');
    const repository = createMetricsTrackingRepository(asCore(adapter));

    await repository.ingestEvent(tenant.context, eventInput(tenant));
    await expect(repository.ingestEvent(tenant.context, eventInput(tenant, { runCount: 99 }))).rejects.toBeInstanceOf(
      MetricsIdempotencyKeyReuseError,
    );
    expect(await adapter.client.select().from(metricsEvents)).toHaveLength(1);
  });

  it('MET-INGEST-003: 冪等キーは tenant + workspace スコープで、別テナントの同一キーは別行として通る', async () => {
    const a = await seedTenant('met-a');
    const b = await seedTenant('met-b');
    const repository = createMetricsTrackingRepository(asCore(adapter));

    const inA = await repository.ingestEvent(a.context, eventInput(a, { idempotencyKey: 'shared-key' }));
    const inB = await repository.ingestEvent(b.context, eventInput(b, { idempotencyKey: 'shared-key' }));

    expect(inA.deduplicated).toBe(false);
    expect(inB.deduplicated).toBe(false);
    expect(inB.row.id).not.toBe(inA.row.id);
    expect(await adapter.client.select().from(metricsEvents)).toHaveLength(2);
  });

  it('MET-INGEST-004: 同一 tenant の別 workspace は同じ key を独立して利用できる', async () => {
    const tenant = await seedTenant('met-a');
    const workspace = await createScopedCrud(asCore(adapter), workspaces).insert(
      createRepositoryContext({ tenantId: tenant.tenantId }),
      { slug: 'ws-met-a-secondary', name: 'WS secondary' },
    );
    const workspaceId = workspace.id as string;
    const otherContext = createRepositoryContext({
      tenantId: tenant.tenantId,
      workspaceId,
      actorId: 'actor-secondary',
    });
    const repository = createMetricsTrackingRepository(asCore(adapter));

    const first = await repository.ingestEvent(tenant.context, eventInput(tenant, { idempotencyKey: 'shared-key' }));
    const second = await repository.ingestEvent(otherContext, {
      ...eventInput(tenant, { idempotencyKey: 'shared-key' }),
      workspaceId,
    });

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(false);
    expect(second.row.workspaceId).toBe(workspaceId);
    expect(await adapter.client.select().from(metricsEvents)).toHaveLength(2);
  });

  it('MET-INGEST-005: 24 時間経過後は旧 event を保持したまま同じ key を再利用できる', async () => {
    const tenant = await seedTenant('met-a');
    const repository = createMetricsTrackingRepository(asCore(adapter));
    const startedAt = Date.UTC(2026, 7, 10);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(startedAt);

    const first = await repository.ingestEvent(tenant.context, eventInput(tenant));
    clock.mockReturnValue(startedAt + METRICS_INGEST_IDEMPOTENCY_TTL_MS + 1);
    const reused = await repository.ingestEvent(tenant.context, eventInput(tenant, { runCount: 2 }));

    expect(reused.deduplicated).toBe(false);
    expect(reused.row.id).not.toBe(first.row.id);
    const stored = await adapter.client.select().from(metricsEvents);
    expect(stored).toHaveLength(2);
    expect(stored.find((row) => row.id === first.row.id)?.idempotencyKey).toBeNull();
    expect(stored.find((row) => row.id === reused.row.id)?.idempotencyKey).toBe('idem-001');
  });

  it('MET-INGEST-006: occurredAt は引数で上書きできずサーバ時刻が入る (SEC5 回帰防止)', async () => {
    const tenant = await seedTenant('met-a');
    const repository = createMetricsTrackingRepository(asCore(adapter));
    const clientClaimed = 1_000;

    const before = Date.now();
    // 型では occurredAt を受け取らない。実行時にも申告値が通らないことを cast して確かめる。
    const result = await repository.ingestEvent(tenant.context, {
      ...eventInput(tenant),
      occurredAt: clientClaimed,
      createdAt: clientClaimed,
    } as IngestMetricsEventInput);
    const after = Date.now();

    expect(result.row.occurredAt).not.toBe(clientClaimed);
    expect(result.row.occurredAt).toBeGreaterThanOrEqual(before);
    expect(result.row.occurredAt).toBeLessThanOrEqual(after);
    expect(result.row.createdAt).toBeGreaterThanOrEqual(before);
  });

  it('MET-CRON-001: upsertRollups の再実行は行を増やさず値だけを更新する', async () => {
    const tenant = await seedTenant('met-a');
    const repository = createMetricsTrackingRepository(asCore(adapter));

    await repository.upsertRollups(tenant.context, [rollupInput(tenant)]);
    await repository.upsertRollups(tenant.context, [rollupInput(tenant, { runCount: 42, savedAmount: 99_000 })]);

    const stored = await adapter.client.select().from(metricsRollups);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.runCount).toBe(42);
    expect(stored[0]?.savedAmount).toBe(99_000);
  });

  it('MET-READ-001: listRollups / summarize に他テナントの行が一切現れない', async () => {
    const a = await seedTenant('met-a');
    const b = await seedTenant('met-b');
    const repository = createMetricsTrackingRepository(asCore(adapter));

    await repository.upsertRollups(a.context, [
      rollupInput(a, { runCount: 10, savedMinutes: 150, savedAmount: 45_000 }),
      rollupInput(a, { dimension: 'harness', dimensionKey: 'harness-alpha', runCount: 6 }),
      rollupInput(a, { dimension: 'department', dimensionKey: 'dept-sales', runCount: 4 }),
    ]);
    await repository.upsertRollups(b.context, [
      rollupInput(b, { runCount: 777, savedMinutes: 7_777, savedAmount: 777_000 }),
      rollupInput(b, { dimension: 'harness', dimensionKey: 'harness-beta', runCount: 777 }),
      rollupInput(b, { dimension: 'department', dimensionKey: 'dept-legal', runCount: 777 }),
    ]);

    const rollups = await repository.listRollups(a.context, {
      period: 'weekly',
      dimension: 'tenant',
      periodStart: 0,
      periodEnd: WEEK,
    });
    expect(rollups).toHaveLength(1);
    expect(rollups[0]?.tenantId).toBe(a.tenantId);
    expect(rollups[0]?.runCount).toBe(10);

    const summary = await repository.summarize(a.context, { from: 0, to: WEEK });
    expect(summary.kpi).toStrictEqual({ runCount: 10, savedMinutes: 150, savedAmount: 45_000 });
    expect(summary.trend.map((point) => point.runCount)).toStrictEqual([10]);
    expect(summary.harnessRanking.map((entry) => entry.key)).toStrictEqual(['harness-alpha']);
    expect(summary.departmentBreakdown.map((entry) => entry.key)).toStrictEqual(['dept-sales']);
  });

  it('MET-READ-002: summarize は rollup 由来で、ingest しただけの event は反映されない', async () => {
    const tenant = await seedTenant('met-a');
    const repository = createMetricsTrackingRepository(asCore(adapter));
    await repository.ingestEvent(tenant.context, eventInput(tenant, { runCount: 5 }));

    const summary = await repository.summarize(tenant.context, { from: 0, to: Date.now() + WEEK });
    expect(summary.kpi).toStrictEqual({ runCount: 0, savedMinutes: 0, savedAmount: 0 });
    expect(summary.trend).toStrictEqual([]);
  });

  it('MET-READ-003: listEventsForPeriod は半開区間で cron 入力を返し、他テナントを含まない', async () => {
    const a = await seedTenant('met-a');
    const b = await seedTenant('met-b');
    const repository = createMetricsTrackingRepository(asCore(adapter));

    await repository.ingestEvent(a.context, eventInput(a, { idempotencyKey: 'a-1' }));
    await repository.ingestEvent(a.context, eventInput(a, { idempotencyKey: 'a-2' }));
    await repository.ingestEvent(b.context, eventInput(b, { idempotencyKey: 'b-1' }));

    const now = Date.now();
    const events = await repository.listEventsForPeriod(a.context, {
      periodStart: now - HOUR,
      periodEnd: now + HOUR,
    });
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.tenantId === a.tenantId)).toBe(true);

    // 区間外は 1 件も返らない
    const past = await repository.listEventsForPeriod(a.context, { periodStart: 0, periodEnd: 1_000 });
    expect(past).toStrictEqual([]);
  });
});
