/**
 * (dashboard) / (workspace) 配下の画面を包む共通シェル (frontend-spec §3.0)。
 *
 * 中身は @harness-hub/ui の部品を並べるだけで、見た目の決定は一切ここに置かない。
 * このファイルが持つのは「hub にとっての具体」= どの route を並べるか・誰がサインインしているか。
 *
 * server component のままにしてあるので、シェル自体は client JS を増やさない。
 * サイドバーの開閉状態だけは `SidebarCollapseProvider` (client) に委ねている
 * (HarnessHub 配色統一・サイドバートグル対応)。
 */
import type { SessionRole } from '@harness-hub/schemas';
import {
  buildShellCss,
  isCurrentNav,
  MobileTabBar,
  ShellFooter,
  ShellHeader,
  ShellSidebar,
  SidebarCollapseProvider,
  SidebarToggleButton,
} from '@harness-hub/ui';
import type { ReactNode } from 'react';

import { notoSansJp } from '../../app/fonts.js';
import {
  accountMenuLinks,
  footerLinks,
  headerSearch,
  notificationsHref,
  primaryNavItems,
  type ShellScope,
  SIGN_OUT_HREF,
  searchHiddenFields,
  secondaryNavItems,
  sidebarNavGroups,
} from './nav-items.js';
import { workspaceSwitcherOptions } from './workspace-switcher-items.js';

/**
 * 本文ランドマークの id。スキップリンクの飛び先と同じ値を使う。
 * @harness-hub/ui の HubShell も同じ `main` を使っており、公開画面と業務画面で
 * スキップリンクの飛び先が変わらないようにしている。
 */
const MAIN_ANCHOR_ID = 'main';

/** 役割 token の表示名。API が返す値をそのまま画面に出さないための対応表。 */
const roleLabels: Readonly<Record<SessionRole, string>> = {
  'provider-admin': 'プロバイダー管理者',
  'workspace-admin': 'ワークスペース管理者',
  member: 'メンバー',
};

export interface HubShellProps {
  readonly scope: ShellScope;
  /** サインイン中の利用者の表示名。未確定ならヘッダーは「ゲスト」を出す。 */
  readonly accountName: string | null;
  /**
   * `accountName` が識別子かどうか。省略時は識別子として扱う (fail-closed)。
   * 人が読める氏名・メールアドレスが取れたときだけ false を渡す。
   */
  readonly accountNameIsIdentifier?: boolean | undefined;
  /** 役割 token。ARIA の `role` 属性と紛れないよう accountRole と呼ぶ。 */
  readonly accountRole: SessionRole | null;
  /**
   * 所属 Workspace の識別子一覧。2 件以上のときだけヘッダーに切替 UI が出る (受入 1・3)。
   * 省略時は切替 UI 無し = 現在値の表示のみ (fail-closed)。
   */
  readonly workspaceIds?: readonly string[] | undefined;
  /**
   * 所属 Workspace の表示名 (識別子 → 名前)。**表示専用**。
   * 省略時・キーが無いときは識別子を識別子として出す (fail-closed)。
   */
  readonly workspaceNames?: Readonly<Record<string, string>> | undefined;
  /** 現在の URL パス。サイドバー・タブの現在地表示に使う。 */
  readonly currentHref?: string | undefined;
  /** モバイルのヘッダーに出す画面名 (§6.2)。 */
  readonly screenTitle?: string | undefined;
  readonly children: ReactNode;
}

export function HubShell({
  scope,
  accountName,
  accountNameIsIdentifier,
  accountRole,
  workspaceIds,
  workspaceNames,
  currentHref,
  screenTitle,
  children,
}: HubShellProps): ReactNode {
  const primary = primaryNavItems(scope);
  const names = workspaceNames ?? {};
  const switcherOptions = workspaceSwitcherOptions(
    workspaceIds ?? [],
    scope.workspaceId === '' ? null : scope.workspaceId,
    currentHref,
    names,
  );
  // 現在の Workspace 名。名前が引けなければ識別子をそのまま出し、識別子の見せ方へ落とす。
  const currentWorkspaceName = scope.workspaceId === '' ? undefined : names[scope.workspaceId];
  const secondary = secondaryNavItems(scope, accountRole);
  // layout は route ごとの画面名を持たないため、未指定時は現在地に一致する
  // top-level 導線の名前を使う。詳細画面でも「どの領域にいるか」がモバイルで失われない。
  const resolvedScreenTitle =
    screenTitle ?? [...primary, ...secondary].find((item) => isCurrentNav(item, currentHref))?.label;
  // 検索欄の有無・行き先・文言は 1 回の判定でまとめて決まる (nav-items の headerSearch)。
  // 対象を持たない画面では null になり、ヘッダーから検索欄ごと消える。
  const search = headerSearch(scope, currentHref);

  return (
    <>
      {/* レスポンシブ規則は 1 枚の CSS に閉じる。React 19 は body 内の style も head へ巻き上げる */}
      <style>{buildShellCss()}</style>
      {/* 本文フォントの実体を token の族名へ差し込む。token 定義側 (packages/ui) は
          「Noto Sans JP を使う」とだけ言っており、どこから読むかはアプリの責務 */}
      <style>{`.hh-shell { --hh-font-family: var(--font-noto-sans-jp), system-ui, -apple-system, 'Segoe UI', sans-serif; font-family: var(--hh-font-family); }`}</style>

      <SidebarCollapseProvider>
        <div className={`hh-shell ${notoSansJp.variable}`}>
          {/* ブロックスキップ (WCAG 2.4.1)。見た目は base 層が focus 時だけ出す。
              position:absolute なのでグリッドの列を消費しない */}
          <a data-hh-skip-link="" href={`#${MAIN_ANCHOR_ID}`}>
            本文へスキップ
          </a>

          <ShellSidebar
            groups={sidebarNavGroups(scope, accountRole)}
            currentHref={currentHref}
            label="主要ナビゲーション"
            brand={<strong style={{ fontSize: 'var(--hh-font-size-md)' }}>Harness Hub</strong>}
          />

          <div className="hh-shell__body">
            <ShellHeader
              sidebarToggle={
                <SidebarToggleButton expandedLabel="サイドバーを閉じる" collapsedLabel="サイドバーを開く" />
              }
              workspaceName={scope.workspaceId === '' ? '未選択' : (currentWorkspaceName ?? scope.workspaceId)}
              workspaceLabel="ワークスペース"
              // 名前が引けたときだけ名前の体裁で出す。引けないまま ULID を名前の位置へ置くと
              // 「読めない名前」に見えるため、識別子として扱い IdBadge へ落とす。
              // 「未選択」は識別子ではないので false。
              workspaceNameIsIdentifier={scope.workspaceId !== '' && currentWorkspaceName === undefined}
              workspaceOptions={switcherOptions}
              workspaceSwitchLabel="ワークスペースを切り替える"
              screenTitle={resolvedScreenTitle}
              searchAction={search?.action}
              searchLabel={search?.label}
              searchPlaceholder={search?.placeholder}
              searchHiddenFields={searchHiddenFields(scope)}
              notificationsHref={notificationsHref(scope)}
              notificationsLabel="通知設定"
              unreadLabel="未読"
              accountName={accountName ?? 'ゲスト'}
              // 表示名 (氏名・メールアドレス) が取れたときだけ名前の体裁で出す。
              // 取れず session の sub (ULID) を出しているときは識別子の見せ方へ落とす。
              // 「ゲスト」は識別子ではないので、未サインイン時も false。
              accountNameIsIdentifier={accountName !== null && (accountNameIsIdentifier ?? true)}
              accountRoleLabel={accountRole === null ? undefined : roleLabels[accountRole]}
              accountMenuLabel="アカウントメニュー"
              accountLinks={accountMenuLinks(scope, accountRole)}
              signOutHref={SIGN_OUT_HREF}
              signOutLabel="サインアウト"
            />

            {/*
              本文ランドマーク。業務画面ではこのシェルが `<main>` の唯一の実装を持つ。
              root layout 側は @harness-hub/ui の HubShell を外してあり (公開画面だけが
              そちらを使う)、同一ページに main が 2 つ現れない構成にしてある。
            */}
            {/* scope が変わったら本文の subtree を作り直す。時間的な旧 scope 非表示は
                `/signin/workspace` の server intermediate response が担い、key は再利用防止の第二防壁。 */}
            <main className="hh-shell__main" id={MAIN_ANCHOR_ID} key={`${scope.tenantId} ${scope.workspaceId}`}>
              {children}
            </main>

            <ShellFooter label="フッター情報" links={footerLinks} />
          </div>

          <MobileTabBar
            items={primary}
            moreItems={secondary}
            currentHref={currentHref}
            label="画面切替"
            moreLabel="その他"
          />
        </div>
      </SidebarCollapseProvider>
    </>
  );
}
