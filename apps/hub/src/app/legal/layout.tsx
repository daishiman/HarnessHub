/**
 * /legal 専用 layout — session の有無で表示シェル (HubShell / PublicShell) を出し分ける。
 *
 * shell 選択をここに置くのは page.tsx から分けるためだけではない。Next.js は client 部品 (アイコン・
 * 検索・通知などを含む HubShell) が持つ CSS を、それを import したモジュールの manifest entry へ
 * 直接紐づける。page.tsx 自身が HubShell/PublicShell を import すると、その CSS が `/legal/page` の
 * entry に付き、G13 client JS 予算ゲート (route ごとの First Load JS 実測) へそのまま加算されてしまう
 * (実測: page.tsx で直接 import した状態で 171 KiB、予算 120 KiB を超過)。
 * `(dashboard)/layout.tsx` は同じ HubShell を layout 側の entry に紐づけることで、配下の全 route の
 * page 実測からこの重さを外している。/legal は route group を使わない単独ページだが、
 * layout.tsx を分けるだけで同じ効果を再現できる (Next.js の layout は route group が無くても
 * 直下の page.tsx へ通常どおり適用され、URL セグメントも増えない)。
 *
 * `resolveShellProps()` は未認証でも安全な既定値 (空 scope / ANONYMOUS identity) を返す設計
 * (`resolve-shell-props.ts`) なので、ここで直接呼んでも /legal の公開性は壊れない。
 */
import type { ReactNode } from 'react';

import { HubShell } from '../../components/shell/hub-shell.js';
import { PublicShell } from '../../components/shell/public-shell.js';
import { resolveShellProps } from '../../components/shell/resolve-shell-props.js';

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const shell = await resolveShellProps();
  const isAuthenticated = shell.scope.tenantId !== '' && shell.scope.workspaceId !== '';

  if (isAuthenticated) {
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

  return <PublicShell>{children}</PublicShell>;
}
