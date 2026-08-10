'use client';

/**
 * S09 ダッシュボードの本体 (sys-metrics-tracking-p05 / I10)。
 *
 * 何を: 期間を指定して `/api/v1/metrics/summary` を読み、KPI・推移・活用率・
 *       ハーネス別ランキング・部門別内訳を描画する。
 * なぜ: server page は認可済み scope を渡すだけに保ち、期間変更のたびの再取得を
 *       ブラウザ側で完結させるため (期間を変えるたびに全画面を再描画させない)。
 *
 * 数値は API が返した確定値をそのまま出す。ここでの算術は表示整形と並べ替えだけで、
 * 削減時間・削減額の換算は一切行わない (SEC5: 金額換算はサーバ側の 1 経路に閉じる)。
 */
import type { MetricsSummaryResponse } from '@harness-hub/schemas';
import { Alert, BarChart, Button, DataTable, DonutChart, KpiCard, LineChart, TextInput } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';

import {
  activeHarnessRatio,
  buildSummaryQuery,
  DEFAULT_SUMMARY_RANGE_DAYS,
  formatHours,
  formatJpy,
  formatPercent,
  formatRunCount,
  type MetricsDateRange,
  toDepartmentChartData,
  topRanking,
  toRankingChartData,
  toTrendSeries,
} from '../../../features/metrics-tracking/view-model.js';

interface MetricsDashboardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /** URL クエリで期間が指定されていればそれを初期値にする (共有された URL が同じ絵を出す)。 */
  readonly initialRange: MetricsDateRange;
}

const gridStyle = {
  display: 'grid',
  gap: 'var(--hh-space-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
} as const;

const chartGridStyle = {
  display: 'grid',
  gap: 'var(--hh-space-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
} as const;

const formStyle = {
  display: 'flex',
  gap: 'var(--hh-space-3)',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  marginBottom: 'var(--hh-space-4)',
} as const;

export function MetricsDashboard({ tenantId, workspaceId, initialRange }: MetricsDashboardProps): ReactNode {
  const [draftRange, setDraftRange] = useState<MetricsDateRange>(initialRange);
  const [range, setRange] = useState<MetricsDateRange>(initialRange);
  const [summary, setSummary] = useState<MetricsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/metrics/summary?${buildSummaryQuery(range)}`, {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error('集計を取得できませんでした。');
      setSummary((await response.json()) as MetricsSummaryResponse);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '集計を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [range, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyRange = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setRange(draftRange);
  };

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="読み込みエラー" description={error} />}

      <form aria-label="集計期間の指定" onSubmit={applyRange} style={formStyle}>
        <TextInput
          label="開始日"
          type="date"
          value={draftRange.from}
          onChange={(event) => setDraftRange((current) => ({ ...current, from: event.target.value }))}
        />
        <TextInput
          label="終了日"
          type="date"
          value={draftRange.to}
          onChange={(event) => setDraftRange((current) => ({ ...current, to: event.target.value }))}
        />
        <Button type="submit" disabled={loading}>
          期間を適用
        </Button>
      </form>

      {summary === null ? (
        <p>
          {loading ? `直近 ${DEFAULT_SUMMARY_RANGE_DAYS} 日の集計を読み込んでいます。` : '表示できる集計がありません。'}
        </p>
      ) : (
        <>
          <div style={gridStyle}>
            <KpiCard label="総実行回数" value={formatRunCount(summary.kpi.totalRunCount)} unit="回" />
            <KpiCard label="削減時間" value={formatHours(summary.kpi.savedHours)} unit="時間" />
            <KpiCard label="削減額" value={formatJpy(summary.kpi.savedAmountJpy)} unit="円" />
            <KpiCard label="活用ハーネス数" value={formatRunCount(summary.kpi.harnessCount)} unit="件" />
            <KpiCard label="活用率" value={formatPercent(activeHarnessRatio(summary))} unit="%" />
          </div>

          <div style={chartGridStyle}>
            <LineChart title="実行回数と削減時間の推移" series={toTrendSeries(summary.trend)} />
            <BarChart title="ハーネス別の削減額" data={toRankingChartData(summary.ranking)} />
            <DonutChart title="部門別の削減額" data={toDepartmentChartData(summary.departments)} />
          </div>

          <DataTable
            caption="ハーネス別の削減効果"
            columns={[
              { key: 'harness', header: 'ハーネス', value: (row) => row.harnessName },
              { key: 'runCount', header: '実行回数', value: (row) => formatRunCount(row.runCount) },
              { key: 'savedHours', header: '削減時間 (時間)', value: (row) => formatHours(row.savedHours) },
              { key: 'savedAmount', header: '削減額 (円)', value: (row) => formatJpy(row.savedAmountJpy) },
            ]}
            rows={topRanking(summary.ranking)}
            rowKey={(row) => row.harnessId}
            loading={loading}
            emptyMessage="この期間に実行されたハーネスはありません。"
          />
        </>
      )}
    </>
  );
}
