import { SidebarLayout } from '@harness-hub/ui';
import type { ReactNode } from 'react';
import { PrimaryNav } from '../../components/primary-nav.js';
import { resolveDashboardScope } from '../../lib/routing/dashboard-scope.js';
import { DashboardScopeProvider } from './dashboard-scope-context.js';

/**
 * ここで解決した scope を Context 経由で読むのは client component 2 ファイル
 * (docs/[id], docs/[id]/edit) のみ。server component な page.tsx 群は Context を
 * 消費できないため、各自 resolveDashboardScope() を直接呼ぶ設計になっている。
 * resolveDashboardScope() 自体は React cache() でリクエスト単位にメモ化されているため、
 * 同一リクエスト内で複数回呼んでも session cookie の検証は 1 回しか走らない。
 */
export default async function DashboardLayout({ children }: { readonly children: ReactNode }) {
  const scope = await resolveDashboardScope();
  return (
    <DashboardScopeProvider scope={scope}>
      {/* ナビゲーションと内容の配置は SidebarLayout が唯一の実装を持つ ((workspace) 側と同じ骨格にするため) */}
      <SidebarLayout nav={<PrimaryNav tenantId={scope.tenantId ?? ''} workspaceId={scope.workspaceId ?? ''} />}>
        {children}
      </SidebarLayout>
    </DashboardScopeProvider>
  );
}
