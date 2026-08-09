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
    <section style={{ ...surfaceStyle, borderRadius: radiusVar('lg'), ...style }}>
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
  children: ReactNode;
}

/**
 * 見た目はボタン、意味はリンク。
 *
 * 「新規作成」などは遷移なので `<a>` のままにする。`<button>` + `router.push` にすると
 * 新しいタブで開く・URL をコピーするといったブラウザの当たり前が使えなくなる。
 */
export function ActionLink({ href, variant = 'secondary', children }: ActionLinkProps): ReactNode {
  const primary = variant === 'primary';

  return (
    <a
      href={href}
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
  id,
}: ScreenHeaderProps): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: spaceVar(3),
        marginBlockEnd: spaceVar(5),
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
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

        <h1 {...(id === undefined ? {} : { id })} style={{ margin: 0, fontSize: 'var(--hh-font-size-xl)' }}>
          {title}
        </h1>

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

      {actions === undefined ? null : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spaceVar(2) }}>{actions}</div>
      )}
    </div>
  );
}
