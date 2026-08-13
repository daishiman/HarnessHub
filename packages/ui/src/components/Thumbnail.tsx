/**
 * 画像のサムネイル。
 *
 * `next/image` を使わないのは、扱う画像が R2 の認証必須 URL や任意の外部 URL で、
 * 外部ローダーの許可リストに載せられないため (最適化より認可を優先する)。
 * その判断を画面ごとに書き直させないよう、`biome-ignore` ごとここに閉じる。
 *
 * `alt=""` を既定にしているのは、サムネイルが本文の内容を繰り返す装飾であることが
 * ほとんどで、読み上げると同じ情報を二度聞かせることになるため。意味を持つ画像を
 * 置くときだけ呼び出し側が `alt` を明示する。
 */
import type { CSSProperties, ReactNode } from 'react';

import { radiusVar } from '../internal/style.js';

export interface ThumbnailProps {
  src: string;
  /** 装飾ではなく情報を持つ画像のときだけ渡す。既定は空文字 (支援技術から隠す)。 */
  alt?: string | undefined;
  /**
   * - `inline`: 一覧の行頭に置く 2.5rem の正方形。切り抜いて形を揃える。
   * - `block`: 詳細画面で本文幅いっぱいに置く。縦横比はそのまま。
   */
  size?: 'inline' | 'block' | undefined;
  /** block サムネイルの用途別幅。視覚値を呼出側へ公開しない。 */
  width?: 'content' | 'compact' | undefined;
  /** 前の内容との意味的な区切り。 */
  spacingBefore?: 'none' | 'section' | undefined;
}

const sizeStyles: Record<'inline' | 'block', CSSProperties> = {
  inline: { width: '2.5rem', height: '2.5rem', objectFit: 'cover', flexShrink: 0 },
  block: { display: 'block', maxWidth: '100%', height: 'auto' },
};

const widthStyles: Record<'content' | 'compact', CSSProperties> = {
  content: {},
  compact: { width: '8rem' },
};

const spacingStyles: Record<'none' | 'section', CSSProperties> = {
  none: {},
  section: { marginBlockStart: 'var(--hh-space-3)' },
};

export function Thumbnail({
  src,
  alt = '',
  size = 'inline',
  width = 'content',
  spacingBefore = 'none',
}: ThumbnailProps): ReactNode {
  return (
    // 素の <img> はここだけ。noImgElement は Next.js を持つ apps/* でのみ有効な規則で、
    // 部品側は対象外のため suppression は付けない (付けると「効かない抑制」として警告になる)。
    <img
      src={src}
      alt={alt}
      style={{
        // 角丸は操作部品と同じ md。カード (10px) の内側に載るので 1 段小さい
        borderRadius: radiusVar('md'),
        ...sizeStyles[size],
        ...widthStyles[width],
        ...spacingStyles[spacingBefore],
      }}
    />
  );
}
