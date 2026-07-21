/** 部品が design token を参照するための内部ヘルパー。公開 API ではない (index.ts から export しない)。 */
import type { CSSProperties } from 'react';

import { type ColorTokenName, chartSeriesTokens, colorVariableName } from '../tokens/tokens.js';

/** 色 token を CSS の `var()` 参照にする。部品内で生の色コードを書かないための唯一の口。 */
export const colorVar = (token: ColorTokenName): string => `var(${colorVariableName(token)})`;

/**
 * 系列 index から色を選ぶ。系列数が色数を超えたら先頭へ戻る。
 * 3 つのチャート部品が同じ折り返し計算を各自持たないよう、ここに 1 つだけ置く。
 * `?? [0]` は剰余が範囲内であることを型で表現できないための保険で、実行時には到達しない。
 */
export const seriesColorVar = (index: number): string =>
  colorVar(chartSeriesTokens[index % chartSeriesTokens.length] ?? chartSeriesTokens[0]);

/** 余白 token の参照。 */
export const spaceVar = (step: 1 | 2 | 3 | 4 | 5 | 6 | 7): string => `var(--hh-space-${step})`;

/** 角丸 token の参照。 */
export const radiusVar = (size: 'sm' | 'md' | 'lg' | 'full'): string => `var(--hh-radius-${size})`;

/**
 * 視覚的には隠すがスクリーンリーダーには読ませる。
 * `display: none` と違い支援技術から到達できる。
 */
export const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** 面 (カード・パネル) の共通装飾。 */
export const surfaceStyle: CSSProperties = {
  background: colorVar('surface'),
  color: colorVar('text'),
  border: `1px solid ${colorVar('border')}`,
  borderRadius: radiusVar('md'),
};

/**
 * 入力部品の共通装飾。高さは表示密度 token に従うため、
 * comfortable では 44px のタップ域が自動的に確保される。
 */
export function controlStyle(invalid = false): CSSProperties {
  return {
    minHeight: 'var(--hh-control-height)',
    padding: `0 ${spaceVar(2)}`,
    fontSize: 'var(--hh-font-size-md)',
    fontFamily: 'inherit',
    color: colorVar('text'),
    background: colorVar('surface'),
    border: `1px solid ${invalid ? colorVar('danger') : colorVar('borderStrong')}`,
    borderRadius: radiusVar('sm'),
  };
}
