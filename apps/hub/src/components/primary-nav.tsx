/**
 * (dashboard)・(workspace) 両 route group で共有する共通ナビゲーション。
 *
 * ログイン後の着地先 (`/sheets`、URL クエリなし) からは、これが無いとブラウザの
 * URL 直打ち以外でどの画面にも遷移できなかった (P0 シェルにナビゲーションが無かったため)。
 * 各リンクは resolveDashboardScope() 由来の tenantId/workspaceId をクエリへ引き継ぎ、
 * 遷移先の page.tsx が URL クエリを最優先する現行の解決順序と噛み合わせる。
 *
 * 見た目は @harness-hub/ui の NavList が持つ。ここで色や余白を書かないのは、
 * app 側に design token の第 2 の正本を作らないため (shared-layers §1)。
 */

import { NavList, type NavListItem } from '@harness-hub/ui';

interface PrimaryNavProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /**
   * 現在地。渡すと該当項目へ aria-current が付く。
   * server component のままにするため pathname は自動取得せず、呼び出し側が渡す
   * (usePathname を使うと全画面が client bundle に載り First Load JS 予算を圧迫する)。
   */
  readonly currentHref?: string | undefined;
}

function scopedHref(path: string, tenantId: string, workspaceId: string, includeWorkspace: boolean): string {
  const params = new URLSearchParams();
  if (tenantId !== '') params.set('tenant', tenantId);
  if (includeWorkspace && workspaceId !== '') params.set('workspace', workspaceId);
  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
}

export function PrimaryNav({ tenantId, workspaceId, currentHref }: PrimaryNavProps) {
  const items: readonly NavListItem[] = [
    { href: scopedHref('/sheets', tenantId, workspaceId, true), label: 'ヒアリングシート' },
    { href: scopedHref('/docs', tenantId, workspaceId, true), label: 'ドキュメント' },
    { href: scopedHref('/feedback', tenantId, workspaceId, true), label: '改善要望' },
    { href: scopedHref('/catalog', tenantId, workspaceId, true), label: '業務ツール' },
    { href: scopedHref('/users', tenantId, workspaceId, false), label: 'ユーザー管理' },
    { href: scopedHref('/settings/account', tenantId, workspaceId, false), label: 'アカウント設定' },
    { href: scopedHref('/settings/auth', tenantId, workspaceId, false), label: '認証設定' },
    { href: scopedHref('/settings/coefficients', tenantId, workspaceId, false), label: '見積係数設定' },
  ];

  return <NavList items={items} label="主要ナビゲーション" currentHref={currentHref} />;
}
