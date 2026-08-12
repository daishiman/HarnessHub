/**
 * 共通シェルに並べる画面の一覧 (frontend-spec §3.0)。
 *
 * 無い画面へのリンクを出すと「押したら 404」という一番たちの悪い体験になるので、
 * **実在する route だけ**を並べる。各画面の epic が着地した時点でここへ 1 行足せば、
 * シェル側の変更は要らない。
 * ダッシュボード (S09) / パイプライン (S13) / トラッキング (S16) は
 * feat-metrics-tracking と feat-build-pipeline-board の着地で route が実在したため追加した。
 *
 * リンクは resolveDashboardScope() 由来の tenant/workspace をクエリへ引き継ぐ。
 * 遷移先の page.tsx が URL クエリを最優先する解決順序と噛み合わせるため。
 */
import type { SessionRole } from '@harness-hub/schemas';
import type { ShellNavGroup, ShellNavItem } from '@harness-hub/ui';

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
 * 分析系の導線 (S09 ダッシュボード / S13 パイプライン / S16 使用状況・削減効果)。
 *
 * `primaryNavItems` へ混ぜないのは、あちらがモバイルのボトムタブ 4 枠と同一集合だから (§6.2)。
 * 5 枠目を足すとタブが溢れるので、サイドバーにだけ出す層をここに分ける。
 */
export function insightNavItems(scope: ShellScope): readonly ShellNavItem[] {
  return [
    {
      href: scopedHref('/metrics', scope, true),
      label: 'ダッシュボード',
      icon: 'dashboard',
    },
    {
      href: scopedHref('/builds', scope, true),
      label: 'パイプライン',
      icon: 'pipeline',
    },
    {
      href: scopedHref('/metrics/usage', scope, true),
      label: '使用状況・削減効果',
      icon: 'tracking',
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
  const notionIntegrationVisible = sessionActionVisible(role, 'notion-integration.read');

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
    ...(notionIntegrationVisible
      ? [
          {
            // Notion 連携は tenant 全体ではなく workspace ごとの設定。
            href: scopedHref('/settings/notion', scope, true),
            label: 'Notion連携',
            icon: 'settings' as const,
          },
        ]
      : []),
  ];
}

/** サイドバーは主要 + 分析 + 管理をひと続きに出す。ボトムタブや検査で「全項目」が要るときに使う。 */
export function sidebarNavItems(scope: ShellScope, role: SessionRole | null): readonly ShellNavItem[] {
  return sidebarNavGroups(scope, role).flatMap((group) => group.items);
}

/**
 * サイドバーの分類。
 *
 * 11 項目を区切りなく縦に並べると、探している画面が「日々使うもの」なのか
 * 「たまに開く設定」なのかが読み取れず、上から順に全部読むことになる。
 * 分類名は機能名ではなく利用者のふるまいで付けている
 * (業務 = 日々の仕事を進める / 分析 = 結果を振り返る / 管理 = 環境を整える)。
 *
 * 権限で項目が 0 件になる分類 (管理) は、見出しと区切り線ごと落とす。
 * 空の分類名だけが残ると「ここに何かあるはずなのに見えない」と読めてしまう。
 */
export function sidebarNavGroups(scope: ShellScope, role: SessionRole | null): readonly ShellNavGroup[] {
  return [
    { title: '業務', items: primaryNavItems(scope) },
    { title: '分析', items: insightNavItems(scope) },
    { title: '管理', items: secondaryNavItems(scope, role) },
  ].filter((group) => group.items.length > 0);
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

/** ヘッダー検索の設定。検索できる対象が無い画面では `null` を返す。 */
export interface HeaderSearch {
  readonly action: string;
  readonly label: string;
  readonly placeholder: string;
}

/**
 * 画面ごとの検索対象。
 *
 * 横断検索の基盤は無いので、ヘッダーの検索欄は「いま見ている領域を絞り込む」ものとして扱う。
 * ヒアリングシートを見ているならシートを、業務ツールを見ているならツールを探す。
 *
 * 載せる条件は 1 つだけ = **一覧側が `q` での絞り込みに実際に対応していること**。
 * 押しても何も起きない欄は、無い欄より悪い (壊れていると読まれる)。
 *
 * 入力欄の例示 (placeholder) は、その一覧が実際に見ている列と一致させる。
 * 「ツール名で探す」と書いてあるのに説明文まで当たる、あるいはその逆になると、
 * 出てきた結果の理由が画面から読み取れなくなる。各領域の検索対象は契約 schema
 * (`documentListQuerySchema` などの `q` の JSDoc) が正本。
 *
 * 行き先・見出し語・入力欄の例示は必ずこの 1 つの表から採る。3 つを別々に決めると、
 * 「シートを検索」と言いながらツール一覧へ飛ぶ、といったズレが後から必ず生まれる。
 */
const searchTargets = [
  {
    pathPrefix: '/sheets',
    action: '/sheets',
    label: 'ヒアリングシートを検索',
    placeholder: 'HS コード・業務名で探す',
    withWorkspace: true,
  },
  {
    pathPrefix: '/catalog',
    action: '/catalog',
    label: '業務ツールを検索',
    placeholder: 'ツール名で探す',
    withWorkspace: true,
  },
  {
    pathPrefix: '/docs',
    action: '/docs',
    label: 'ドキュメントを検索',
    placeholder: 'タイトルで探す',
    withWorkspace: true,
  },
  {
    pathPrefix: '/feedback',
    action: '/feedback',
    label: '改善要望を検索',
    placeholder: '受付番号・本文で探す',
    withWorkspace: true,
  },
  {
    // 利用者はテナント単位の一覧で、workspace には属さない (`userListQuerySchema` に workspace が無い)。
    // ここだけ withWorkspace を false にするのは、付けても意味が無い絞り込みを URL に残さないため。
    pathPrefix: '/users',
    action: '/users',
    label: '利用者を検索',
    placeholder: '氏名・部門で探す',
    withWorkspace: false,
  },
] as const;

/**
 * いま見ている画面に合った検索欄の設定を返す。対象が無ければ `null`。
 *
 * ダッシュボード・パイプライン・使用状況・各種設定は「探す」対象を持たない画面なので、
 * ここで `null` になり検索欄自体が消える。
 */
export function headerSearch(scope: ShellScope, currentHref: string | undefined): HeaderSearch | null {
  if (currentHref === undefined) return null;
  const path = currentHref.split('?')[0] ?? '';
  const target = searchTargets.find(
    (candidate) => path === candidate.pathPrefix || path.startsWith(`${candidate.pathPrefix}/`),
  );
  if (target === undefined) return null;
  return {
    action: scopedHref(target.action, scope, target.withWorkspace).split('?')[0] as string,
    label: target.label,
    placeholder: target.placeholder,
  };
}

/** 検索フォームが引き継ぐ scope クエリ。 */
export function searchHiddenFields(scope: ShellScope): Record<string, string> {
  const fields: Record<string, string> = {};
  if (scope.tenantId !== '') fields.tenant = scope.tenantId;
  if (scope.workspaceId !== '') fields.workspace = scope.workspaceId;
  return fields;
}
