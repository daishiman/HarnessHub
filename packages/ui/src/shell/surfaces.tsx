/**
 * 画面の骨格になる面 (surface) 部品。
 *
 * mockup の見た目は「白い面 + 12px の角丸 + 1px の境界線」の反復でできている。
 * 各画面がその 3 点を毎回書き写すと、1 箇所直したいときに全画面を触ることになる。
 * ここに寄せて、画面側は「何を載せるか」だけを書けるようにする。
 *
 * 色・余白・角丸は design token の CSS カスタムプロパティ経由でしか触らない。
 */
import type { CSSProperties, ReactNode } from 'react';

import { colorVar, radiusVar, spaceVar, surfaceStyle } from '../internal/style.js';
import { screenHeaderStickyInset } from './sticky-stack.js';

export interface PanelProps {
  /** 面の見出し。省略すると見出しなしの素の面になる。 */
  title?: string | undefined;
  /** 見出しの補足。 */
  description?: string | undefined;
  /** 見出し行の右端に置く操作 (ボタンやリンク)。 */
  actions?: ReactNode | undefined;
  /**
   * 見出しの階層。ページ見出し (h1) の下に置くので既定は h2。
   * 面を入れ子にするときは呼び出し側が h3 を指定して順序を守る。
   */
  headingLevel?: 2 | 3 | 4 | undefined;
  /** 内側の余白を外すか。表を端まで見せたいときに使う。 */
  flush?: boolean | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

/** カード状の面。1 つの関心事を 1 枚に載せる。 */
export function Panel({
  title,
  description,
  actions,
  headingLevel = 2,
  flush,
  style,
  children,
}: PanelProps): ReactNode {
  const Heading = `h${headingLevel}` as const;
  const hasHeader = title !== undefined || actions !== undefined;

  return (
    <section style={{ ...surfaceStyle, borderRadius: radiusVar('card'), ...style }}>
      {hasHeader ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spaceVar(3),
            padding: `${spaceVar(4)} ${spaceVar(4)} ${spaceVar(3)}`,
            borderBlockEnd: `1px solid ${colorVar('border')}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {title === undefined ? null : (
              <Heading style={{ margin: 0, fontSize: 'var(--hh-font-size-md)' }}>{title}</Heading>
            )}
            {description === undefined ? null : (
              <p
                style={{
                  margin: `${spaceVar(1)} 0 0`,
                  color: colorVar('textMuted'),
                  fontSize: 'var(--hh-font-size-sm)',
                  lineHeight: 'var(--hh-line-height-normal)',
                }}
              >
                {description}
              </p>
            )}
          </div>
          {actions === undefined ? null : (
            <div style={{ display: 'flex', gap: spaceVar(2), flexShrink: 0 }}>{actions}</div>
          )}
        </div>
      ) : null}

      <div style={flush ? undefined : { padding: spaceVar(4) }}>{children}</div>
    </section>
  );
}

export interface ActionLinkProps {
  href: string;
  /** 見た目の強さ。既定は控えめな枠線つき。 */
  variant?: 'primary' | 'secondary' | undefined;
  /**
   * true の場合、別タブで開く (`target="_blank"`)。
   *
   * 遷移先が今の画面と別の文脈 (別のワークスペース外フローなど) に切り替わり、
   * 今の入力状態やナビゲーションを保ったまま行き来したい場合に使う。
   * 既定 (false) は同一タブ遷移で、「新規作成」など画面そのものを差し替える操作に使う。
   */
  openInNewTab?: boolean | undefined;
  children: ReactNode;
}

/**
 * 見た目はボタン、意味はリンク。
 *
 * 「新規作成」などは遷移なので `<a>` のままにする。`<button>` + `router.push` にすると
 * 新しいタブで開く・URL をコピーするといったブラウザの当たり前が使えなくなる。
 */
export function ActionLink({
  href,
  variant = 'secondary',
  openInNewTab = false,
  children,
}: ActionLinkProps): ReactNode {
  const primary = variant === 'primary';

  return (
    <a
      href={href}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      data-hh-focusable=""
      data-variant={variant}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spaceVar(2),
        minHeight: 'var(--hh-control-height)',
        padding: `0 ${spaceVar(4)}`,
        borderRadius: radiusVar('sm'),
        fontSize: 'var(--hh-font-size-md)',
        fontWeight: 'var(--hh-font-weight-bold)',
        textDecoration: 'none',
        color: primary ? colorVar('onPrimary') : colorVar('text'),
        background: primary ? colorVar('primary') : colorVar('surface'),
        border: `1px solid ${primary ? colorVar('primary') : colorVar('borderStrong')}`,
      }}
    >
      {children}
    </a>
  );
}

export interface ScreenHeaderProps {
  /** 画面の見出し。ページに 1 つだけの h1 になる。 */
  title: string;
  /** この画面で何ができるかの 1 行説明。 */
  description?: string | undefined;
  /** 見出しの上に出す現在地 (パンくず)。最後の要素は現在地なのでリンクにしない。 */
  breadcrumbs?: readonly { href?: string | undefined; label: string }[] | undefined;
  /** パンくずの読み上げ名。 */
  breadcrumbsLabel?: string | undefined;
  /** 主要操作。右端にまとめる。 */
  actions?: ReactNode | undefined;
  /**
   * 状態チップ・スコープチップ。`TagRow` で包んで渡す。
   * 見出しの直下に置くのは、「何の画面か」の次に知りたいのが
   * 「いまどのテナントの、どの状態のものを見ているか」だから。
   */
  tags?: ReactNode | undefined;
  /**
   * 本文をスクロールしても見出し帯を上端に残すか。
   * 一覧・詳細のように縦に長い画面では true にする (状態とスコープを見失わせないため)。
   * フォームだけの短い画面では、上端が固定されるぶん入力欄の見える範囲が減るので false のまま。
   */
  sticky?: boolean | undefined;
  /** 見出しに紐づける id。`aria-labelledby` で本文領域から参照するために使う。 */
  id?: string | undefined;
}

/** 画面上部の見出し帯。全画面で同じ位置・同じ順序に情報を置く。 */
export function ScreenHeader({
  title,
  description,
  breadcrumbs,
  breadcrumbsLabel,
  actions,
  tags,
  sticky,
  id,
}: ScreenHeaderProps): ReactNode {
  return (
    <div
      data-hh-screen-header={sticky ? 'sticky' : 'static'}
      style={{
        // 見出しと操作を「1 つのかたまり」に見せるため、外枠は縦積みにして
        // 見出し行の中だけで左右に分ける。外枠を横並びにすると、説明文が長い画面では
        // 操作ボタンだけが説明文の下端まで落ちて、見出しから切り離されて見える。
        display: 'flex',
        flexDirection: 'column',
        gap: spaceVar(2),
        marginBlockEnd: spaceVar(5),
        ...(sticky === true
          ? {
              position: 'sticky',
              // mobile は viewport 上端の ShellHeader の直下、md 以上は独立スクロールする
              // 本文ペインの上端へ貼り付く。切替規則は shell-css の stack contract が持つ。
              insetBlockStart: screenHeaderStickyInset,
              // 重なり順はシェルのヘッダー (20) より下、表の見出し (10) より上に置く
              zIndex: 15,
              background: colorVar('bg'),
              // 本文ペインの左右余白ぶん外へ広げ、帯の背景を画面端まで届かせる。
              // これをしないと、下から流れてきた本文が帯の左右をすり抜けて見える。
              marginInline: 'calc(-1 * var(--hh-main-padding-inline, 0px))',
              paddingInline: 'var(--hh-main-padding-inline, 0px)',
              paddingBlock: spaceVar(3),
              borderBlockEnd: `1px solid ${colorVar('border')}`,
            }
          : {}),
      }}
    >
      <div style={{ minWidth: 0 }}>
        {breadcrumbs === undefined || breadcrumbs.length === 0 ? null : (
          <nav aria-label={breadcrumbsLabel ?? title} style={{ marginBlockEnd: spaceVar(1) }}>
            <ol
              style={{
                listStyle: 'none',
                display: 'flex',
                flexWrap: 'wrap',
                gap: spaceVar(2),
                margin: 0,
                padding: 0,
                fontSize: 'var(--hh-font-size-sm)',
                color: colorVar('textMuted'),
              }}
            >
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${crumb.href ?? ''}`} style={{ display: 'flex', gap: spaceVar(2) }}>
                  {index === 0 ? null : <span aria-hidden>/</span>}
                  {crumb.href === undefined ? (
                    // 現在地はリンクにせず、`aria-current` で位置を明示する
                    <span aria-current="page">{crumb.label}</span>
                  ) : (
                    <a href={crumb.href} data-hh-focusable="" style={{ color: colorVar('textMuted') }}>
                      {crumb.label}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* 見出しと主要操作は同じ行に置く。行の中で左右に離しても、
            同じ高さに並んでいれば「この画面の操作」として 1 つに見える */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spaceVar(3),
          }}
        >
          <h1 {...(id === undefined ? {} : { id })} style={{ margin: 0, fontSize: 'var(--hh-font-size-xl)' }}>
            {title}
          </h1>
          {actions === undefined ? null : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spaceVar(2) }}>{actions}</div>
          )}
        </div>

        {tags === undefined ? null : <div style={{ marginBlockStart: spaceVar(2) }}>{tags}</div>}

        {description === undefined ? null : (
          <p
            style={{
              margin: `${spaceVar(2)} 0 0`,
              color: colorVar('textMuted'),
              lineHeight: 'var(--hh-line-height-normal)',
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
