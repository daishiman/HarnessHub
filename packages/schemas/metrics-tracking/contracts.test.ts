// feat-metrics-tracking の wire 契約の検証。
// 中心的な関心は SEC5 の回帰防止 —— クライアントが「削減時間・削減額・時給・分/回・発生時刻」を
// 申告してきたときに、route handler まで届かず parse 段階で落ちることを固定する。

import { describe, expect, it } from 'vitest';

import {
  METRICS_RANKING_LIMIT,
  metricsDateSchema,
  metricsEventIngestRequestSchema,
  metricsEventIngestResponseSchema,
  metricsRollupDimensionSchema,
  metricsRollupItemSchema,
  metricsRollupPeriodSchema,
  metricsRollupsQuerySchema,
  metricsRollupsResponseSchema,
  metricsSummaryQuerySchema,
  metricsSummaryResponseSchema,
} from './contracts.js';

const validIngestBody = { harnessId: 'harness-1', runCount: 3 };

describe('metricsEventIngestRequestSchema (SEC5: 受理してよいのは回数だけ)', () => {
  it('ハーネスと回数だけを受理する', () => {
    expect(metricsEventIngestRequestSchema.parse(validIngestBody)).toStrictEqual({
      harnessId: 'harness-1',
      runCount: 3,
    });
  });

  it.each([
    ['actorUserId', { actorUserId: 'user-1' }],
    ['departmentId', { departmentId: 'dept-1' }],
  ])('クライアント申告の主体情報 %s を拒否する', (_label, extra) => {
    expect(metricsEventIngestRequestSchema.safeParse({ ...validIngestBody, ...extra }).success).toBe(false);
  });

  // ここが SEC5 の本体。1 つでも通るようになったら「クライアント申告の量的値」が
  // サーバの算出結果を上書きできる経路が開いたということなので、必ず赤くする。
  it.each([
    ['savedMinutes', { savedMinutes: 45 }],
    ['savedHours', { savedHours: 0.75 }],
    ['savedAmountJpy', { savedAmountJpy: 2_250 }],
    ['hourlyRate', { hourlyRate: 3_000 }],
    ['annualSalary', { annualSalary: 6_000_000 }],
    ['minutesPerRun', { minutesPerRun: 15 }],
    ['reductionRate', { reductionRate: 0.35 }],
  ])('クライアント申告の量的値 %s を拒否する', (_label, extra) => {
    expect(metricsEventIngestRequestSchema.safeParse({ ...validIngestBody, ...extra }).success).toBe(false);
  });

  it('発生時刻の申告を拒否する (サーバ受信時刻を採用するため)', () => {
    expect(
      metricsEventIngestRequestSchema.safeParse({ ...validIngestBody, occurredAt: '2026-08-10T00:00:00Z' }).success,
    ).toBe(false);
    expect(metricsEventIngestRequestSchema.safeParse({ ...validIngestBody, timestamp: 1_754_784_000 }).success).toBe(
      false,
    );
  });

  it('冪等キーを body で受け取らない (Idempotency-Key ヘッダが単一ソース)', () => {
    expect(metricsEventIngestRequestSchema.safeParse({ ...validIngestBody, idempotencyKey: 'key-1' }).success).toBe(
      false,
    );
  });

  it('0 回・負数・小数・上限超過の実行回数を拒否する', () => {
    for (const runCount of [0, -1, 1.5, 1_001]) {
      expect(metricsEventIngestRequestSchema.safeParse({ ...validIngestBody, runCount }).success).toBe(false);
    }
  });

  it('harnessId を省略できない', () => {
    expect(metricsEventIngestRequestSchema.safeParse({ runCount: 1 }).success).toBe(false);
  });
});

describe('metricsEventIngestResponseSchema', () => {
  it('再送は deduplicated=true で既存 event を指す', () => {
    expect(metricsEventIngestResponseSchema.parse({ eventId: 'evt-1', deduplicated: true })).toStrictEqual({
      eventId: 'evt-1',
      deduplicated: true,
    });
  });

  it('deduplicated を省略できない (呼び出し側が重複判定を自前で推測しないため)', () => {
    expect(metricsEventIngestResponseSchema.safeParse({ eventId: 'evt-1' }).success).toBe(false);
  });
});

describe('metricsDateSchema', () => {
  it('YYYY-MM-DD の実在日付だけを受理する', () => {
    expect(metricsDateSchema.parse('2026-08-10')).toBe('2026-08-10');
    expect(metricsDateSchema.parse('2024-02-29')).toBe('2024-02-29');
  });

  it('形式違い・実在しない日付・日時形式を拒否する', () => {
    for (const value of ['2026-8-10', '2026-02-30', '2026-13-01', '2026-08-10T00:00:00Z', '']) {
      expect(metricsDateSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('metricsRollupPeriodSchema / metricsRollupDimensionSchema', () => {
  it('期間粒度は日次と週次のみ', () => {
    expect(metricsRollupPeriodSchema.options).toStrictEqual(['daily', 'weekly']);
    expect(metricsRollupPeriodSchema.safeParse('monthly').success).toBe(false);
  });

  it('集計次元は 4 種のみ (user は admin 限定だが値域としては存在する)', () => {
    expect(metricsRollupDimensionSchema.options).toStrictEqual(['tenant', 'harness', 'department', 'user']);
    expect(metricsRollupDimensionSchema.safeParse('project').success).toBe(false);
  });
});

describe('metricsSummaryQuerySchema', () => {
  it('期間と任意のハーネス絞り込みを受理する', () => {
    expect(metricsSummaryQuerySchema.parse({ from: '2026-08-01', to: '2026-08-10' })).toStrictEqual({
      from: '2026-08-01',
      to: '2026-08-10',
    });
  });

  it('from が to より後の期間を拒否する', () => {
    expect(metricsSummaryQuerySchema.safeParse({ from: '2026-08-11', to: '2026-08-10' }).success).toBe(false);
  });

  it('未知の絞り込みキーを拒否する', () => {
    expect(metricsSummaryQuerySchema.safeParse({ from: '2026-08-01', to: '2026-08-10', dim: 'user' }).success).toBe(
      false,
    );
  });
});

describe('metricsSummaryResponseSchema', () => {
  const response = {
    period: { from: '2026-08-01', to: '2026-08-10' },
    kpi: { totalRunCount: 120, savedHours: 30, savedAmountJpy: 90_000, harnessCount: 2 },
    trend: [{ periodStart: '2026-08-01', runCount: 60, savedHours: 15, savedAmountJpy: 45_000 }],
    ranking: [
      { harnessId: 'harness-1', harnessName: '請求書チェック', runCount: 80, savedHours: 20, savedAmountJpy: 60_000 },
    ],
    rankingTotals: { total: 2, active: 1 },
    departments: [
      { departmentId: null, departmentName: '未設定', runCount: 40, savedHours: 10, savedAmountJpy: 30_000 },
    ],
  };

  it('KPI・推移・ランキング・部門別内訳を返す', () => {
    expect(metricsSummaryResponseSchema.parse(response)).toStrictEqual(response);
  });

  it('ranking は表示件数の上限を超えられない (サーバが切っていない応答を通さない)', () => {
    const tooMany = Array.from({ length: METRICS_RANKING_LIMIT + 1 }, (_unused, index) => ({
      harnessId: `harness-${index}`,
      harnessName: `ツール ${index}`,
      runCount: index,
      savedHours: index,
      savedAmountJpy: index,
    }));
    expect(metricsSummaryResponseSchema.safeParse({ ...response, ranking: tooMany }).success).toBe(false);
  });

  it('稼働数が母数を超える応答は受け付けない (割合が 100% を超える表示を作らない)', () => {
    expect(
      metricsSummaryResponseSchema.safeParse({ ...response, rankingTotals: { total: 1, active: 2 } }).success,
    ).toBe(false);
  });

  it('金額が負の値になることはない (サーバ算出結果の異常を検知する)', () => {
    expect(
      metricsSummaryResponseSchema.safeParse({
        ...response,
        kpi: { ...response.kpi, savedAmountJpy: -1 },
      }).success,
    ).toBe(false);
  });
});

describe('metricsRollupsQuerySchema / metricsRollupsResponseSchema', () => {
  const query = { period: 'weekly', dim: 'harness', from: '2026-08-01', to: '2026-08-10' };

  it('period・dim・期間を受理する', () => {
    expect(metricsRollupsQuerySchema.parse(query)).toStrictEqual(query);
  });

  it('未知の period / dim を拒否する', () => {
    expect(metricsRollupsQuerySchema.safeParse({ ...query, period: 'hourly' }).success).toBe(false);
    expect(metricsRollupsQuerySchema.safeParse({ ...query, dim: 'workspace' }).success).toBe(false);
  });

  it('rollup 行はサーバ算出済みの削減時間・削減額と確定時刻を持つ', () => {
    const item = {
      period: 'weekly' as const,
      periodStart: '2026-08-03',
      dim: 'harness' as const,
      dimKey: 'harness-1',
      runCount: 80,
      savedMinutes: 1_200,
      savedAmountJpy: 60_000,
      computedAt: '2026-08-10T01:00:00Z',
    };
    expect(metricsRollupsResponseSchema.parse({ items: [item] })).toStrictEqual({ items: [item] });
    expect(metricsRollupItemSchema.safeParse({ ...item, computedAt: '2026-08-10' }).success).toBe(false);
  });
});
