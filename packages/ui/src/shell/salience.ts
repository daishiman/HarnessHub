/**
 * 顕著度 (salience) の 3 段 — `lead` / `context` / `metadata` (FR-IDS-005)。
 *
 * 画面の中で「最初に目に入る値」「その値を読むために要る情報」「見分けるためだけの値」を
 * 見た目で区別する。これまでは段の定義そのものが実装に存在せず、`DataCard` の要約 (`description`) と
 * 属性 (`meta`) が **どちらも `font-size-sm` + `textMuted`** だったため、見出し以外が
 * すべて metadata 相当へ潰れて実質 2 段しかなかった。中段が無いと、要約と付随情報が
 * 同じ重みで並び、どこから読めばよいかが見た目から決まらない。
 *
 * 3 段は太さでは作らない。太さ token は 400 / 700 の 2 段しか無く、中間が要るからといって
 * 600 を足すのは禁じられている (docs/frontend-ui-foundation-spec.md)。代わりに
 * **文字サイズ・色・行送り**の 3 軸で段差を作る。
 *
 * | 段 | サイズ | 色 | 太さ | 使いどころ |
 * |---|---|---|---|---|
 * | `lead` | lg | text | bold | その 1 件を名指しする値・真っ先に判断が変わる値 (状態など) |
 * | `context` | md | text | normal | lead を読むために要る説明。本文の既定 |
 * | `metadata` | sm | textMuted | normal | 見分けるためだけの付随情報 (識別子・更新日など) |
 *
 * 段の割り当ては部品ではなく**情報**に付く。同じ「状態」でも、一覧の 1 件を選ぶ場面では
 * `lead`、詳細画面の付随情報としては `metadata` になりうる。だから部品側は段を固定せず、
 * 呼び出し側が段を宣言する形にしている。
 */
import type { CSSProperties } from 'react';

import { colorVar } from '../internal/style.js';

export type Salience = 'lead' | 'context' | 'metadata';

/** 段の並び (強い順)。検査や、段を 1 つ下げる操作で使う。 */
export const salienceLevels = ['lead', 'context', 'metadata'] as const satisfies readonly Salience[];

/**
 * 段に対応する文字の装飾。値の表示側 (`<dd>`・要約の `<p>` など) に当てる。
 * ラベル (`<dt>`) は値が何であるかの手がかりでしかないため、段に関わらず常に `metadata` 相当。
 */
export const salienceStyle: Readonly<Record<Salience, CSSProperties>> = {
  lead: {
    fontSize: 'var(--hh-font-size-lg)',
    fontWeight: 'var(--hh-font-weight-bold)',
    color: colorVar('text'),
    lineHeight: 'var(--hh-line-height-tight)',
  },
  context: {
    fontSize: 'var(--hh-font-size-md)',
    fontWeight: 'var(--hh-font-weight-normal)',
    color: colorVar('text'),
    lineHeight: 'var(--hh-line-height-normal)',
  },
  metadata: {
    fontSize: 'var(--hh-font-size-sm)',
    fontWeight: 'var(--hh-font-weight-normal)',
    color: colorVar('textMuted'),
    lineHeight: 'var(--hh-line-height-normal)',
  },
};
