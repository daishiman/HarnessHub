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
      <PrimaryNav tenantId={scope.tenantId ?? ''} workspaceId={scope.workspaceId ?? ''} />
      {children}
    </DashboardScopeProvider>
  );
}
