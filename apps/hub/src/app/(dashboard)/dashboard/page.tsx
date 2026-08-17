/**
 * S00.LANDING (本人の最近と業務導線) と S09.METRICS (効果測定 KPI) の同居 route。
 *
 * 何を: 認可済み scope と初期表示期間を決めて、描画本体 (client component) 2 つへ渡す。
 * なぜ: `/metrics` を第二の画面 owner として残さないため、KPI もここへ寄せた (ADR §37)。
 *       旧 route は転送だけを持つ。
 *
 * 期間は URL クエリで上書きできる。この画面の URL をそのまま共有したときに、
 * 受け取った相手が同じ期間の絵を見られるようにするため。
 */
import { ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { DEFAULT_SUMMARY_RANGE_DAYS, recentRange } from '../../../features/metrics-tracking/view-model.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { HomeDashboardLazy } from './home-dashboard-lazy.js';
import { LazyMetricsDashboard } from './metrics-dashboard-lazy.js';

export const metadata: Metadata = {
  title: 'ホーム | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly from?: string;
    readonly to?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  const fallback = recentRange(new Date(), DEFAULT_SUMMARY_RANGE_DAYS);

  return (
    <>
      <ScreenHeader
        id="dashboard-heading"
        title="ホーム"
        description="自分が最後に触ったものと、いつもの業務への入口を確認できます。"
      />
      {/* 一覧画面と違い、複数の関心事 (要対応/業務への導線/最近の動き) を
          縦に並べる画面のため、単一の Panel(flush) では包まない。区切りは
          home-dashboard.tsx 側でセクションごとの Panel が持つ。 */}
      <HomeDashboardLazy tenantId={tenantId} workspaceId={workspaceId} />
      {/* KPI・グラフ・表は自前の面 (Panel) に載るので、ここで二重に囲まない。
          「最近の作業」を先に出し、集計はその下に置く (本人の作業が主・集計が従)。 */}
      <LazyMetricsDashboard
        tenantId={tenantId}
        workspaceId={workspaceId}
        initialRange={{ from: query.from ?? fallback.from, to: query.to ?? fallback.to }}
      />
    </>
  );
}
