/**
 * MT-VM-*: S09/S16 の表示ロジック (純関数)。
 *
 * 画面部品を動かさずに検証できる部分をここへ集める。DOM を起こす検査は
 * 実行が重く、失敗したときに「整形が違う」のか「描画が違う」のか切り分けられないため。
 *
 * 併せて「この層が金額を作らない」ことも確かめる。SEC5 の要は
 * クライアント側に換算式を持たせないことなので、入力に無い数字が出力に現れてはいけない。
 */
import type { MetricsSummaryResponse } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import {
  activeHarnessRatio,
  buildSummaryQuery,
  DEFAULT_SUMMARY_RANGE_DAYS,
  formatAxisDate,
  formatHours,
  formatJpy,
  formatPercent,
  formatRunCount,
  RANKING_DISPLAY_LIMIT,
  recentRange,
  toDepartmentChartData,
  topRanking,
  toRankingChartData,
  toTrendSeries,
} from '../../features/metrics-tracking/view-model.js';

/** 2026-07-10 12:00 JST。JST 境界の判定が UTC に流れていないかを見るため昼の時刻にしてある。 */
const NOW = new Date(Date.UTC(2026, 6, 10, 3, 0, 0));

function summary(overrides: Partial<MetricsSummaryResponse> = {}): MetricsSummaryResponse {
  return {
    period: { from: '2026-07-01', to: '2026-07-10' },
    kpi: { totalRunCount: 0, savedHours: 0, savedAmountJpy: 0, harnessCount: 0 },
    trend: [],
    ranking: [],
    departments: [],
    ...overrides,
  };
}

describe('MT-VM: 表示期間', () => {
  it('MT-VM-001: 既定期間は当日を含む直近 30 日になる', () => {
    const range = recentRange(NOW, DEFAULT_SUMMARY_RANGE_DAYS);

    expect(range.to).toBe('2026-07-10');
    // 当日を含めて 30 日なので下限は 29 日前
    expect(range.from).toBe('2026-06-11');
  });

  it('MT-VM-002: 期間の境界は JST。UTC ではまだ前日でも当日として扱う', () => {
    // 2026-07-11 00:30 JST = 2026-07-10 15:30 UTC
    const range = recentRange(new Date(Date.UTC(2026, 6, 10, 15, 30)), 1);

    expect(range.to).toBe('2026-07-11');
    expect(range.from).toBe('2026-07-11');
  });

  it('MT-VM-003: harnessId は指定されたときだけクエリに載る', () => {
    const range = { from: '2026-07-01', to: '2026-07-10' };

    expect(buildSummaryQuery(range)).toBe('from=2026-07-01&to=2026-07-10');
    expect(buildSummaryQuery(range, '')).toBe('from=2026-07-01&to=2026-07-10');
    expect(buildSummaryQuery(range, 'harness-alpha')).toContain('harnessId=harness-alpha');
  });
});

describe('MT-VM: 数値の整形', () => {
  it('MT-VM-004: 実行回数は桁区切り、削減時間は小数第 1 位、削減額は円単位で丸める', () => {
    expect(formatRunCount(12_345)).toBe('12,345');
    expect(formatHours(7.5)).toBe('7.5');
    expect(formatHours(7)).toBe('7.0');
    // 端数を実額のように見せない
    expect(formatJpy(1050.4)).toBe('1,050');
    expect(formatJpy(1050.6)).toBe('1,051');
  });

  it('MT-VM-005: 軸ラベルは年を落とした M/D 表記にする', () => {
    expect(formatAxisDate('2026-07-06')).toBe('7/6');
    expect(formatAxisDate('2026-12-25')).toBe('12/25');
  });
});

describe('MT-VM: チャート入力の組み立て', () => {
  const RANKING = [
    { harnessId: 'a', harnessName: 'Alpha', runCount: 5, savedHours: 1, savedAmountJpy: 1_000 },
    { harnessId: 'b', harnessName: 'Beta', runCount: 20, savedHours: 4, savedAmountJpy: 4_000 },
    { harnessId: 'c', harnessName: 'Gamma', runCount: 0, savedHours: 0, savedAmountJpy: 0 },
  ];

  it('MT-VM-006: ランキングは削減額の降順で、上限件数までに切り詰める', () => {
    expect(topRanking(RANKING).map((entry) => entry.harnessId)).toEqual(['b', 'a', 'c']);
    expect(topRanking(RANKING, 2).map((entry) => entry.harnessId)).toEqual(['b', 'a']);

    const many = Array.from({ length: RANKING_DISPLAY_LIMIT + 5 }, (_unused, index) => ({
      harnessId: `h${index}`,
      harnessName: `H${index}`,
      runCount: index,
      savedHours: index,
      savedAmountJpy: index,
    }));
    expect(topRanking(many)).toHaveLength(RANKING_DISPLAY_LIMIT);
  });

  it('MT-VM-007: 並べ替えは元配列を破壊しない', () => {
    const original = [...RANKING];
    topRanking(RANKING);

    expect(RANKING).toEqual(original);
  });

  it('MT-VM-008: 推移は実行回数と削減時間の 2 系列。金額は桁が違うので別系列にしない', () => {
    const series = toTrendSeries([{ periodStart: '2026-07-06', runCount: 10, savedHours: 2.5, savedAmountJpy: 7_500 }]);

    expect(series.map((entry) => entry.name)).toEqual(['実行回数', '削減時間 (時間)']);
    expect(series[0]?.points[0]).toEqual({ label: '7/6', value: 10 });
    expect(series[1]?.points[0]).toEqual({ label: '7/6', value: 2.5 });
  });

  it('MT-VM-009: 棒・ドーナツは受け取った金額をそのまま値にする (再計算しない)', () => {
    expect(toRankingChartData(RANKING)[0]).toEqual({ label: 'Beta', value: 4_000 });
    expect(
      toDepartmentChartData([
        { departmentId: null, departmentName: '部門未設定', runCount: 3, savedHours: 1, savedAmountJpy: 900 },
      ]),
    ).toEqual([{ label: '部門未設定', value: 900 }]);
  });
});

describe('MT-VM: 活用率', () => {
  it('MT-VM-010: 実行実績のあるハーネスの比率を返す', () => {
    const ratio = activeHarnessRatio(
      summary({
        ranking: [
          { harnessId: 'a', harnessName: 'A', runCount: 1, savedHours: 0, savedAmountJpy: 0 },
          { harnessId: 'b', harnessName: 'B', runCount: 0, savedHours: 0, savedAmountJpy: 0 },
        ],
      }),
    );

    expect(ratio).toBe(0.5);
    expect(formatPercent(ratio)).toBe('50');
  });

  it('MT-VM-011: ハーネスが 0 件のときは 0 を返す (母数 0 を 100% と読ませない)', () => {
    expect(activeHarnessRatio(summary())).toBe(0);
    expect(formatPercent(0)).toBe('0');
  });
});
