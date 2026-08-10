/**
 * 共通シェルに並べる画面の一覧 (frontend-spec §3.0)。
 *
 * spec のサイドバーは 9 項目だが、ダッシュボード (S09) / パイプライン (S13) /
 * トラッキング (S16) はまだ route が存在しない。無い画面へのリンクを出すと
 * 「押したら 404」という一番たちの悪い体験になるので、**実在する route だけ**を並べる。
 * 各画面の epic が着地した時点でここへ 1 行足せば、シェル側の変更は要らない。
 *
 * リンクは resolveDashboardScope() 由来の tenant/workspace をクエリへ引き継ぐ。
 * 遷移先の page.tsx が URL クエリを最優先する解決順序と噛み合わせるため。
 */
import type { SessionRole } from '@harness-hub/schemas';
import type { ShellNavItem } from '@harness-hub/ui';

import { sessionActionVisible } from '../../lib/authz/index.js';

export interface ShellScope {
  readonly tenantId: string;
  readonly workspaceId: string;
}

/** tenant / workspace をクエリへ載せる。空文字は載せない (空の scope で API が弾かれるのを避ける)。 */
export function scopedHref(path: string, scope: ShellScope, includeWorkspace: boolean): string {
  const params = new URLSearchParams();
  if (scope.tenantId !== '') params.set('tenant', scope.tenantId);
  if (includeWorkspace && scope.workspaceId !== '') params.set('workspace', scope.workspaceId);
  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
}

/**
 * サイドバーとボトムタブが共有する主要導線。
 * 並び順は利用頻度順 (ヒアリング → ツール → ドキュメント → 改善要望)。
 */
export function primaryNavItems(scope: ShellScope): readonly ShellNavItem[] {
  return [
    {
      href: scopedHref('/sheets', scope, true),
      label: 'ヒアリングシート',
      icon: 'sheet',
    },
    {
      href: scopedHref('/catalog', scope, true),
      label: '業務ツール',
      icon: 'harness',
    },
    {
      href: scopedHref('/docs', scope, true),
      label: 'ドキュメント',
      icon: 'docs',
    },
    {
      href: scopedHref('/feedback', scope, true),
      label: '改善要望',
      icon: 'feedback',
    },
  ];
}

/**
 * 管理系の導線。API 側の認可を正本にしつつ、利用できない導線は deny-by-default
 * (権限を確認できないときは隠す) で DOM にも出さない。
 */
export function secondaryNavItems(scope: ShellScope, role: SessionRole | null): readonly ShellNavItem[] {
  const usersVisible = sessionActionVisible(role, 'users.read');
  const authSettingsVisible = sessionActionVisible(role, 'idp.connection_read');
  const coefficientsVisible = sessionActionVisible(role, 'coefficients.read');

  return [
    ...(usersVisible
      ? [
          {
            href: scopedHref('/users', scope, false),
            label: 'ユーザー管理',
            icon: 'users' as const,
          },
        ]
      : []),
    {
      href: scopedHref('/settings/account', scope, false),
      label: 'アカウント設定',
      icon: 'settings',
    },
    ...(authSettingsVisible
      ? [
          {
            href: scopedHref('/settings/auth', scope, false),
            label: '認証設定',
            icon: 'settings' as const,
          },
        ]
      : []),
    ...(coefficientsVisible
      ? [
          {
            href: scopedHref('/settings/coefficients', scope, false),
            label: '見積係数設定',
            icon: 'settings' as const,
          },
        ]
      : []),
  ];
}

/** サイドバーは主要 + 管理をひと続きに出す。 */
export function sidebarNavItems(scope: ShellScope, role: SessionRole | null): readonly ShellNavItem[] {
  return [...primaryNavItems(scope), ...secondaryNavItems(scope, role)];
}

/** アバターメニューに並べるリンク (§3.0: アカウント設定 → 規約 → サインアウト)。 */
export function accountMenuLinks(
  scope: ShellScope,
  role: SessionRole | null,
): readonly { href: string; label: string }[] {
  return [
    {
      href: scopedHref('/settings/account', scope, false),
      label: 'アカウント設定',
    },
    ...(sessionActionVisible(role, 'idp.connection_read')
      ? [
          {
            href: scopedHref('/settings/auth', scope, false),
            label: '認証設定',
          },
        ]
      : []),
    { href: '/legal', label: '利用規約・プライバシーポリシー' },
  ];
}

/** フッターの法的情報。 */
export const footerLinks = [{ href: '/legal', label: '利用規約・プライバシーポリシー' }] as const;

/**
 * NextAuth が提供するサインアウト route。
 * 画面側で session cookie を消す独自実装を持たないため、ここを唯一の出口にする。
 */
export const SIGN_OUT_HREF = '/api/auth/signout';

/**
 * 通知ベルの遷移先。
 * 通知一覧画面 (§6.2 のボトムタブ「通知」) はまだ無いので、
 * 実在するアカウント設定の通知セクションへ繋ぐ。専用画面ができたら差し替える。
 */
export function notificationsHref(scope: ShellScope): string {
  return `${scopedHref('/settings/account', scope, false)}#notification-settings-heading`;
}

/**
 * ヘッダー検索の送信先。
 * 横断検索基盤はまだ無いため、いま検索して意味がある唯一の対象 (ヒアリングシート) へ
 * `q` を渡す。シート一覧側がその `q` で絞り込む。
 */
export function searchAction(scope: ShellScope): string {
  return scopedHref('/sheets', scope, true).split('?')[0] as string;
}

/** 検索フォームが引き継ぐ scope クエリ。 */
export function searchHiddenFields(scope: ShellScope): Record<string, string> {
  const fields: Record<string, string> = {};
  if (scope.tenantId !== '') fields.tenant = scope.tenantId;
  if (scope.workspaceId !== '') fields.workspace = scope.workspaceId;
  return fields;
}
