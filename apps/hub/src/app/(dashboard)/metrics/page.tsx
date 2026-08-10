/**
 * S09 効果測定ダッシュボード (sys-metrics-tracking-p05 / I10)。
 *
 * 何を: 認可済み scope と初期表示期間を決めて、描画本体 (client component) へ渡す。
 * なぜ: server page を薄く保つ規約に従う。データ取得は期間変更のたびに走るため client 側に置く。
 *
 * 期間は URL クエリで上書きできる。ダッシュボードの URL をそのまま共有したときに、
 * 受け取った相手が同じ期間の絵を見られるようにするため。
 */
import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { DEFAULT_SUMMARY_RANGE_DAYS, recentRange } from '../../../features/metrics-tracking/view-model.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { MetricsDashboard } from './metrics-dashboard.js';

export const metadata: Metadata = {
  title: '効果測定ダッシュボード | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly from?: string;
    readonly to?: string;
  }>;
}

export default async function MetricsPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  const fallback = recentRange(new Date(), DEFAULT_SUMMARY_RANGE_DAYS);

  return (
    <>
      <ScreenHeader
        id="metrics-heading"
        title="効果測定ダッシュボード"
        description="ハーネスの実行実績から、削減できた時間と金額を集計して表示します。金額はサーバ側で確定した値です。"
      />
      <Panel>
        <MetricsDashboard
          tenantId={tenantId}
          workspaceId={workspaceId}
          initialRange={{ from: query.from ?? fallback.from, to: query.to ?? fallback.to }}
        />
      </Panel>
    </>
  );
}
