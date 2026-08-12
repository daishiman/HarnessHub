/**
 * レイアウト primitive。余白・最大幅・面という「どの画面にも要る 3 つ」だけを部品化する。
 *
 * すべて server component (`'use client'` を付けない) にしてある。ここに状態を持たせると
 * 全画面が client bundle に載り、First Load JS 予算 (120KiB) を骨格だけで食い潰すため。
 */
import type { CSSProperties, ElementType, ReactNode } from 'react';

import { colorVar, radiusVar, spaceVar } from '../internal/style.js';

/** 本文の最大行長。可読性の上限 (約 90 字) を超えないための段階。 */
export const containerSizes = {
  /** フォーム・記事など読み物 */
  narrow: '720px',
  /** 一覧・詳細の標準 */
  standard: '1120px',
  /** 表が主役で横幅を使い切りたい画面 */
  wide: '1440px',
} as const;
export type ContainerSize = keyof typeof containerSizes;

export interface ContainerProps {
  children: ReactNode;
  size?: ContainerSize | undefined;
  /** 既定は `div`。節として意味を持たせたい場合に `section` などへ変える。 */
  as?: ElementType | undefined;
  style?: CSSProperties | undefined;
}

/**
 * 中央寄せの内容領域。左右 padding を必ず持たせるのは、狭い画面で文字が
 * 画面端に貼り付くのを防ぐため (padding を呼び出し側任せにすると必ず抜ける)。
 *
 * padding を固定値ではなく `--hh-container-padding-inline` 経由にしているのは、
 * inline style には `@media` を書けないため。幅による出し分けは base 層が変数へ書き、
 * ここはその変数を読むだけにすることで、分岐の置き場所を 1 箇所に保つ。
 */
export function Container({ children, size = 'standard', as: Tag = 'div', style }: ContainerProps): ReactNode {
  return (
    <Tag
      data-hh-container={size}
      style={{
        width: '100%',
        maxWidth: containerSizes[size],
        marginInline: 'auto',
        paddingInline: 'var(--hh-container-padding-inline)',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export type StackGap = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface StackProps {
  children: ReactNode;
  /** 余白は 4px グリッドの token 段階だけを受け取る (任意の px を渡せないようにする)。 */
  gap?: StackGap | undefined;
  direction?: 'vertical' | 'horizontal' | undefined;
  /** `horizontal` のとき、幅が足りなければ折り返す。既定 true。 */
  wrap?: boolean | undefined;
  align?: CSSProperties['alignItems'] | undefined;
  justify?: CSSProperties['justifyContent'] | undefined;
  as?: ElementType | undefined;
  style?: CSSProperties | undefined;
}

/**
 * 一定間隔で子を並べる。要素側の margin ではなく親の gap で余白を決めるのは、
 * margin だと隣接要素の有無で間隔が変わり、画面ごとに余白がばらつくため。
 */
export function Stack({
  children,
  gap = 4,
  direction = 'vertical',
  wrap = true,
  align,
  justify,
  as: Tag = 'div',
  style,
}: StackProps): ReactNode {
  return (
    <Tag
      data-hh-stack={direction}
      style={{
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        flexWrap: direction === 'horizontal' && wrap ? 'wrap' : 'nowrap',
        gap: spaceVar(gap),
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export interface CardProps {
  children: ReactNode;
  /** 見出し。渡すと `<h2>` として描画し、カードに名前を与える。 */
  title?: ReactNode | undefined;
  /** 見出しの補足。 */
  description?: ReactNode | undefined;
  /** 見出し行の右側に置く操作。 */
  actions?: ReactNode | undefined;
  as?: ElementType | undefined;
  style?: CSSProperties | undefined;
}

/**
 * 面 (カード)。装飾は internal/style の `surfaceStyle` に従い、ここで色を再定義しない。
 * `title` を渡した場合だけ見出しを描くのは、見出しの無いカードに空の `<h2>` を出さないため。
 */
export function Card({ children, title, description, actions, as: Tag = 'section', style }: CardProps): ReactNode {
  return (
    <Tag
      style={{
        background: colorVar('surface'),
        color: colorVar('text'),
        border: `1px solid ${colorVar('border')}`,
        borderRadius: radiusVar('md'),
        padding: spaceVar(5),
        ...style,
      }}
    >
      {title === undefined ? null : (
        <Stack
          direction="horizontal"
          gap={3}
          align="baseline"
          justify="space-between"
          style={{ marginBlockEnd: spaceVar(4) }}
        >
          <Stack gap={1}>
            <h2>{title}</h2>
            {description === undefined ? null : (
              <p style={{ color: colorVar('textMuted'), fontSize: 'var(--hh-font-size-sm)' }}>{description}</p>
            )}
          </Stack>
          {actions}
        </Stack>
      )}
      {children}
    </Tag>
  );
}

// 見出し帯の部品はここには無い。画面上部の見出しは `ScreenHeader` (shell/surfaces.tsx) が唯一の正で、
// 以前ここにあった `PageHeader` は同じ役割の 2 つ目の部品になっていたため廃止した (FR-UIF-001)。
