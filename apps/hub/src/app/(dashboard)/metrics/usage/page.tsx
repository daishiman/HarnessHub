/**
 * S16 使用状況・削減効果 (sys-metrics-tracking-p05 / I10)。
 *
 * 何を: 認可済み scope と表示期間 (既定は直近 12 週) を決めて、描画本体へ渡す。
 * なぜ: S09 と同じく server page は薄く保ち、ハーネス切替のたびの再取得は client に任せる。
 *
 * 既定期間が S09 より長いのは、週次の並びを読むのに 30 日では点が 4〜5 個しか立たないため。
 */
import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { DEFAULT_USAGE_RANGE_DAYS, recentRange } from '../../../../features/metrics-tracking/view-model.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { UsageSavingsReport } from './usage-savings-report.js';

export const metadata: Metadata = {
  title: '使用状況・削減効果 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly from?: string;
    readonly to?: string;
  }>;
}

export default async function MetricsUsagePage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  const fallback = recentRange(new Date(), DEFAULT_USAGE_RANGE_DAYS);

  return (
    <>
      <ScreenHeader
        id="metrics-usage-heading"
        title="使用状況・削減効果"
        description="ハーネスごとの週次の実行回数と、確定済みの削減時間・削減額を表示します。"
      />
      <Panel>
        <UsageSavingsReport
          tenantId={tenantId}
          workspaceId={workspaceId}
          range={{ from: query.from ?? fallback.from, to: query.to ?? fallback.to }}
        />
      </Panel>
    </>
  );
}
