'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import type { MetricsDateRange } from '../../../../features/metrics-tracking/view-model.js';

const UsageSavingsReport = dynamic(
  () => import('./usage-savings-report.js').then((module) => module.UsageSavingsReport),
  {
    ssr: false,
    loading: () => <p aria-live="polite">使用状況データを読み込んでいます。</p>,
  },
);

interface LazyUsageSavingsReportProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly range: MetricsDateRange;
}

/** データ取得とグラフ群を初期 shell から分離し、画面見出しを先に表示する。 */
export function LazyUsageSavingsReport(props: LazyUsageSavingsReportProps): ReactNode {
  return <UsageSavingsReport {...props} />;
}
