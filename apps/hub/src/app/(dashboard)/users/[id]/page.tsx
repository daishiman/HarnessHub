import type { Metadata } from 'next';
import { UserDashboard } from './user-dashboard.js';

export const metadata: Metadata = {
  title: 'ユーザー詳細 | Harness Hub',
};

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly tenant?: string }>;
}

export default async function UserDashboardPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <section aria-labelledby="user-dashboard-heading">
      <h1 id="user-dashboard-heading">ユーザー詳細</h1>
      <UserDashboard userId={id} tenantId={query.tenant ?? ''} />
    </section>
  );
}
