import { SidebarLayout } from '@harness-hub/ui';
import type { ReactNode } from 'react';
import { PrimaryNav } from '../../components/primary-nav.js';
import { resolveDashboardScope } from '../../lib/routing/dashboard-scope.js';

export default async function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  const scope = await resolveDashboardScope();
  return (
    // ナビゲーションと内容の配置は SidebarLayout が唯一の実装を持つ ((dashboard) 側と同じ骨格にするため)
    <SidebarLayout nav={<PrimaryNav tenantId={scope.tenantId ?? ''} workspaceId={scope.workspaceId ?? ''} />}>
      {children}
    </SidebarLayout>
  );
}
