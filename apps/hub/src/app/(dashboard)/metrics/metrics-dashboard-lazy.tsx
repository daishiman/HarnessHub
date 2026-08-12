'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import type { MetricsDateRange } from '../../../features/metrics-tracking/view-model.js';

const MetricsDashboard = dynamic(() => import('./metrics-dashboard.js').then((module) => module.MetricsDashboard), {
  ssr: false,
  loading: () => <p aria-live="polite">効果測定データを読み込んでいます。</p>,
});

interface LazyMetricsDashboardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly initialRange: MetricsDateRange;
}

/** データ取得とグラフ群を初期 shell から分離し、画面見出しを先に表示する。 */
export function LazyMetricsDashboard(props: LazyMetricsDashboardProps): ReactNode {
  return <MetricsDashboard {...props} />;
}
