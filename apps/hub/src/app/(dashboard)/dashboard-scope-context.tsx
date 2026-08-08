'use client';

/**
 * layout.tsx (server component) が cookie から解決した既定 scope を、
 * client component な page.tsx (docs/[id] など) へ配る。
 * DOCS-SEC7-101/102 により docs 詳細・編集ページは server wrapper + client companion への分割を採れないため、
 * layout 側で解決した値を Context 経由で受け取る。
 */

import { createContext, type ReactNode, useContext } from 'react';
import type { DashboardScope } from '../../lib/routing/dashboard-scope.js';

const DashboardScopeContext = createContext<DashboardScope>({ tenantId: null, workspaceId: null });

export function DashboardScopeProvider({
  scope,
  children,
}: {
  readonly scope: DashboardScope;
  readonly children: ReactNode;
}) {
  return <DashboardScopeContext.Provider value={scope}>{children}</DashboardScopeContext.Provider>;
}

export function useDashboardScope(): DashboardScope {
  return useContext(DashboardScopeContext);
}
