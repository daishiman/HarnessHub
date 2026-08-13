'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const HomeDashboard = dynamic(() => import('./home-dashboard.js').then((module) => module.HomeDashboard), {
  ssr: false,
  loading: () => <p aria-live="polite">ホームを読み込んでいます…</p>,
});

export function HomeDashboardLazy(props: { readonly tenantId: string; readonly workspaceId: string }): ReactNode {
  return <HomeDashboard {...props} />;
}
