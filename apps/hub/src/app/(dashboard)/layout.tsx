import type { ReactNode } from 'react';
import { HubShell } from '../../components/shell/hub-shell.js';
import { resolveShellProps } from '../../components/shell/resolve-shell-props.js';
import { resolveDashboardScope } from '../../lib/routing/dashboard-scope.js';
import { DashboardScopeProvider } from './dashboard-scope-context.js';

/**
 * ここで解決した scope を Context 経由で読むのは client component 2 ファイル
 * (docs/[id], docs/[id]/edit) のみ。server component な page.tsx 群は Context を
 * 消費できないため、各自 resolveDashboardScope() を直接呼ぶ設計になっている。
 * resolveDashboardScope() 自体は React cache() でリクエスト単位にメモ化されているため、
 * 同一リクエスト内で複数回呼んでも session cookie の検証は 1 回しか走らない。
 *
 * 画面骨格 (skip link / header / main landmark / nav / footer) は HubShell が唯一の実装を持つ
 * ((workspace) 側と同じ骨格にするため)。packages/ui の HubShell + SidebarLayout は
 * サイドバーもフッタも持たない公開画面向けの骨格なので、業務画面ではこちらを使う。
 */
export default async function DashboardLayout({ children }: { readonly children: ReactNode }) {
  const [scope, shell] = await Promise.all([resolveDashboardScope(), resolveShellProps()]);
  return (
    <DashboardScopeProvider scope={scope}>
      <HubShell
        scope={shell.scope}
        accountName={shell.accountName}
        accountRole={shell.role}
        workspaceIds={shell.workspaceIds}
        currentHref={shell.currentHref}
      >
        {children}
      </HubShell>
    </DashboardScopeProvider>
  );
}
