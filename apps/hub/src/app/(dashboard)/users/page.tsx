import type { Metadata } from 'next';
import { resolveDashboardScope, tenantIdFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { UserList } from './user-list.js';

export const metadata: Metadata = {
  title: 'ユーザー管理 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  return (
    <section aria-labelledby="users-heading">
      <h1 id="users-heading">ユーザー管理</h1>
      <UserList tenantId={tenantIdFromQuery(query, scope)} />
    </section>
  );
}
