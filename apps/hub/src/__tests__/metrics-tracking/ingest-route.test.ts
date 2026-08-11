/**
 * MT-INGEST-*: `POST /api/v1/metrics/events` を実 Request/Response として実行する受入契約。
 *
 * 検証の主眼は SEC5 と冪等性。どちらも「実装したつもり」で緑になりやすいので、
 * 認可判定 (`withAuthz` / `decide`) と DB (libSQL 一時ファイル) は本物を通し、
 * 差し替えるのは authRuntime の port と metrics runtime の結線だけに留める。
 *
 * DB をモックしないのは、冪等性を担保しているのが `metrics_events` の
 * unique(tenant_id, idempotency_key) という SQL 制約そのものだから。
 * repository を偽物にすると、その制約が無くてもテストは緑になってしまう。
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

import { createRepositoryContext } from '@harness-hub/db';
import type { MetricsEventIngestResponse } from '@harness-hub/schemas';

import { TENANT_A, TENANT_B, WORKSPACE_A1 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  ALLOWED_ORIGIN,
  createTokenRouteHarness,
  issuePublisherToken,
  OWNER_ID,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { POST } from '../../app/api/v1/metrics/events/route.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';
import { createMetricsDbHarness, type MetricsDbHarness } from './support/real-db.js';
import { createTestMetricsRuntime } from './support/test-runtime.js';

const HARNESS_ID = 'harness-alpha';

let db: MetricsDbHarness;
let harness: ReturnType<typeof createTokenRouteHarness>;

beforeEach(async () => {
  db = await createMetricsDbHarness();
  metricsHolder.current = createTestMetricsRuntime(db.repository);
  harness = createTokenRouteHarness();
  authHolder.current = harness.runtime;
});

afterEach(() => {
  db.close();
  authHolder.current = null;
  metricsHolder.current = null;
});

/** ingest は短命 Bearer token 経路。scope は `metrics:write` を要求する。 */
async function ingestHeaders(
  options: { readonly idempotencyKey?: string | null; readonly tenantId?: string } = {},
): Promise<Headers> {
  const token = await issuePublisherToken(harness, OWNER_ID, WORKSPACE_A1, ['metrics:write']);
  const headers = new Headers({
    authorization: `Bearer ${token.access_token}`,
    'content-type': 'application/json',
    origin: ALLOWED_ORIGIN,
  });
  headers.set(TENANT_HEADER, options.tenantId ?? TENANT_A);
  headers.set(WORKSPACE_HEADER, WORKSPACE_A1);
  const key = options.idempotencyKey === undefined ? 'idem-1' : options.idempotencyKey;
  if (key !== null) headers.set('idempotency-key', key);
  return headers;
}

async function ingest(body: unknown, options: Parameters<typeof ingestHeaders>[0] = {}): Promise<Response> {
  return POST(
    new Request('https://hub.example.com/api/v1/metrics/events', {
      method: 'POST',
      headers: await ingestHeaders(options),
      body: JSON.stringify(body),
    }),
  );
}

describe('MT-INGEST: 実行ログの受理', () => {
  it('MT-INGEST-001: 回数だけの body は 201 で受理され、event が 1 件記録される', async () => {
    const response = await ingest({ harnessId: HARNESS_ID, runCount: 3 });

    expect(response.status).toBe(201);
    const body = (await response.json()) as MetricsEventIngestResponse;
    expect(body.deduplicated).toBe(false);

    const rows = await db.repository.listEventsForPeriod(
      createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: OWNER_ID }),
      { periodStart: 0, periodEnd: Date.now() + 60_000 },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.runCount).toBe(3);
    expect(rows[0]?.actorUserId).toBe(OWNER_ID);
    expect(rows[0]?.departmentId).toBeNull();
  });

  it('MT-INGEST-002: 同じ Idempotency-Key の再送は二重計上せず deduplicated=true を 200 で返す', async () => {
    const first = await ingest({ harnessId: HARNESS_ID, runCount: 2 });
    const second = await ingest({ harnessId: HARNESS_ID, runCount: 2 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);

    const firstBody = (await first.json()) as MetricsEventIngestResponse;
    const secondBody = (await second.json()) as MetricsEventIngestResponse;
    expect(secondBody.deduplicated).toBe(true);
    // 同じ event を指すこと。別 ID を返すと CLI 側で「2 件記録された」と読めてしまう
    expect(secondBody.eventId).toBe(firstBody.eventId);

    const rows = await db.repository.listEventsForPeriod(
      createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: OWNER_ID }),
      { periodStart: 0, periodEnd: Date.now() + 60_000 },
    );
    expect(rows).toHaveLength(1);
  });

  it('MT-INGEST-003: Idempotency-Key の無い要求は 400 で拒否する (再送で二重計上しうるため)', async () => {
    const response = await ingest({ harnessId: HARNESS_ID, runCount: 1 }, { idempotencyKey: null });

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
  });

  it('MT-INGEST-004: 同じ Idempotency-Key を異なる payload に再利用すると 422 で拒否する', async () => {
    const first = await ingest({ harnessId: HARNESS_ID, runCount: 1 });
    const reused = await ingest({ harnessId: HARNESS_ID, runCount: 2 });

    expect(first.status).toBe(201);
    expect(reused.status).toBe(422);
    expect(reused.headers.get('content-type')).toContain('application/problem+json');
    const rows = await db.repository.listEventsForPeriod(
      createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: OWNER_ID }),
      { periodStart: 0, periodEnd: Date.now() + 60_000 },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.runCount).toBe(1);
  });
});

describe('MT-SEC5: クライアント申告の時刻・金額を受け取らない', () => {
  const REJECTED: readonly (readonly [string, Record<string, unknown>])[] = [
    ['occurredAt (発生時刻)', { occurredAt: '2020-01-01T00:00:00Z' }],
    ['savedMinutes (削減時間)', { savedMinutes: 999 }],
    ['savedAmountJpy (削減額)', { savedAmountJpy: 1_000_000 }],
    ['hourlyRate (時給係数)', { hourlyRate: 100_000 }],
    ['minutesPerRun (分/回 係数)', { minutesPerRun: 600 }],
    ['actorUserId (実行主体)', { actorUserId: 'forged-user' }],
    ['departmentId (部門)', { departmentId: 'forged-department' }],
  ];

  for (const [label, extra] of REJECTED) {
    it(`MT-SEC5-001: ${label} を含む body は 422 で拒否され、event は記録されない`, async () => {
      const response = await ingest({ harnessId: HARNESS_ID, runCount: 1, ...extra });

      // 契約違反は共通の parseRequest が 422 (unprocessable) を返す。
      // 400 は「ヘッダが足りない」など schema 以前の不備に割り当てられている。
      expect(response.status).toBe(422);
      const rows = await db.repository.listEventsForPeriod(
        createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: OWNER_ID }),
        { periodStart: 0, periodEnd: Date.now() + 60_000 },
      );
      expect(rows).toHaveLength(0);
    });
  }

  it('MT-SEC5-002: 記録される発生時刻はサーバ時刻であり、要求のどの値でもない', async () => {
    const before = Date.now();
    await ingest({ harnessId: HARNESS_ID, runCount: 1 });
    const after = Date.now();

    const rows = await db.repository.listEventsForPeriod(
      createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: OWNER_ID }),
      { periodStart: 0, periodEnd: after + 60_000 },
    );
    const occurredAt = rows[0]?.occurredAt ?? 0;
    expect(occurredAt).toBeGreaterThanOrEqual(before);
    expect(occurredAt).toBeLessThanOrEqual(after);
  });
});

describe('MT-TENANT: テナント分離', () => {
  it('MT-TENANT-001: token の tenant と異なる x-harness-tenant-id は 404 を返し、記録もしない', async () => {
    const response = await ingest({ harnessId: HARNESS_ID, runCount: 1 }, { tenantId: TENANT_B });

    // 存在の有無を漏らさないため tenant_mismatch は 403 ではなく 404
    expect(response.status).toBe(404);

    const rows = await db.repository.listEventsForPeriod(
      createRepositoryContext({ tenantId: TENANT_B, workspaceId: WORKSPACE_A1, actorId: OWNER_ID }),
      { periodStart: 0, periodEnd: Date.now() + 60_000 },
    );
    expect(rows).toHaveLength(0);
  });

  it('MT-TENANT-002: 別テナントの context からは記録済み event が見えない', async () => {
    await ingest({ harnessId: HARNESS_ID, runCount: 5 });

    const otherTenant = await db.repository.listEventsForPeriod(
      createRepositoryContext({ tenantId: TENANT_B, workspaceId: WORKSPACE_A1, actorId: OWNER_ID }),
      { periodStart: 0, periodEnd: Date.now() + 60_000 },
    );
    expect(otherTenant).toHaveLength(0);
  });

  it('MT-TENANT-003: 同じ Idempotency-Key でもテナントが違えば別 event として記録される', async () => {
    await ingest({ harnessId: HARNESS_ID, runCount: 1 });

    // 冪等キーの一意制約は (tenant_id, workspace_id, idempotency_key)。テナントを跨いで衝突しない。
    const context = createRepositoryContext({ tenantId: TENANT_B, workspaceId: WORKSPACE_A1, actorId: OWNER_ID });
    const result = await db.repository.ingestEvent(context, {
      workspaceId: WORKSPACE_A1,
      harnessId: HARNESS_ID,
      runCount: 1,
      idempotencyKey: 'idem-1',
    });
    expect(result.deduplicated).toBe(false);
  });

  it('MT-TENANT-004: workspace ヘッダーが無い投入は記録せずに 400 で落とす', async () => {
    // workspace が決まらないまま受理すると、どの workspace の実績かを後から決められない。
    // 集計の帰属先が不定な行を作らないため、書き込み前に止める。
    const headers = await ingestHeaders();
    headers.delete(WORKSPACE_HEADER);

    const response = await POST(
      new Request('https://hub.example.com/api/v1/metrics/events', {
        method: 'POST',
        headers,
        body: JSON.stringify({ harnessId: HARNESS_ID, runCount: 1 }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(
      await db.repository.listEventsForPeriod(
        createRepositoryContext({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: OWNER_ID }),
        { periodStart: 0, periodEnd: Date.now() + 60_000 },
      ),
    ).toHaveLength(0);
  });
});
