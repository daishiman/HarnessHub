import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { resolveDashboardScope, tenantIdFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { UserList } from './user-list.js';

export const metadata: Metadata = {
  title: 'ユーザー管理 | Harness Hub',
};

interface PageProps {
  /** `q` は共通ヘッダーの検索フォームから届く (§3.0)。 */
  readonly searchParams: Promise<{ readonly tenant?: string; readonly q?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const initialQuery = query.q?.trim() ?? '';
  return (
    <>
      <ScreenHeader
        id="users-heading"
        title="ユーザー管理"
        description="テナントに所属する利用者と、その役割を確認します。"
        sticky
      />
      <Panel flush>
        <UserList tenantId={tenantIdFromQuery(query, scope)} initialQuery={initialQuery} />
      </Panel>
    </>
  );
}
