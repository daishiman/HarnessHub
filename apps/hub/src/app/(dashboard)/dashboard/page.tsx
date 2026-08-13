import { ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { HomeDashboardLazy } from './home-dashboard-lazy.js';

export const metadata: Metadata = {
  title: 'ホーム | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);

  return (
    <>
      <ScreenHeader
        id="dashboard-heading"
        title="ホーム"
        description="自分が最後に触ったものと、いつもの業務への入口を確認できます。"
      />
      {/* 一覧画面と違い、複数の関心事 (要対応/業務への導線/最近の動き) を
          縦に並べる画面のため、単一の Panel(flush) では包まない。区切りは
          home-dashboard.tsx 側でセクションごとの Panel が持つ。 */}
      <HomeDashboardLazy tenantId={tenantId} workspaceId={workspaceId} />
    </>
  );
}
