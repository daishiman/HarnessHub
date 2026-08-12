'use client';

/**
 * layout.tsx (server component) が cookie から解決した既定 scope を、
 * client component な page.tsx (docs/[id] など) へ配る。
 * DOCS-SEC7-101/102 により docs 詳細・編集ページは server wrapper + client companion への分割を採れないため、
 * layout 側で解決した値を Context 経由で受け取る。
 */

import { createContext, type ReactNode, useContext } from 'react';
import type { SessionRole } from '@harness-hub/schemas';
import type { DashboardScope } from '../../lib/routing/dashboard-scope-helpers.js';

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

/**
 * layout.tsx が resolveShellIdentity() で解決した role を、DashboardScope と同じ理由で
 * client component な docs/[id]・docs/[id]/edit へ配る (docs.write_tenant / docs.write_common
 * の導線判定に使う。API 側の 403 が正本であることは変わらないが、権限が無いのに編集画面が
 * そのまま出て失敗理由が分からない、という体験を避けるため)。
 */
const SessionRoleContext = createContext<SessionRole | null>(null);

export function SessionRoleProvider({
  role,
  children,
}: {
  readonly role: SessionRole | null;
  readonly children: ReactNode;
}) {
  return <SessionRoleContext.Provider value={role}>{children}</SessionRoleContext.Provider>;
}

export function useSessionRole(): SessionRole | null {
  return useContext(SessionRoleContext);
}
