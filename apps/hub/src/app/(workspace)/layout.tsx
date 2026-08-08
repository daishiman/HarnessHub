import type { ReactNode } from 'react';
import { PrimaryNav } from '../../components/primary-nav.js';
import { resolveDashboardScope } from '../../lib/routing/dashboard-scope.js';

export default async function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  const scope = await resolveDashboardScope();
  return (
    <>
      <PrimaryNav tenantId={scope.tenantId ?? ''} workspaceId={scope.workspaceId ?? ''} />
      {children}
    </>
  );
}
