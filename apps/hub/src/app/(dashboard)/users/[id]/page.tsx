import type { Metadata } from 'next';
import { resolveDashboardScope, tenantIdFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { UserDashboard } from './user-dashboard.js';

export const metadata: Metadata = {
  title: 'ユーザー詳細 | Harness Hub',
};

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly tenant?: string }>;
}

export default async function UserDashboardPage({ params, searchParams }: PageProps) {
  const [{ id }, query, scope] = await Promise.all([params, searchParams, resolveDashboardScope()]);
  return (
    <section aria-labelledby="user-dashboard-heading">
      <h1 id="user-dashboard-heading">ユーザー詳細</h1>
      <UserDashboard userId={id} tenantId={tenantIdFromQuery(query, scope)} />
    </section>
  );
}
