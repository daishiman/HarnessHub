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
import { isResolvedCurrentNav, resolveCurrentNavTarget, type ShellNavItem } from './nav-model.js';

export interface ShellNavGroup {
  /**
   * 分類名。業務の言葉で付ける (「業務」「分析」「管理」など)。
   * 折りたたみ幅では読み上げ専用になり、区切り線だけが残る。
   */
  title: string;
  items: readonly ShellNavItem[];
}

export interface ShellSidebarProps {
  /** 分類ごとに区切って並べる場合。`items` より優先する。 */
  groups?: readonly ShellNavGroup[] | undefined;
  /** 分類しない場合の項目一覧。`groups` を渡すときは不要。 */
  items?: readonly ShellNavItem[] | undefined;
  /** 現在表示中のパス。`aria-current="page"` の付与先を決める。 */
  currentHref?: string | undefined;
  /** ナビゲーションの読み上げ名。 */
  label: string;
  /** 上部に置くブランド表示 (製品名やワークスペース名)。 */
  brand?: ReactNode | undefined;
}

const listStyle = {
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: spaceVar(1),
  margin: 0,
  padding: 0,
} as const;

export function ShellSidebar({ groups, items, currentHref, label, brand }: ShellSidebarProps): ReactNode {
  // 分類なしで渡された場合も内部では 1 グループとして扱い、描画の分岐を 1 本に保つ。
  // 分岐を残すと「分類ありのときだけ余白が違う」といったずれが後から入り込む。
  const resolvedGroups: readonly ShellNavGroup[] = groups ?? [{ title: label, items: items ?? [] }];
  const grouped = groups !== undefined;
  const resolvedTarget = resolveCurrentNavTarget(
    resolvedGroups.flatMap((group) => group.items),
    currentHref,
  );

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

      <div style={{ padding: spaceVar(2) }}>
        {resolvedGroups.map((group) => (
          <div key={group.title} className="hh-shell__nav-group">
            {/* 分類名は div ではなく見出し相当にせず、リストの名前として渡す。
                サイドバーの中に h2 を並べると、画面本体の見出し階層に割り込んでしまう */}
            {grouped ? (
              <p className="hh-shell__nav-group-title" id={`hh-nav-group-${slugify(group.title)}`}>
                {group.title}
              </p>
            ) : null}
            <ul style={listStyle} aria-labelledby={grouped ? `hh-nav-group-${slugify(group.title)}` : undefined}>
              {group.items.map((item) => {
                const current = isResolvedCurrentNav(item, resolvedTarget);
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
          </div>
        ))}
      </div>
    </nav>
  );
}

/** 分類名から `aria-labelledby` 用の id を作る。日本語はそのまま id に使えるが、空白だけ潰す。 */
function slugify(value: string): string {
  return value.replace(/\s+/g, '-');
}
