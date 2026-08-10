/**
 * 共通ヘッダー (frontend-spec §3.0)。
 *
 * ワークスペース表示・全文検索・通知ベル・アバターメニューを 1 本の bar にまとめる。
 * 4 つとも client JS 無しで成立させている:
 *  - 検索は素の GET フォーム (JS が落ちても検索できる)
 *  - 通知はリンク + 件数バッジ
 *  - アカウントメニューは `<details>` の開閉 (キーボード操作はブラウザ実装に乗る)
 * これにより全画面に載るヘッダーが First Load JS 予算を食わない。
 */
import type { CSSProperties, ReactNode } from 'react';

import { Icon } from '../icons/index.js';
import { colorVar, radiusVar, spaceVar, visuallyHidden } from '../internal/style.js';

export interface ShellAccountLink {
  href: string;
  label: string;
}

export interface ShellHeaderProps {
  /** 表示中のワークスペース名。テナント越境の誤操作を防ぐため常に見せる。 */
  workspaceName: string;
  /** ワークスペース欄の見出し語 (「ワークスペース」など)。 */
  workspaceLabel: string;
  /** モバイルで表示する画面タイトル (§6.2)。 */
  screenTitle?: string | undefined;
  /** 検索フォームの送信先。 */
  searchAction: string;
  searchLabel: string;
  searchPlaceholder: string;
  /** 検索欄に引き継ぐ追加のクエリ (テナント・ワークスペース識別子など)。 */
  searchHiddenFields?: Readonly<Record<string, string>> | undefined;
  notificationsHref: string;
  notificationsLabel: string;
  /** 未読件数。0 のときはバッジを出さない。 */
  unreadCount?: number | undefined;
  unreadLabel: string;
  /** サインイン中の利用者名。 */
  accountName: string;
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
  display: 'flex',
  alignItems: 'center',
  gap: spaceVar(3),
  minHeight: '56px',
  padding: `0 ${spaceVar(4)}`,
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
    workspaceName,
    workspaceLabel,
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
    accountRoleLabel,
    accountMenuLabel,
    accountLinks,
    signOutHref,
    signOutLabel,
  } = props;

  const hasUnread = unreadCount !== undefined && unreadCount > 0;

  return (
    <header style={barStyle}>
      {/* デスクトップはワークスペース名、モバイルは画面タイトル (§6.2) */}
      <div className="hh-shell__desktop-only" style={{ minWidth: 0 }}>
        <span style={{ fontSize: 'var(--hh-font-size-xs)', color: colorVar('textMuted') }}>{workspaceLabel}</span>
        <div
          style={{
            fontWeight: 'var(--hh-font-weight-bold)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {workspaceName}
        </div>
      </div>

      {screenTitle === undefined ? null : (
        <div
          className="hh-shell__mobile-only"
          style={{
            flex: 1,
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

      <form
        action={searchAction}
        method="get"
        // 名前付きの form landmark にする。role="search" ではなく aria-label を使うのは
        // <search> 要素へ置き換えるまでの繋ぎで、支援技術からの到達性は同じ。
        aria-label={searchLabel}
        className="hh-shell__desktop-only"
        style={{ flex: 1, maxWidth: '480px', marginInlineStart: 'auto' }}
      >
        {Object.entries(searchHiddenFields ?? {}).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <label htmlFor="hh-shell-search" style={visuallyHidden}>
          {searchLabel}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: spaceVar(2) }}>
          <input
            id="hh-shell-search"
            type="search"
            name="q"
            placeholder={searchPlaceholder}
            data-hh-focusable=""
            style={{
              flex: 1,
              minHeight: 'var(--hh-control-height)',
              padding: `0 ${spaceVar(3)}`,
              fontSize: 'var(--hh-font-size-md)',
              fontFamily: 'inherit',
              color: colorVar('text'),
              background: colorVar('surfaceMuted'),
              border: `1px solid ${colorVar('borderStrong')}`,
              borderRadius: radiusVar('full'),
            }}
          />
          <button type="submit" aria-label={searchLabel} data-hh-focusable="" style={iconButtonStyle}>
            <Icon name="search" />
          </button>
        </div>
      </form>

      {/* モバイルは検索アイコンのみ。押すと検索画面へ移る (§6.2) */}
      <a
        className="hh-shell__mobile-only"
        href={searchAction}
        aria-label={searchLabel}
        data-hh-focusable=""
        style={{ ...iconButtonStyle, marginInlineStart: 'auto', textDecoration: 'none' }}
      >
        <Icon name="search" />
      </a>

      <a
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

      {/* details/summary の開閉に任せると、Enter/Space・Esc・外側クリックの面倒を負わずに済む */}
      <details style={{ position: 'relative' }}>
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
          <span className="hh-shell__desktop-only">{accountName}</span>
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
            <div style={{ fontWeight: 'var(--hh-font-weight-bold)' }}>{accountName}</div>
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
      </details>
    </header>
  );
}
