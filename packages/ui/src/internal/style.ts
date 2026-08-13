/** 部品が design token を参照するための内部ヘルパー。公開 API ではない (index.ts から export しない)。 */
import type { CSSProperties } from 'react';

import { type ColorTokenName, chartSeriesTokens, colorVariableName } from '../tokens/token-names.js';

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

/**
 * 角丸 token の参照。
 *
 * 段は「外枠 frame(14) > カード card(10) > 操作部品 md(8) > 小物 sm(4)」の順で小さくなる。
 * 入れ子の内側ほど丸みが小さいと、包含関係が形だけで読める (デザインシステム §7)。
 * `lg` は旧構成の名残で、面に使うと card と 2px ずれて「同じ種類のカードが 2 種ある」ように
 * 見えるため、新規の面には使わない (既存箇所は card へ寄せ済み)。
 */
// 段は 4 つ + `full` (円) だけ。ここに段を足すと入れ子の深さと角丸の対応が崩れる
export const radiusVar = (size: 'sm' | 'md' | 'card' | 'frame' | 'full'): string => `var(--hh-radius-${size})`;

/** 影 token の参照。frame = 外枠を浮かせる / raised = 下から迫り上がる面。 */
export const shadowVar = (name: 'frame' | 'raised'): string => `var(--hh-shadow-${name})`;

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

/**
 * 面 (カード・パネル) の共通装飾。**すべての面はこれを起点にする**。
 * 部品ごとに background / border / radius を書き直すと、同じ「カード」が
 * 画面によって 8px だったり 12px だったりする不統一が生まれる。
 */
export const surfaceStyle: CSSProperties = {
  background: colorVar('surface'),
  color: colorVar('text'),
  border: `1px solid ${colorVar('border')}`,
  borderRadius: radiusVar('card'),
};

/**
 * 入力部品の共通装飾。高さは表示密度 token に従うため、
 * comfortable では 44px のタップ域が自動的に確保される。
 * 角丸を `md` にしてボタンと揃えてあるのは、同じ行に並ぶ入力欄とボタンで
 * 角の丸みが違うと「別の種類の部品」に見えるため。
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
    borderRadius: radiusVar('md'),
  };
}

/** 押せるものの意味づけ。`Button` (JS 操作) と `ActionLink` (画面遷移) が共有する。 */
export type ActionVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/**
 * variant → 配色。**ボタンの見た目を決める唯一の場所**。
 *
 * `<button>` と `<a>` は役割が違う (前者は操作、後者は遷移) ので部品は分けるが、
 * 「主操作は黒い塗り」「副操作は白地に輪郭」という視覚言語は同じでなければならない。
 * ここを 2 か所に分けて書いていたため、リンク型ボタンだけ角丸と太さが違う状態が生まれていた。
 */
export const actionVariantStyles: Record<ActionVariant, CSSProperties> = {
  primary: {
    background: colorVar('primary'),
    color: colorVar('onPrimary'),
    border: `1px solid ${colorVar('primary')}`,
  },
  secondary: {
    background: colorVar('surface'),
    color: colorVar('text'),
    border: `1px solid ${colorVar('borderStrong')}`,
  },
  danger: {
    background: colorVar('danger'),
    color: colorVar('onDanger'),
    border: `1px solid ${colorVar('danger')}`,
  },
  ghost: {
    background: 'transparent',
    color: colorVar('primary'),
    border: '1px solid transparent',
  },
};

/**
 * 押せるものの共通装飾 (配色以外)。
 * 高さ・余白・角丸・字の太さを 1 か所に置き、Button / ActionLink / 画面側の
 * 「リンクだがボタンに見せたいもの」がすべて同じ形になるようにする。
 */
export const actionBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spaceVar(2),
  minHeight: 'var(--hh-control-height)',
  padding: `0 ${spaceVar(4)}`,
  borderRadius: radiusVar('md'),
  fontSize: 'var(--hh-font-size-md)',
  fontWeight: 600,
  fontFamily: 'inherit',
  textDecoration: 'none',
};
