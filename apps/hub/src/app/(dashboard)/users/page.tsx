import type { Metadata } from 'next';
import { UserList } from './user-list.js';

export const metadata: Metadata = {
  title: 'ユーザー管理 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return (
    <section aria-labelledby="users-heading">
      <h1 id="users-heading">ユーザー管理</h1>
      <UserList tenantId={query.tenant ?? ''} />
    </section>
  );
}
