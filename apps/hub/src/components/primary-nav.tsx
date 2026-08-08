/**
 * (dashboard)・(workspace) 両 route group で共有する共通ナビゲーション。
 *
 * ログイン後の着地先 (`/sheets`、URL クエリなし) からは、これが無いとブラウザの
 * URL 直打ち以外でどの画面にも遷移できなかった (P0 シェルにナビゲーションが無かったため)。
 * 各リンクは resolveDashboardScope() 由来の tenantId/workspaceId をクエリへ引き継ぎ、
 * 遷移先の page.tsx が URL クエリを最優先する現行の解決順序と噛み合わせる。
 */

interface PrimaryNavProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

interface NavItem {
  readonly href: string;
  readonly label: string;
}

function scopedHref(path: string, tenantId: string, workspaceId: string, includeWorkspace: boolean): string {
  const params = new URLSearchParams();
  if (tenantId !== '') params.set('tenant', tenantId);
  if (includeWorkspace && workspaceId !== '') params.set('workspace', workspaceId);
  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
}

export function PrimaryNav({ tenantId, workspaceId }: PrimaryNavProps) {
  const items: readonly NavItem[] = [
    { href: scopedHref('/sheets', tenantId, workspaceId, true), label: 'ヒアリングシート' },
    { href: scopedHref('/docs', tenantId, workspaceId, true), label: 'ドキュメント' },
    { href: scopedHref('/feedback', tenantId, workspaceId, true), label: '改善要望' },
    { href: scopedHref('/catalog', tenantId, workspaceId, true), label: '業務ツール' },
    { href: scopedHref('/users', tenantId, workspaceId, false), label: 'ユーザー管理' },
    { href: scopedHref('/settings/account', tenantId, workspaceId, false), label: 'アカウント設定' },
    { href: scopedHref('/settings/auth', tenantId, workspaceId, false), label: '認証設定' },
    { href: scopedHref('/settings/coefficients', tenantId, workspaceId, false), label: '見積係数設定' },
  ];

  return (
    <nav aria-label="主要ナビゲーション">
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
