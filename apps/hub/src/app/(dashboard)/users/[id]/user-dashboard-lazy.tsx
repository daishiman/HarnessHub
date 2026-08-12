'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const UserDashboard = dynamic(() => import('./user-dashboard.js').then((module) => module.UserDashboard), {
  ssr: false,
  loading: () => <p aria-live="polite">利用者の情報を読み込んでいます。</p>,
});

interface LazyUserDashboardProps {
  readonly userId: string;
  readonly tenantId: string;
}

export function LazyUserDashboard(props: LazyUserDashboardProps): ReactNode {
  return <UserDashboard {...props} />;
}
