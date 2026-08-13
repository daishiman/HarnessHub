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
import {
  Alert,
  Button,
  CardGrid,
  DataTable,
  FilterBar,
  IdBadge,
  KpiCard,
  LineChart,
  ListState,
  Panel,
  Select,
  Stack,
  StickyHeaderOffset,
} from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { AppliedFilterChips } from '../../../../components/filter/applied-filter-chips.js';
import { fetchMetricsProjectNames } from '../../../../features/metrics-tracking/project-names.js';
import {
  buildSummaryQuery,
  formatAxisDate,
  formatHours,
  formatJpy,
  formatRunCount,
  type MetricsDateRange,
  metricsDisplayLabel,
  resolvedMetricsName,
} from '../../../../features/metrics-tracking/view-model.js';

interface UsageSavingsReportProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly range: MetricsDateRange;
}

/** 分 → 時間。rollup は分で持つが、画面の単位は S09 と揃えて時間にする。 */
function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function UsageSavingsReport({ tenantId, workspaceId, range }: UsageSavingsReportProps): ReactNode {
  const [summary, setSummary] = useState<MetricsSummaryResponse | null>(null);
  const [rollups, setRollups] = useState<MetricsRollupsResponse | null>(null);
  // 選んだ値 (draft) と問い合わせへ適用した値 (harnessId) を分ける。
  // 他の一覧画面が「絞り込む」で確定する形に揃っているのに、ここだけ選んだ瞬間に
  // 表が入れ替わると、同じ帯なのに作法が違う画面になる。
  const [draftHarnessId, setDraftHarnessId] = useState<string>('');
  const [harnessId, setHarnessId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectNames, setProjectNames] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [projectNamesError, setProjectNamesError] = useState<string | null>(null);

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

  const items = rollups?.items ?? [];
  const harnessNames = new Map(summary?.ranking.map((entry) => [entry.harnessId, entry.harnessName]) ?? []);
  for (const [id, name] of projectNames) harnessNames.set(id, name);
  const displayHarness = (id: string): string => metricsDisplayLabel(id, harnessNames.get(id), '業務ツール');
  const hasUnresolvedProjectNames =
    (summary?.ranking.some(
      (entry) => resolvedMetricsName(entry.harnessId, harnessNames.get(entry.harnessId)) === null,
    ) ??
      false) ||
    items.some((item) => resolvedMetricsName(item.dimKey, harnessNames.get(item.dimKey)) === null);

  return (
    <Stack gap={4}>
      <StickyHeaderOffset />
      {/* 絞り込みの並びと余白は共通の FilterBar に任せる */}
      <FilterBar
        label="業務ツールの絞り込み"
        sticky
        appliedChips={
          harnessId === '' ? undefined : (
            <AppliedFilterChips items={[{ label: '業務ツール', value: displayHarness(harnessId) }]} />
          )
        }
        variant="card"
        onSubmit={(event) => {
          event.preventDefault();
          setHarnessId(draftHarnessId);
        }}
        actions={
          <Button type="submit" disabled={loading}>
            絞り込む
          </Button>
        }
      >
        <Select
          label="業務ツール"
          value={draftHarnessId}
          onChange={(event) => setDraftHarnessId(event.target.value)}
          options={[
            { value: '', label: 'すべての業務ツール' },
            ...(summary?.ranking ?? []).map((entry) => ({
              value: entry.harnessId,
              label: metricsDisplayLabel(entry.harnessId, entry.harnessName, '業務ツール'),
            })),
          ]}
        />
      </FilterBar>

      {projectNamesError === null || !hasUnresolvedProjectNames ? null : (
        <Alert
          tone="warning"
          title="業務ツール名を ID で表示しています"
          description="使用状況と削減効果は取得済みです。名称だけを再取得できます。"
          action={<Button onClick={() => void loadProjectNames()}>名称を再取得</Button>}
        />
      )}

      {/* 取得失敗・0 件・中身の出し分けは共通の ListState に任せる。
          読み込めなかったときに「集計はまだ確定していません」と言うと、
          待てば出ると誤解されて再試行にたどり着けない */}
      <ListState
        error={error}
        onRetry={() => void load()}
        loading={loading}
        isEmpty={summary === null && items.length === 0}
        emptyTitle="表示できる集計がありません"
        emptyDescription="この期間の週ごとの集計はまだ確定していません。集計は毎日自動で更新されます。"
      >
        {summary === null ? null : (
          <CardGrid columns="kpi">
            <KpiCard label="期間内の実行回数" value={formatRunCount(summary.kpi.totalRunCount)} unit="回" />
            <KpiCard label="期間内に減らせた時間" value={formatHours(summary.kpi.savedHours)} unit="時間" />
            <KpiCard label="期間内に減らせた金額" value={formatJpy(summary.kpi.savedAmountJpy)} unit="円" />
          </CardGrid>
        )}

        <Panel title="週ごとの推移">
          <LineChart
            title="週次の削減額の推移"
            series={[
              {
                name: '削減額 (円)',
                points: items.map((item) => ({ label: formatAxisDate(item.periodStart), value: item.savedAmountJpy })),
              },
            ]}
          />
        </Panel>

        {/* 週どうしを見比べる一覧なので narrow でも table を維持する。見出し行だけ貼り付ける
            (型の割当は docs/screen-inventory.md の narrow profile) */}
        <Panel title="週ごとの内訳" description="列の見出しを押すと並べ替えられます。" flush>
          {/* 数値列は value に生の数値を返し、表示は render に任せる。
              桁区切り付きの文字列を value にすると「1,234 < 9」のような文字列比較で並んでしまう */}
          {/* ここはカードへ畳まない (narrowAs を既定の表のままにする)。
              この表は「週を縦に並べて推移を読む」ためのもので、1 件ずつのカードにすると
              前の週との差が読めなくなり、表として見る意味そのものが消える。
              加えて先頭列が週の開始日なので、カードの見出しが同じ日付で何枚も並んでしまう。
              狭い画面では横スクロール (DataTable が既定で用意する) で読む。 */}
          <DataTable
            caption="週次の使用状況と削減効果"
            columns={[
              {
                key: 'periodStart',
                header: '週の開始日',
                sortable: true,
                sticky: true,
                width: '10rem',
                value: (row) => row.periodStart,
              },
              {
                key: 'harness',
                header: '業務ツール',
                sortable: true,
                width: '14rem',
                value: (row) => displayHarness(row.dimKey),
                render: (row) =>
                  resolvedMetricsName(row.dimKey, harnessNames.get(row.dimKey)) ?? (
                    <IdBadge value={row.dimKey} label="業務ツール ID" />
                  ),
              },
              {
                key: 'runCount',
                header: '実行回数',
                sortable: true,
                align: 'end',
                value: (row) => row.runCount,
                render: (row) => formatRunCount(row.runCount),
              },
              {
                key: 'savedHours',
                header: '減らせた時間 (時間)',
                sortable: true,
                align: 'end',
                value: (row) => minutesToHours(row.savedMinutes),
                render: (row) => formatHours(minutesToHours(row.savedMinutes)),
              },
              {
                key: 'savedAmount',
                header: '減らせた金額 (円)',
                sortable: true,
                align: 'end',
                value: (row) => row.savedAmountJpy,
                render: (row) => formatJpy(row.savedAmountJpy),
              },
            ]}
            rows={items}
            rowKey={(row) => `${row.periodStart}:${row.dimKey}`}
            loading={loading}
            stickyHeader
            emptyMessage="この期間の週ごとの集計はまだ確定していません。集計は毎日自動で更新されます。"
          />
        </Panel>
      </ListState>
    </Stack>
  );
}
