/**
 * ヘッダー常設の Workspace 切替 UI (frontend-spec §3.0 / feat-workspace-switch-ux 受入 1・3)。
 *
 * 開閉は `<details>`、切替は素の `<a>` を土台にする。外側クリック・Escape・別メニューとの
 * 排他的な開閉だけを共通の小さな client island に閉じ込め、部品全体は Server Component のまま保つ。
 *
 * `<a>` を Next の `Link` にしないのは意図的。client 側遷移による router cache の RSC ペイロード
 * (= 旧 scope で描いた木) の再利用を避ける。時間的な旧 scope 非表示はリンク先が最初に返す
 * server intermediate response が担い、そこから新 scope の画面へ進む。
 *
 * 所属が 1 件のときは呼び出し側が `options` を空で渡す契約にしてある (受入 1「切替 UI も表示しない」)。
 * 「選べない選択肢を disabled で見せる」より、そもそも操作の存在を主張しないほうが迷いが少ない。
 */
import type { CSSProperties, ReactNode } from 'react';

import { IdBadge } from '../components/IdBadge.js';
import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { TransientDisclosure } from './TransientDisclosure.js';

export interface ShellWorkspaceOption {
  /** 切替先の href。組み立ては呼び出し側 (アプリ) の責務。この層は route を知らない。 */
  href: string;
  /** 画面に出す名前。表示名が引けない場合は識別子をそのまま渡してよい。 */
  label: string;
  /** `label` が表示名ではなく識別子のとき true。候補ごとの由来を失わないために必須。 */
  isIdentifier: boolean;
  /** 現在選択中か。現在地は選択肢としてではなく状態として示す。 */
  current: boolean;
}

export interface WorkspaceSwitcherProps {
  /** 欄の見出し語 (「ワークスペース」など)。 */
  label: string;
  /** 現在の Workspace 表示名。 */
  currentName: string;
  /**
   * `currentName` が表示名ではなく識別子 (ULID など) のときに true。
   * 識別子を名前と同じ体裁で出すと「読める名前」に見えてしまうため、`IdBadge` へ落とす。
   * 判定は呼び出し側が行う (この層は値の素性を推測しない)。
   */
  currentIsIdentifier?: boolean | undefined;
  /**
   * 切替先の候補。**2 件未満なら現在値の表示だけ**になり、開閉 UI を出さない。
   * 「所属 1 件の利用者に切替 UI を見せない」判定はこの長さに一本化してある。
   */
  options: readonly ShellWorkspaceOption[];
  /** 開閉コントロールのアクセシブル名 (「ワークスペースを切り替える」など)。 */
  switchLabel: string;
}

const wrapperStyle: CSSProperties = { minWidth: 0, position: 'relative' };

const captionStyle: CSSProperties = {
  fontSize: 'var(--hh-font-size-xs)',
  color: colorVar('textMuted'),
};

const currentNameStyle: CSSProperties = {
  fontWeight: 'var(--hh-font-weight-bold)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const summaryStyle: CSSProperties = {
  ...currentNameStyle,
  display: 'flex',
  alignItems: 'center',
  gap: spaceVar(1),
  minHeight: 'var(--hh-control-height)',
  cursor: 'pointer',
  listStyle: 'none',
};

const menuStyle: CSSProperties = {
  position: 'absolute',
  insetInlineStart: 0,
  zIndex: 30,
  minWidth: '14rem',
  padding: spaceVar(1),
  margin: 0,
  background: colorVar('surface'),
  border: `1px solid ${colorVar('border')}`,
  borderRadius: radiusVar('md'),
  listStyle: 'none',
};

const menuLinkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 'var(--hh-control-height)',
  padding: `0 ${spaceVar(3)}`,
  color: colorVar('text'),
  textDecoration: 'none',
};

const currentItemStyle: CSSProperties = {
  ...menuLinkStyle,
  color: colorVar('textMuted'),
  cursor: 'default',
};

const identifierLabelStyle: CSSProperties = {
  display: 'inline-block',
  maxWidth: 'var(--hh-id-badge-measure)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  fontFamily: 'var(--hh-font-family-mono)',
  fontSize: 'var(--hh-font-size-xs)',
  color: colorVar('textMuted'),
};

/**
 * summary / link の内側で使う、非対話型の識別子表示。
 * `IdBadge` は全文を開く `<details>` なので、別の `<summary>` や `<a>` の内側には入れない。
 */
function IdentifierLabel({ value, label }: { readonly value: string; readonly label: string }): ReactNode {
  return <code style={identifierLabelStyle}>{`${label} ID: ${value}`}</code>;
}

export function WorkspaceSwitcher(props: WorkspaceSwitcherProps): ReactNode {
  const { label, currentName, currentIsIdentifier = false, options, switchLabel } = props;
  const current = currentIsIdentifier ? <IdBadge value={currentName} label={label} /> : currentName;

  // 所属 1 件 (または候補を出せない) の利用者には選択操作を強いない。表示だけに落とす。
  if (options.length < 2) {
    return (
      <div style={wrapperStyle}>
        <span style={captionStyle}>{label}</span>
        <div style={currentNameStyle}>{current}</div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <span style={captionStyle}>{label}</span>
      <TransientDisclosure data-hh-workspace-switcher="">
        <summary aria-label={switchLabel} style={summaryStyle}>
          <span style={currentNameStyle}>
            {currentIsIdentifier ? <IdentifierLabel value={currentName} label={label} /> : currentName}
          </span>
          {/* 開閉の手掛かり。装飾なので支援技術には読ませない */}
          <span aria-hidden="true">▾</span>
        </summary>
        <ul style={menuStyle}>
          {options.map((option) => (
            <li key={option.href}>
              {option.current ? (
                // 現在地は状態であって遷移先ではない。同じ cookie を書く不要な round trip を作らない。
                <span aria-current="true" style={currentItemStyle}>
                  {option.isIdentifier ? <IdentifierLabel value={option.label} label={label} /> : option.label}
                </span>
              ) : (
                <a href={option.href} style={menuLinkStyle}>
                  {option.isIdentifier ? <IdentifierLabel value={option.label} label={label} /> : option.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </TransientDisclosure>
    </div>
  );
}
