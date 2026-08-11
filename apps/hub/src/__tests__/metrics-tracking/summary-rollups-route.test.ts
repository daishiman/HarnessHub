/**
 * MT-READ-*: `GET /api/v1/metrics/summary` と `GET /api/v1/metrics/rollups` の受入契約。
 *
 * 主眼は 2 つ。
 *   1. summary が返す集計値が、投入した event と rollup から導ける値と一致すること。
 *      画面はこの数字をそのまま出すだけなので、ここが唯一の検算地点になる。
 *   2. `dim=user` が管理者限定であること (SEC4)。個人別の削減額が見えると、
 *      係数が既知である以上そこから年収を逆算できてしまう。
 *
 * 認可・DB とも本物を通し、差し替えるのは runtime の結線だけ。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MetricsTrackingRuntime } from '../../features/metrics-tracking/runtime.js';
import type { AuthRuntime } from '../../lib/authz/runtime.js';

const authHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (authHolder.current === null) throw new Error('テスト用 authRuntime が未設定です');
      return authHolder.current;
    },
  };
});

const metricsHolder = vi.hoisted(() => ({ current: null as MetricsTrackingRuntime | null }));

vi.mock('../../features/metrics-tracking/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/metrics-tracking/runtime.js')>();
  return {
    ...actual,
    metricsTrackingRuntime: () => {
      if (metricsHolder.current === null) throw new Error('テスト用 metricsTrackingRuntime が未設定です');
      return metricsHolder.current;
    },
  };
});

import { createRepositoryContext, type RepositoryContext } from '@harness-hub/db';
import type { MetricsRollupsResponse, MetricsSummaryResponse } from '@harness-hub/schemas';

import { TENANT_A, TENANT_B, WORKSPACE_A1 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  ALLOWED_ORIGIN,
  createTokenRouteHarness,
  sessionCookieFor,
  testUser,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { GET as getRollups } from '../../app/api/v1/metrics/rollups/route.js';
import { GET as getSummary } from '../../app/api/v1/metrics/summary/route.js';
import { epochMsToJstDate, jstDateToEpochMs } from '../../features/metrics-tracking/date-jst.js';
import { DAY_MS } from '../../features/metrics-tracking/dto.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import { createMetricsDbHarness, type MetricsDbHarness } from './support/real-db.js';
import { createTestMetricsRuntime } from './support/test-runtime.js';

const MEMBER = testUser('user-member');
const ADMIN = testUser('user-admin-metrics', { role: 'workspace-admin' });

/** 期間の基準日。JST 固定なので、この日の 0:00 JST が rollup の periodStart になる。 */
const PERIOD_START_DATE = '2026-07-06';
const PERIOD_START_MS = jstDateToEpochMs(PERIOD_START_DATE);

let db: MetricsDbHarness;
let harness: ReturnType<typeof createTokenRouteHarness>;

function contextFor(tenantId: string = TENANT_A): RepositoryContext {
  return createRepositoryContext({ tenantId, workspaceId: WORKSPACE_A1, actorId: MEMBER.id });
}

beforeEach(async () => {
  db = await createMetricsDbHarness();
  metricsHolder.current = createTestMetricsRuntime(db.repository);
  harness = createTokenRouteHarness();
  harness.ports.users.put(MEMBER);
  harness.ports.users.put(ADMIN);
  authHolder.current = harness.runtime;
});

afterEach(() => {
  db.close();
  authHolder.current = null;
  metricsHolder.current = null;
});

async function readHeaders(user = MEMBER, tenantId: string = TENANT_A): Promise<Headers> {
  const headers = new Headers({ cookie: await sessionCookieFor(user), origin: ALLOWED_ORIGIN });
  headers.set(TENANT_HEADER, tenantId);
  headers.set(WORKSPACE_HEADER, WORKSPACE_A1);
  return headers;
}

async function callSummary(query: string, user = MEMBER, tenantId: string = TENANT_A): Promise<Response> {
  return getSummary(
    new Request(`https://hub.example.com/api/v1/metrics/summary?${query}`, {
      headers: await readHeaders(user, tenantId),
    }),
  );
}

async function callRollups(query: string, user = MEMBER, tenantId: string = TENANT_A): Promise<Response> {
  return getRollups(
    new Request(`https://hub.example.com/api/v1/metrics/rollups?${query}`, {
      headers: await readHeaders(user, tenantId),
    }),
  );
}

/**
 * summary は rollup を読む。cron が書くはずの行を直接置いて、
 * 「rollup 由来の数字がそのまま画面へ届く」経路だけを検証対象にする。
 */
async function seedRollups(tenantId: string = TENANT_A): Promise<void> {
  const shared = {
    workspaceId: WORKSPACE_A1,
    period: 'weekly' as const,
    periodStart: PERIOD_START_MS,
    periodEnd: PERIOD_START_MS + 7 * DAY_MS,
  };
  await db.repository.upsertRollups(contextFor(tenantId), [
    { ...shared, dimension: 'tenant', dimensionKey: tenantId, runCount: 30, savedMinutes: 450, savedAmount: 45_000 },
    {
      ...shared,
      dimension: 'harness',
      dimensionKey: 'harness-alpha',
      runCount: 20,
      savedMinutes: 300,
      savedAmount: 30_000,
    },
    {
      ...shared,
      dimension: 'harness',
      dimensionKey: 'harness-beta',
      runCount: 10,
      savedMinutes: 150,
      savedAmount: 15_000,
    },
    {
      ...shared,
      dimension: 'department',
      dimensionKey: 'dept-sales',
      runCount: 30,
      savedMinutes: 450,
      savedAmount: 45_000,
    },
    { ...shared, dimension: 'user', dimensionKey: 'user-member', runCount: 30, savedMinutes: 450, savedAmount: 45_000 },
  ]);
}

const PERIOD_QUERY = `from=${PERIOD_START_DATE}&to=${epochMsToJstDate(PERIOD_START_MS + 6 * DAY_MS)}`;

describe('MT-READ: summary の集計値', () => {
  it('MT-READ-001: KPI は rollup の合計と一致し、削減時間は分から時間へ換算される', async () => {
    await seedRollups();

    const response = await callSummary(PERIOD_QUERY);
    expect(response.status).toBe(200);

    const body = (await response.json()) as MetricsSummaryResponse;
    expect(body.kpi.totalRunCount).toBe(30);
    // 450 分 = 7.5 時間。分→時間の換算は dto の 1 箇所でだけ行う
    expect(body.kpi.savedHours).toBe(7.5);
    expect(body.kpi.savedAmountJpy).toBe(45_000);
    expect(body.kpi.harnessCount).toBe(2);
  });

  it('MT-READ-002: ハーネス別ランキングと部門別内訳が rollup の次元ごとに返る', async () => {
    await seedRollups();

    const body = (await (await callSummary(PERIOD_QUERY)).json()) as MetricsSummaryResponse;

    expect(body.ranking.map((entry) => entry.harnessId).sort()).toEqual(['harness-alpha', 'harness-beta']);
    expect(body.ranking.find((entry) => entry.harnessId === 'harness-alpha')?.savedAmountJpy).toBe(30_000);
    expect(body.departments.map((entry) => entry.departmentId)).toEqual(['dept-sales']);
  });

  it('MT-READ-003: 期間は両端を含む。to に指定した日の rollup も集計に入る', async () => {
    await seedRollups();

    // 週次 rollup の periodStart は 7/6。to を 7/6 にしても含まれること
    const body = (await (
      await callSummary(`from=${PERIOD_START_DATE}&to=${PERIOD_START_DATE}`)
    ).json()) as MetricsSummaryResponse;
    expect(body.kpi.totalRunCount).toBe(30);
  });

  it('MT-READ-004: from が to より後の期間は 422 で拒否する', async () => {
    const response = await callSummary('from=2026-07-10&to=2026-07-01');

    expect(response.status).toBe(422);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
  });

  it('MT-READ-005: 別テナントの rollup は集計に現れない', async () => {
    await seedRollups(TENANT_B);

    const body = (await (await callSummary(PERIOD_QUERY)).json()) as MetricsSummaryResponse;
    expect(body.kpi.totalRunCount).toBe(0);
    expect(body.ranking).toHaveLength(0);
  });

  it('MT-READ-006: workspace ヘッダーが無い要求は集計せずに落とす', async () => {
    // workspace が決まらないまま集計すると、テナント配下の全 workspace を
    // 横断した数字を返しかねない。scope が欠けた時点で止める。
    const headers = await readHeaders();
    headers.delete(WORKSPACE_HEADER);

    const response = await getSummary(
      new Request(`https://hub.example.com/api/v1/metrics/summary?${PERIOD_QUERY}`, { headers }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
  });
});

describe('MT-ROLLUP: rollups の読取と dim=user の制限', () => {
  it('MT-ROLLUP-001: dim=harness は一般利用者でも読める', async () => {
    await seedRollups();

    const response = await callRollups(`period=weekly&dim=harness&${PERIOD_QUERY}`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as MetricsRollupsResponse;
    expect(body.items.map((item) => item.dimKey).sort()).toEqual(['harness-alpha', 'harness-beta']);
    expect(body.items[0]?.savedMinutes).toBe(300);
  });

  it('MT-ROLLUP-002: dim=user は一般利用者には 403 (SEC4: 金額から年収を逆算させない)', async () => {
    await seedRollups();

    const response = await callRollups(`period=weekly&dim=user&${PERIOD_QUERY}`, MEMBER);

    expect(response.status).toBe(403);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    // 本文に個人別の値が混ざっていないこと
    expect(await response.text()).not.toContain('user-member');
  });

  it('MT-ROLLUP-003: dim=user は管理者なら読める', async () => {
    await seedRollups();

    const response = await callRollups(`period=weekly&dim=user&${PERIOD_QUERY}`, ADMIN);

    expect(response.status).toBe(200);
    const body = (await response.json()) as MetricsRollupsResponse;
    expect(body.items.map((item) => item.dimKey)).toEqual(['user-member']);
  });

  it('MT-ROLLUP-004: 別テナントの rollup は読めない', async () => {
    await seedRollups(TENANT_B);

    const body = (await (
      await callRollups(`period=weekly&dim=harness&${PERIOD_QUERY}`)
    ).json()) as MetricsRollupsResponse;
    expect(body.items).toHaveLength(0);
  });

  it('MT-ROLLUP-005: 書込 method は生えていない (rollup は cron だけが確定させる)', async () => {
    const routeModule = await import('../../app/api/v1/metrics/rollups/route.js');

    expect(Object.keys(routeModule)).toEqual(['GET']);
  });

  it('MT-ROLLUP-006: workspace ヘッダーが無い要求は 400 で落とす', async () => {
    const headers = await readHeaders();
    headers.delete(WORKSPACE_HEADER);

    const response = await getRollups(
      new Request(`https://hub.example.com/api/v1/metrics/rollups?period=weekly&dim=harness&${PERIOD_QUERY}`, {
        headers,
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
  });
});
