/**
 * 共通ヘッダー (frontend-spec §3.0)。
 *
 * ワークスペース表示・全文検索・通知ベル・アバターメニューを 1 本の bar にまとめる。
 * 基本動作は HTML の標準機能で成立させている:
 *  - 検索は素の GET フォーム (JS が落ちても検索できる)
 *  - 通知はリンク + 件数バッジ
 *  - アカウントメニューは `<details>` の標準開閉を土台にする
 * 外側クリック・Escape・別メニューとの排他的な開閉だけを、小さな client island に閉じ込める。
 */
import type { CSSProperties, ReactNode } from 'react';

import { IdBadge } from '../components/IdBadge.js';
import { Icon } from '../icons/index.js';
import { colorVar, radiusVar, spaceVar, visuallyHidden } from '../internal/style.js';
import { shellHeaderMinHeight } from './sticky-stack.js';
import { TransientDisclosure } from './TransientDisclosure.js';
import { type ShellWorkspaceOption, WorkspaceSwitcher } from './WorkspaceSwitcher.js';

export interface ShellAccountLink {
  href: string;
  label: string;
}

export interface ShellHeaderProps {
  /**
   * サイドバー開閉トグル (`SidebarToggleButton`) を差し込む場合に渡す。
   * ShellHeader 自身は開閉状態を知らず、
   * 描画済みの部品を受け取って先頭に置くだけにしてある。開閉が要らない画面
   * (サイドバー自体を持たない場面) では省略すればよい。
   */
  sidebarToggle?: ReactNode | undefined;
  /** browser 履歴操作の client island (`HistoryNavigation`) を差し込む slot。 */
  historyNavigation?: ReactNode | undefined;
  /** 表示中のワークスペース名。テナント越境の誤操作を防ぐため常に見せる。 */
  workspaceName: string;
  /** ワークスペース欄の見出し語 (「ワークスペース」など)。 */
  workspaceLabel: string;
  /**
   * 切替先の候補。省略または 2 件未満なら現在値の表示のみになり、切替 UI は出ない
   * (feat-workspace-switch-ux 受入 1)。候補の href 組み立てはアプリ側の責務。
   */
  workspaceOptions?: readonly ShellWorkspaceOption[] | undefined;
  /** 切替コントロールのアクセシブル名。`workspaceOptions` を渡すときは必須に近い。 */
  workspaceSwitchLabel?: string | undefined;
  /** `workspaceName` が表示名ではなく識別子のとき true (`WorkspaceSwitcher` と同じ扱い)。 */
  workspaceNameIsIdentifier?: boolean | undefined;
  /** 現在の画面タイトル。全 viewport で表示し、長い場合は省略する。 */
  screenTitle?: string | undefined;
  /**
   * 検索フォームの送信先。
   *
   * 3 つとも省略すると検索欄そのものを出さない。検索できる対象が無い画面
   * (ダッシュボード・設定など) で空振りする欄を置かないための逃げ道で、
   * どの画面で出すかの判断はアプリ側が 1 箇所で持つ。
   */
  searchAction?: string | undefined;
  searchLabel?: string | undefined;
  searchPlaceholder?: string | undefined;
  /** 検索欄に引き継ぐ追加のクエリ (テナント・ワークスペース識別子など)。 */
  searchHiddenFields?: Readonly<Record<string, string>> | undefined;
  notificationsHref: string;
  notificationsLabel: string;
  /** 未読件数。0 のときはバッジを出さない。 */
  unreadCount?: number | undefined;
  unreadLabel: string;
  /** サインイン中の利用者名。 */
  accountName: string;
  /**
   * `accountName` が表示名ではなく識別子 (利用者 ID) のとき true。
   * この場合はヘッダーの帯に識別子を出さず (読めない文字列が常時居座るため)、
   * アカウントメニューを開いたときだけ「利用者 ID」として `IdBadge` で見せる。
   */
  accountNameIsIdentifier?: boolean | undefined;
  /** 役割の表示 (qa-005)。権限の思い込みを防ぐためメニュー先頭に出す。 */
  accountRoleLabel?: string | undefined;
  accountMenuLabel: string;
  accountLinks: readonly ShellAccountLink[];
  signOutHref: string;
  signOutLabel: string;
}

const barStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  minHeight: shellHeaderMinHeight,
  background: colorVar('surface'),
  borderBlockEnd: `1px solid ${colorVar('border')}`,
};

const iconButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 'var(--hh-control-height)',
  minHeight: 'var(--hh-control-height)',
  padding: 0,
  color: colorVar('text'),
  background: 'transparent',
  border: 'none',
  borderRadius: radiusVar('full'),
  cursor: 'pointer',
};

const menuLinkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 'var(--hh-control-height)',
  padding: `0 ${spaceVar(3)}`,
  color: colorVar('text'),
  textDecoration: 'none',
};

export function ShellHeader(props: ShellHeaderProps): ReactNode {
  const {
    sidebarToggle,
    historyNavigation,
    workspaceName,
    workspaceLabel,
    workspaceOptions,
    workspaceSwitchLabel,
    workspaceNameIsIdentifier = false,
    screenTitle,
    searchAction,
    searchLabel,
    searchPlaceholder,
    searchHiddenFields,
    notificationsHref,
    notificationsLabel,
    unreadCount,
    unreadLabel,
    accountName,
    accountNameIsIdentifier = false,
    accountRoleLabel,
    accountMenuLabel,
    accountLinks,
    signOutHref,
    signOutLabel,
  } = props;

  const hasUnread = unreadCount !== undefined && unreadCount > 0;

  return (
    <header data-hh-shell-header="" style={barStyle}>
      {/* サイドバーが折りたたまれてもここだけは常設なので、押し戻せる場所を失わない。
          サイドバーが実在する md 以上でだけ出す (トグル自体のクラスは buildShellCss 側で持つ)。 */}
      {sidebarToggle}
      {historyNavigation}

      {/* viewport で隠さず、同じ server-first UI を全幅で使う。開閉専用の小さな
          client island だけを共有し、desktop / mobile の双方から Workspace を認識・切替できる。 */}
      <div className="hh-shell__workspace-context" style={{ flex: '0 1 12rem', minWidth: 0 }}>
        <WorkspaceSwitcher
          label={workspaceLabel}
          currentName={workspaceName}
          currentIsIdentifier={workspaceNameIsIdentifier}
          options={workspaceOptions ?? []}
          switchLabel={workspaceSwitchLabel ?? workspaceLabel}
        />
      </div>

      {screenTitle === undefined ? null : (
        <div
          data-hh-screen-title=""
          className="hh-shell__screen-title"
          style={{
            flex: '1 1 10rem',
            minWidth: 0,
            fontWeight: 'var(--hh-font-weight-bold)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {screenTitle}
        </div>
      )}

      {/* 検索対象が無い画面では欄ごと出さない。押しても何も絞り込めない欄は
          「壊れている」と読まれるため、置かない方が正確に伝わる。
          欄が無いときは残りの部品の右寄せだけを余白で引き継ぐ */}
      {searchAction === undefined ? (
        <div className="hh-shell__title-spacer" aria-hidden style={{ flex: 1 }} />
      ) : (
        <>
          <form
            action={searchAction}
            method="get"
            // 名前付きの form landmark にする。role="search" ではなく aria-label を使うのは
            // <search> 要素へ置き換えるまでの繋ぎで、支援技術からの到達性は同じ。
            aria-label={searchLabel}
            className="hh-shell__desktop-only"
            style={{ flex: '1 1 12rem', minWidth: 0, maxWidth: '480px', marginInlineStart: 'auto' }}
          >
            {Object.entries(searchHiddenFields ?? {}).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <label htmlFor="hh-shell-search" style={visuallyHidden}>
              {searchLabel}
            </label>
            {/* 検索の入口は 1 画面に 1 つだけにする。
            以前は「入力欄」と「その右の虫眼鏡ボタン」で入口が 2 つに見えていた。
            虫眼鏡は欄の中の目印 (装飾) に変え、確定は Enter に一本化する。 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spaceVar(2),
                paddingInline: spaceVar(3),
                minHeight: 'var(--hh-control-height)',
                background: colorVar('surfaceMuted'),
                border: `1px solid ${colorVar('borderStrong')}`,
                borderRadius: radiusVar('full'),
              }}
            >
              {/* label を渡さない = 既定で aria-hidden の装飾になる */}
              <Icon name="search" size={16} />
              <input
                id="hh-shell-search"
                type="search"
                name="q"
                placeholder={searchPlaceholder}
                data-hh-focusable=""
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 'calc(var(--hh-control-height) - 2px)',
                  padding: 0,
                  fontSize: 'var(--hh-font-size-md)',
                  fontFamily: 'inherit',
                  color: colorVar('text'),
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                }}
              />
            </div>
          </form>

          {/* モバイルは検索アイコンのみ。押すと検索画面へ移る (§6.2) */}
          <a
            className="hh-shell__mobile-only hh-shell__mobile-search"
            href={searchAction}
            aria-label={searchLabel}
            data-hh-focusable=""
            style={{ ...iconButtonStyle, marginInlineStart: 'auto', textDecoration: 'none' }}
          >
            <Icon name="search" />
          </a>
        </>
      )}

      <a
        className="hh-shell__notifications"
        href={notificationsHref}
        data-hh-focusable=""
        aria-label={hasUnread ? `${notificationsLabel} (${unreadCount} ${unreadLabel})` : notificationsLabel}
        style={{ ...iconButtonStyle, position: 'relative', textDecoration: 'none' }}
      >
        <Icon name="bell" />
        {hasUnread ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              insetBlockStart: '6px',
              insetInlineEnd: '4px',
              minWidth: '16px',
              padding: '0 3px',
              borderRadius: radiusVar('full'),
              background: colorVar('danger'),
              color: colorVar('onDanger'),
              fontSize: 'var(--hh-font-size-xs)',
              lineHeight: '16px',
              textAlign: 'center',
            }}
          >
            {unreadCount}
          </span>
        ) : null}
      </a>

      <TransientDisclosure className="hh-shell__account" style={{ position: 'relative' }}>
        <summary
          data-hh-focusable=""
          aria-label={accountMenuLabel}
          style={{
            ...iconButtonStyle,
            width: 'auto',
            gap: spaceVar(1),
            padding: `0 ${spaceVar(2)}`,
            listStyle: 'none',
            cursor: 'pointer',
          }}
        >
          <Icon name="user" />
          {/* 識別子しか無いときは帯に出さない。読めない文字列を常時置いても場所を取るだけで、
              「誰としてサインインしているか」はメニューを開けば分かる */}
          {accountNameIsIdentifier ? null : <span className="hh-shell__desktop-only">{accountName}</span>}
          <Icon name="chevronDown" size={16} />
        </summary>

        <div
          style={{
            position: 'absolute',
            insetInlineEnd: 0,
            insetBlockStart: 'calc(100% + var(--hh-space-1))',
            minWidth: '220px',
            padding: `${spaceVar(2)} 0`,
            background: colorVar('surface'),
            border: `1px solid ${colorVar('border')}`,
            borderRadius: radiusVar('md'),
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          }}
        >
          <div style={{ padding: `0 ${spaceVar(3)} ${spaceVar(2)}` }}>
            {accountNameIsIdentifier ? (
              <div>
                <div style={{ fontSize: 'var(--hh-font-size-sm)', color: colorVar('textMuted') }}>利用者 ID</div>
                <IdBadge value={accountName} label="利用者 ID" />
              </div>
            ) : (
              <div style={{ fontWeight: 'var(--hh-font-weight-bold)' }}>{accountName}</div>
            )}
            {accountRoleLabel === undefined ? null : (
              <div style={{ fontSize: 'var(--hh-font-size-sm)', color: colorVar('textMuted') }}>{accountRoleLabel}</div>
            )}
          </div>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {accountLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} data-hh-focusable="" style={menuLinkStyle}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a href={signOutHref} data-hh-focusable="" style={{ ...menuLinkStyle, color: colorVar('danger') }}>
                {signOutLabel}
              </a>
            </li>
          </ul>
        </div>
      </TransientDisclosure>
    </header>
  );
}
