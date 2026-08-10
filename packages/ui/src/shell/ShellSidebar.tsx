/**
 * 常設サイドバー (frontend-spec §3.0)。
 *
 * サーバ部品のまま (`'use client'` を付けない) にしてあるので、
 * 全画面に載っても client bundle を増やさない。折りたたみと非表示は
 * `buildShellCss()` のメディアクエリだけで行う。
 */
import type { ReactNode } from 'react';

import { Icon } from '../icons/index.js';
import { colorVar, radiusVar, spaceVar } from '../internal/style.js';
import { isCurrentNav, type ShellNavItem } from './nav-model.js';

export interface ShellSidebarProps {
  items: readonly ShellNavItem[];
  /** 現在表示中のパス。`aria-current="page"` の付与先を決める。 */
  currentHref?: string | undefined;
  /** ナビゲーションの読み上げ名。 */
  label: string;
  /** 上部に置くブランド表示 (製品名やワークスペース名)。 */
  brand?: ReactNode | undefined;
}

export function ShellSidebar({ items, currentHref, label, brand }: ShellSidebarProps): ReactNode {
  return (
    <nav className="hh-shell__sidebar" aria-label={label}>
      {brand === undefined ? null : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '56px',
            padding: `0 ${spaceVar(2)}`,
            borderBlockEnd: `1px solid ${colorVar('border')}`,
          }}
        >
          {brand}
        </div>
      )}

      <ul
        style={{
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: spaceVar(1),
          margin: 0,
          padding: spaceVar(2),
        }}
      >
        {items.map((item) => {
          const current = isCurrentNav(item, currentHref);
          return (
            <li key={item.href}>
              <a
                className="hh-shell__nav-link"
                href={item.href}
                data-hh-focusable=""
                // md〜lg ではラベルを畳んでアイコンだけにするため、可視テキストに依存すると
                // その幅で「名前のないリンク」になる。名前は常に aria-label 側で持たせる。
                aria-label={item.label}
                // 折りたたみ時にマウス利用者が名前を確認できるようにする
                title={item.label}
                {...(current ? { 'aria-current': 'page' as const } : {})}
              >
                <Icon name={item.icon} />
                <span className="hh-shell__nav-label" style={{ flex: 1 }}>
                  {item.label}
                </span>
                {item.badgeCount === undefined || item.badgeCount <= 0 ? null : (
                  <span
                    className="hh-shell__nav-label"
                    style={{
                      padding: `0 ${spaceVar(1)}`,
                      borderRadius: radiusVar('full'),
                      background: colorVar('danger'),
                      color: colorVar('onDanger'),
                      fontSize: 'var(--hh-font-size-xs)',
                    }}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
