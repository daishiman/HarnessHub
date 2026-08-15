/**
 * アプリ全体の骨格。ヘッダ・本文ランドマーク・スキップリンクを 1 箇所で決める。
 *
 * これを共通化しない場合、route group ごとにヘッダの高さや本文の余白が食い違い、
 * 画面遷移のたびに内容が上下へずれる。「アプリらしさ」の大半はこの一貫性から来る。
 */
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';

import { colorVar, spaceVar, touchTargetStyle } from '../internal/style.js';
import { Container, type ContainerSize } from './primitives.js';

export interface AppShellProps {
  children: ReactNode;
  /** ブランド名。見出しにはしない (画面の `<h1>` は ScreenHeader が持つ)。 */
  brand: ReactNode;
  /** ブランドの遷移先。既定は `/`。 */
  brandHref?: string | undefined;
  /** ヘッダ右側 (アカウントメニュー等)。 */
  headerActions?: ReactNode | undefined;
  /**
   * 本文の下に置く領域 (`ShellFooter` など)。
   * `<main>` の外へ出すことで landmark が入れ子にならず、本文が短い画面でも
   * `minHeight: 100vh` の下端に貼り付く。
   */
  footer?: ReactNode | undefined;
  /** 本文の最大幅。 */
  size?: ContainerSize | undefined;
}

const MAIN_ANCHOR_ID = 'main';

const headerStyle: CSSProperties = {
  // スクロールしてもナビゲーションへ戻れるよう追従させる。
  position: 'sticky',
  insetBlockStart: 0,
  zIndex: 10,
  background: colorVar('surface'),
  borderBlockEnd: `1px solid ${colorVar('border')}`,
};

/**
 * `<header>` / `<main>` のランドマークはここでしか作らない。
 * 個別画面が独自に `<main>` を置くと landmark が重複し、支援技術の本文ジャンプが壊れる。
 */
export function AppShell({
  children,
  brand,
  brandHref = '/',
  headerActions,
  footer,
  size = 'standard',
}: AppShellProps): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ブロックスキップ (WCAG 2.4.1)。見た目は base 層が focus 時だけ出す */}
      <a data-hh-skip-link="" href={`#${MAIN_ANCHOR_ID}`}>
        本文へスキップ
      </a>
      <header style={headerStyle}>
        <Container size={size}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              // 狭い画面ではブランドと右側の操作が 1 行に収まらない。折り返さないと
              // ヘッダだけが画面幅を超え、全ページに横スクロールが出る
              flexWrap: 'wrap',
              gap: spaceVar(4),
              minHeight: 'var(--hh-control-height)',
              paddingBlock: spaceVar(3),
            }}
          >
            <a
              href={brandHref}
              style={{
                ...touchTargetStyle,
                color: colorVar('text'),
                fontWeight: 'var(--hh-font-weight-bold)',
                fontSize: 'var(--hh-font-size-lg)',
                textDecoration: 'none',
              }}
            >
              {brand}
            </a>
            {headerActions}
          </div>
        </Container>
      </header>
      <main id={MAIN_ANCHOR_ID} style={{ flex: 1, paddingBlock: spaceVar(6) }}>
        <Container size={size}>{children}</Container>
      </main>
      {footer === undefined ? null : <Container size={size}>{footer}</Container>}
    </div>
  );
}

export interface NavListItem {
  href: string;
  label: string;
}

export interface NavListProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'aria-label' | 'children'> {
  items: readonly NavListItem[];
  /** landmark の名前。同一ページに nav が複数あるとき区別に使う。 */
  label: string;
  /** 現在地の href。一致する項目へ `aria-current="page"` を付ける。 */
  currentHref?: string | undefined;
}

/**
 * ナビゲーションの見た目を design system 側に閉じ込めるための部品。
 * これが無いと apps 側がリンク一覧を直接組み立てることになり、
 * `packages/ui` を経由しない色・余白の指定が app に生えて token の単一正本が崩れる。
 */
export function NavList({ items, label, currentHref, ...navProps }: NavListProps): ReactNode {
  return (
    <nav {...navProps} aria-label={label}>
      <ul data-hh-unstyled-list="" style={{ display: 'flex', flexWrap: 'wrap', gap: spaceVar(1), margin: 0 }}>
        {items.map((item) => {
          const current = currentHref !== undefined && currentHref === item.href;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                // 現在地を色だけで示すと 1.4.1 に反するため、aria-current と枠でも示す。
                aria-current={current ? 'page' : undefined}
                style={{
                  ...touchTargetStyle,
                  padding: `${spaceVar(2)} ${spaceVar(3)}`,
                  minHeight: 'var(--hh-control-height)',
                  borderRadius: 'var(--hh-radius-sm)',
                  textDecoration: 'none',
                  color: current ? colorVar('primary') : colorVar('text'),
                  background: current ? colorVar('primarySoft') : 'transparent',
                  border: `1px solid ${current ? colorVar('primary') : 'transparent'}`,
                }}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export interface SidebarLayoutProps {
  children: ReactNode;
  /** ナビゲーション。呼び出し側が `<nav>` ごと渡す。 */
  nav: ReactNode;
}

/**
 * ナビゲーションと内容の 2 カラム。
 *
 * ナビゲーションが `<main>` の内側に入るのは、Next の入れ子 layout では
 * 子 layout から親の `<main>` の外へ要素を出せないため。`<nav>` は `<main>` 配下でも
 * 独立した landmark として扱われるので、支援技術からの到達性は損なわれない。
 * 列の指定 (狭いと 1 カラム、`md` 以上で 2 カラム) は base 層の CSS が持つ。
 * inline style には `@media` を書けないためで、`auto-fit` のような自動折返しを使わないのは、
 * 幅が縮んだときにナビゲーションが本文の「上」へ回り込む順序を確定させたいから。
 */
export function SidebarLayout({ children, nav }: SidebarLayoutProps): ReactNode {
  return (
    <div
      data-hh-sidebar-layout=""
      style={{
        display: 'grid',
        gap: spaceVar(6),
        alignItems: 'start',
      }}
    >
      {nav}
      <div>{children}</div>
    </div>
  );
}
