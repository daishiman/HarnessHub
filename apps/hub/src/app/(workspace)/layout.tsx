import type { ReactNode } from 'react';
import { HubShell } from '../../components/shell/hub-shell.js';
import { resolveShellProps } from '../../components/shell/resolve-shell-props.js';

/**
 * 画面骨格は HubShell が唯一の実装を持つ ((dashboard) 側と同じ骨格にするため)。
 */
export default async function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  const shell = await resolveShellProps();
  return (
    <HubShell
      scope={shell.scope}
      accountName={shell.accountName}
      accountNameIsIdentifier={shell.accountNameIsIdentifier}
      accountRole={shell.role}
      workspaceIds={shell.workspaceIds}
      workspaceNames={shell.workspaceNames}
      currentHref={shell.currentHref}
    >
      {children}
    </HubShell>
  );
}
