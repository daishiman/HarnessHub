/**
 * ヘッダー常設の Workspace 切替 UI (frontend-spec §3.0 / feat-workspace-switch-ux 受入 1・3)。
 *
 * **client JS を 1 バイトも増やさない**のが設計上の要件。この部品はシェルに載る = 全 route の
 * First Load JS に効くため、`'use client'` にすると G13 (120 KiB/route) を全画面で押し上げる。
 * したがって開閉は `<details>`、切替は素の `<a>` に閉じる (キーボード操作はブラウザ実装に乗る)。
 *
 * `<a>` を Next の `Link` にしないのは意図的。client 側遷移による router cache の RSC ペイロード
 * (= 旧 scope で描いた木) の再利用を避ける。時間的な旧 scope 非表示はリンク先が最初に返す
 * server intermediate response が担い、そこから新 scope の画面へ進む。
 *
 * 所属が 1 件のときは呼び出し側が `options` を空で渡す契約にしてある (受入 1「切替 UI も表示しない」)。
 * 「選べない選択肢を disabled で見せる」より、そもそも操作の存在を主張しないほうが迷いが少ない。
 */
import type { CSSProperties, ReactNode } from 'react';

import { colorVar, radiusVar, spaceVar } from '../internal/style.js';

export interface ShellWorkspaceOption {
  /** 切替先の href。組み立ては呼び出し側 (アプリ) の責務。この層は route を知らない。 */
  href: string;
  /** 画面に出す名前。表示名が引けない場合は識別子をそのまま渡してよい。 */
  label: string;
  /** 現在選択中か。現在地は選択肢としてではなく状態として示す。 */
  current: boolean;
}

export interface WorkspaceSwitcherProps {
  /** 欄の見出し語 (「ワークスペース」など)。 */
  label: string;
  /** 現在の Workspace 表示名。 */
  currentName: string;
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

export function WorkspaceSwitcher(props: WorkspaceSwitcherProps): ReactNode {
  const { label, currentName, options, switchLabel } = props;

  // 所属 1 件 (または候補を出せない) の利用者には選択操作を強いない。表示だけに落とす。
  if (options.length < 2) {
    return (
      <div style={wrapperStyle}>
        <span style={captionStyle}>{label}</span>
        <div style={currentNameStyle}>{currentName}</div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <span style={captionStyle}>{label}</span>
      <details data-hh-workspace-switcher="">
        <summary aria-label={switchLabel} style={summaryStyle}>
          <span style={currentNameStyle}>{currentName}</span>
          {/* 開閉の手掛かり。装飾なので支援技術には読ませない */}
          <span aria-hidden="true">▾</span>
        </summary>
        <ul style={menuStyle}>
          {options.map((option) => (
            <li key={option.href}>
              {option.current ? (
                // 現在地は状態であって遷移先ではない。同じ cookie を書く不要な round trip を作らない。
                <span aria-current="true" style={currentItemStyle}>
                  {option.label}
                </span>
              ) : (
                <a href={option.href} style={menuLinkStyle}>
                  {option.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
