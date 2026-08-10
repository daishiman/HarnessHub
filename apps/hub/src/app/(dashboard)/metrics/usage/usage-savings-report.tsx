'use client';

/**
 * S16 使用状況・削減効果 (ハーネス別 / 週次) の本体 (sys-metrics-tracking-p05 / I10)。
 *
 * 何を: ハーネスを 1 つ選び、その週次 rollup と期間合計を表示する。
 * なぜ: S09 が「全体でどれだけ効いたか」を見る画面なのに対し、ここは
 *       「どのハーネスが継続して使われているか」を週単位の並びで見るための画面。
 *
 * ハーネスの選択肢は summary の ranking から作る。ハーネス名のマスタ表がまだ無く、
 * 「この期間に実行実績があるハーネス」を列挙できる唯一の経路がここだから。
 *
 * rollups は読取専用の API で、値はすべて cron が確定させたもの。
 * 画面側で削減時間・削減額を再計算しない (SEC5)。
 */
import type { MetricsRollupsResponse, MetricsSummaryResponse } from '@harness-hub/schemas';
import { Alert, DataTable, KpiCard, LineChart, Select } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import {
  buildSummaryQuery,
  formatAxisDate,
  formatHours,
  formatJpy,
  formatRunCount,
  type MetricsDateRange,
} from '../../../../features/metrics-tracking/view-model.js';

interface UsageSavingsReportProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly range: MetricsDateRange;
}

const gridStyle = {
  display: 'grid',
  gap: 'var(--hh-space-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  marginBlock: 'var(--hh-space-4)',
} as const;

/** 分 → 時間。rollup は分で持つが、画面の単位は S09 と揃えて時間にする。 */
function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function UsageSavingsReport({ tenantId, workspaceId, range }: UsageSavingsReportProps): ReactNode {
  const [summary, setSummary] = useState<MetricsSummaryResponse | null>(null);
  const [rollups, setRollups] = useState<MetricsRollupsResponse | null>(null);
  const [harnessId, setHarnessId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // scope ヘッダは load の中で組む。外に出すと毎描画で別 object になり、
      // useCallback の依存に載せた瞬間に再取得が止まらなくなる。
      const headers = {
        'x-harness-tenant-id': tenantId,
        'x-harness-workspace-id': workspaceId,
      };
      const summaryQuery = buildSummaryQuery(range, harnessId);
      const rollupQuery = new URLSearchParams({
        period: 'weekly',
        dim: 'harness',
        from: range.from,
        to: range.to,
      });
      if (harnessId !== '') rollupQuery.set('harnessId', harnessId);

      const [summaryResponse, rollupResponse] = await Promise.all([
        fetch(`/api/v1/metrics/summary?${summaryQuery}`, { credentials: 'same-origin', headers }),
        fetch(`/api/v1/metrics/rollups?${rollupQuery.toString()}`, { credentials: 'same-origin', headers }),
      ]);
      if (!summaryResponse.ok || !rollupResponse.ok) throw new Error('使用状況を取得できませんでした。');

      setSummary((await summaryResponse.json()) as MetricsSummaryResponse);
      setRollups((await rollupResponse.json()) as MetricsRollupsResponse);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '使用状況を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [harnessId, range, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = rollups?.items ?? [];

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="読み込みエラー" description={error} />}

      <Select
        label="ハーネス"
        value={harnessId}
        onChange={(event) => setHarnessId(event.target.value)}
        options={[
          { value: '', label: 'すべてのハーネス' },
          ...(summary?.ranking ?? []).map((entry) => ({ value: entry.harnessId, label: entry.harnessName })),
        ]}
      />

      {summary === null ? null : (
        <div style={gridStyle}>
          <KpiCard label="期間内の実行回数" value={formatRunCount(summary.kpi.totalRunCount)} unit="回" />
          <KpiCard label="期間内の削減時間" value={formatHours(summary.kpi.savedHours)} unit="時間" />
          <KpiCard label="期間内の削減額" value={formatJpy(summary.kpi.savedAmountJpy)} unit="円" />
        </div>
      )}

      <LineChart
        title="週次の削減額の推移"
        series={[
          {
            name: '削減額 (円)',
            points: items.map((item) => ({ label: formatAxisDate(item.periodStart), value: item.savedAmountJpy })),
          },
        ]}
      />

      <DataTable
        caption="週次の使用状況と削減効果"
        columns={[
          { key: 'periodStart', header: '週の開始日', value: (row) => row.periodStart },
          { key: 'harness', header: 'ハーネス', value: (row) => row.dimKey },
          { key: 'runCount', header: '実行回数', value: (row) => formatRunCount(row.runCount) },
          {
            key: 'savedHours',
            header: '削減時間 (時間)',
            value: (row) => formatHours(minutesToHours(row.savedMinutes)),
          },
          { key: 'savedAmount', header: '削減額 (円)', value: (row) => formatJpy(row.savedAmountJpy) },
        ]}
        rows={items}
        rowKey={(row) => `${row.periodStart}:${row.dimKey}`}
        loading={loading}
        emptyMessage="この期間の週次集計はまだ確定していません。"
      />
    </>
  );
}
