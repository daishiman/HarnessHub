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
import {
  Alert,
  BarChart,
  Button,
  CardGrid,
  DataTable,
  DonutChart,
  FilterBar,
  KpiCard,
  LineChart,
  ListState,
  Panel,
  Stack,
  StickyHeaderOffset,
  TextInput,
} from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';

import { AppliedFilterChips } from '../../../components/filter/applied-filter-chips.js';
import { fetchMetricsProjectNames } from '../../../features/metrics-tracking/project-names.js';
import {
  activeHarnessRatio,
  buildSummaryQuery,
  DEFAULT_SUMMARY_RANGE_DAYS,
  formatHours,
  formatJpy,
  formatPercent,
  formatRunCount,
  type MetricsDateRange,
  metricsDisplayLabel,
  RANKING_DISPLAY_LIMIT,
  rankingRows,
  resolvedMetricsName,
  toDepartmentChartData,
  toRankingChartData,
  toTrendSeries,
} from '../../../features/metrics-tracking/view-model.js';

interface MetricsDashboardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /** URL クエリで期間が指定されていればそれを初期値にする (共有された URL が同じ絵を出す)。 */
  readonly initialRange: MetricsDateRange;
}

export function MetricsDashboard({ tenantId, workspaceId, initialRange }: MetricsDashboardProps): ReactNode {
  const [draftRange, setDraftRange] = useState<MetricsDateRange>(initialRange);
  const [range, setRange] = useState<MetricsDateRange>(initialRange);
  const [summary, setSummary] = useState<MetricsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectNames, setProjectNames] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [projectNamesError, setProjectNamesError] = useState<string | null>(null);

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

  const loadProjectNames = useCallback(async () => {
    try {
      setProjectNames(await fetchMetricsProjectNames({ tenantId, workspaceId }));
      setProjectNamesError(null);
    } catch (cause) {
      setProjectNames(new Map());
      setProjectNamesError(cause instanceof Error ? cause.message : '業務ツール名を取得できませんでした。');
    }
  }, [tenantId, workspaceId]);

  useEffect(() => {
    void loadProjectNames();
  }, [loadProjectNames]);

  const applyRange = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setRange(draftRange);
  };

  // 割合は「算出できたか」で表示が変わるので、描画の中で条件分岐せず先に確定させておく
  const activeRatio = summary === null ? null : activeHarnessRatio(summary);
  const hasUnresolvedProjectNames =
    summary?.ranking.some(
      (entry) => resolvedMetricsName(entry.harnessId, projectNames.get(entry.harnessId) ?? entry.harnessName) === null,
    ) ?? false;

  return (
    <Stack gap={4}>
      <StickyHeaderOffset />
      {/* 並びと余白は共通の FilterBar に任せる (画面ごとの書き起こしをやめる) */}
      <FilterBar
        label="集計期間の指定"
        sticky
        appliedChips={
          <AppliedFilterChips
            items={[
              { label: '開始日', value: range.from },
              { label: '終了日', value: range.to },
            ]}
          />
        }
        onSubmit={applyRange}
        variant="card"
        // ボタンの語彙は全画面で「絞り込む」に揃える。ここだけ「この期間で集計する」だと、
        // 同じ形の帯なのに操作名が違う画面ができ、利用者が毎回読み直すことになる。
        actions={
          <Button type="submit" disabled={loading}>
            絞り込む
          </Button>
        }
      >
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
      </FilterBar>

      {projectNamesError === null || !hasUnresolvedProjectNames ? null : (
        <Alert
          tone="warning"
          title="業務ツール名を ID で表示しています"
          description="集計値は取得済みです。名称だけを再取得できます。"
          action={<Button onClick={() => void loadProjectNames()}>名称を再取得</Button>}
        />
      )}

      {/* 取得失敗・0 件・中身の出し分けは共通の ListState に任せる。
          失敗したときに「表示できる集計がありません」と言うと、期間の問題だと誤解される */}
      <ListState
        error={error}
        onRetry={() => void load()}
        loading={loading}
        isEmpty={summary === null}
        emptyTitle="表示できる集計がありません"
        emptyDescription="指定した期間に記録された実行がありません。期間を広げてお試しください。"
      >
        {summary === null ? (
          <p>{`直近 ${DEFAULT_SUMMARY_RANGE_DAYS} 日の集計を読み込んでいます。`}</p>
        ) : (
          <>
            {/* chart+table の型。数値サマリー・グラフ・比較用の表を、それぞれ共通の器へ載せる
                (型の割当は docs/screen-inventory.md、部品への写し方は frontend-ui-foundation-spec §5-1) */}
            <CardGrid columns="kpi">
              <KpiCard label="総実行回数" value={formatRunCount(summary.kpi.totalRunCount)} unit="回" />
              <KpiCard label="減らせた時間" value={formatHours(summary.kpi.savedHours)} unit="時間" />
              <KpiCard label="減らせた金額" value={formatJpy(summary.kpi.savedAmountJpy)} unit="円" />
              <KpiCard label="使われたツール数" value={formatRunCount(summary.kpi.harnessCount)} unit="件" />
              {/* 母数 0 のときは「—」を出す。単位の % を付けたままだと「—%」となり、
                  算出できていないのか 0 なのかがまた分からなくなる */}
              <KpiCard
                label="使われている割合"
                value={formatPercent(activeRatio)}
                {...(activeRatio === null ? {} : { unit: '%' })}
              />
            </CardGrid>

            <CardGrid columns="wide">
              <LineChart title="実行回数と削減時間の推移" series={toTrendSeries(summary.trend)} />
              <BarChart
                title={`ツール別の削減額 (上位 ${RANKING_DISPLAY_LIMIT} 件)`}
                data={toRankingChartData(
                  summary.ranking.map((entry) => ({
                    ...entry,
                    harnessName: projectNames.get(entry.harnessId) ?? entry.harnessName,
                  })),
                )}
              />
              <DonutChart title="部門別の削減額" data={toDepartmentChartData(summary.departments)} />
            </CardGrid>

            <Panel
              title="ツール別の削減効果"
              description={`金額の大きい順に上位 ${RANKING_DISPLAY_LIMIT} 件を出しています。列の見出しを押すと並べ替えられます。`}
              flush
            >
              {/* 数値列は value に生の数値を返し、表示は render に任せる。
                  桁区切り付きの文字列を value にすると「1,234 < 9」のような文字列比較で並んでしまう */}
              {/* 狭い画面では 4 列が横へはみ出す。金額の大きい順という並び自体はカードでも
                  縦の順序として残るので、見比べを諦めて 1 件ずつ読める形へ畳む */}
              <DataTable
                caption="ハーネス別の削減効果"
                narrowAs="card-collection"
                columns={[
                  {
                    key: 'harness',
                    header: '業務ツール',
                    sortable: true,
                    sticky: true,
                    width: '16rem',
                    value: (row) =>
                      metricsDisplayLabel(
                        row.harnessId,
                        projectNames.get(row.harnessId) ?? row.harnessName,
                        '業務ツール',
                      ),
                    // 狭い画面ではこのセルが DataCard の見出し (<p>) になる。
                    // details 要素の IdBadge を入れると HTML が不正になるため、ここは
                    // 「業務ツール ID」と文字で明示して名称との取り違えを防ぐ。
                    render: (row) =>
                      resolvedMetricsName(row.harnessId, projectNames.get(row.harnessId) ?? row.harnessName) ??
                      metricsDisplayLabel(row.harnessId, null, '業務ツール'),
                  },
                  {
                    key: 'runCount',
                    header: '実行回数',
                    sortable: true,
                    align: 'end',
                    value: (row) => row.runCount,
                    render: (row) => formatRunCount(row.runCount),
                    // 実行回数は金額・時間の内訳にあたる数字なので、読む順は最後で足りる
                    salience: 'metadata',
                  },
                  {
                    key: 'savedHours',
                    header: '減らせた時間 (時間)',
                    sortable: true,
                    align: 'end',
                    value: (row) => row.savedHours,
                    render: (row) => formatHours(row.savedHours),
                    salience: 'context',
                  },
                  {
                    key: 'savedAmount',
                    header: '減らせた金額 (円)',
                    sortable: true,
                    align: 'end',
                    value: (row) => row.savedAmountJpy,
                    render: (row) => formatJpy(row.savedAmountJpy),
                    // この画面が並べ替えの既定にしている指標。カードでも名前の直後に置く
                    salience: 'lead',
                  },
                ]}
                rows={rankingRows(summary.ranking)}
                rowKey={(row) => row.harnessId}
                loading={loading}
                stickyHeader
                emptyMessage="この期間に実行された業務ツールはありません。"
              />
            </Panel>
          </>
        )}
      </ListState>
    </Stack>
  );
}
