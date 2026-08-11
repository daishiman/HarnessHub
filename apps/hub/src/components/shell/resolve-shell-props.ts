/**
 * layout から HubShell へ渡す値を 1 か所で組み立てる。
 *
 * (dashboard) と (workspace) の 2 つの layout が同じ組み立てを持つと、
 * 片方だけ直して表示がずれる事故が起きるため関数へ寄せている。
 */
import type { SessionRole } from '@harness-hub/schemas';
import { headers } from 'next/headers';

import { resolveDashboardScope } from '../../lib/routing/dashboard-scope.js';
import { PATHNAME_HEADER } from '../../lib/routing/pathname-header.js';
import { resolveShellIdentity } from '../../lib/routing/shell-identity.js';
import type { ShellScope } from './nav-items.js';

export interface ResolvedShellProps {
  readonly scope: ShellScope;
  readonly accountName: string | null;
  /**
   * `accountName` が識別子 (人が読めない ULID) かどうか。
   * 表示名が取れたときは false になり、ヘッダーは氏名をそのまま名前として出す。
   */
  readonly accountNameIsIdentifier: boolean;
  readonly role: SessionRole | null;
  /** 所属 Workspace 一覧。シェルの切替 UI を出すかの判定に使う。 */
  readonly workspaceIds: readonly string[];
  /** 所属 Workspace の表示名 (識別子 → 名前)。名前が引けないものは欠ける。 */
  readonly workspaceNames: Readonly<Record<string, string>>;
  readonly currentHref: string | undefined;
}

export async function resolveShellProps(): Promise<ResolvedShellProps> {
  // scope と identity は互いに独立なので同時に解決する (どちらも cache 済みなので二重検証は起きない)
  const [scope, identity, headerList] = await Promise.all([resolveDashboardScope(), resolveShellIdentity(), headers()]);

  const pathname = headerList.get(PATHNAME_HEADER);

  return {
    scope: {
      tenantId: scope.tenantId ?? '',
      workspaceId: scope.workspaceId ?? '',
    },
    // 表示名があればそれを、無ければ識別子を出す。どちらを出したかは見せ方が変わるので
    // 呼び出し側へ伝える (識別子を氏名の体裁で置くと「読めない名前」に見える)。
    accountName: identity.displayName ?? identity.subject,
    accountNameIsIdentifier: identity.displayName === null,
    role: identity.role,
    workspaceIds: identity.workspaceIds,
    workspaceNames: identity.workspaceNames,
    // header が無い経路 (テストや直接描画) では現在地の強調を諦める。
    // 誤った現在地を出すより「どこも現在地でない」ほうが害が小さい。
    currentHref: pathname === null || pathname === '' ? undefined : pathname,
  };
}
