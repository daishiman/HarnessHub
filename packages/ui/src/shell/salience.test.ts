/**
 * SALIENCE-01〜05: 顕著度 3 段 (FR-IDS-005) の定義そのものを固定する。
 *
 * 「3 段ある」は画面を見ても分かりにくい。実際、これを入れるまで `DataCard` の
 * 要約と属性はどちらも sm + textMuted で、**見た目上 2 段しか無い状態が誰にも気づかれず**
 * 残っていた。段が潰れていないことは、値そのものを突き合わせて検査するしかない。
 */
import { describe, expect, it } from 'vitest';

import { type Salience, salienceLevels, salienceStyle } from '../index.js';

const sizeOf = (level: Salience): string => String(salienceStyle[level].fontSize);
const colorOf = (level: Salience): string => String(salienceStyle[level].color);

describe('SALIENCE: 顕著度の 3 段', () => {
  it('SALIENCE-01: lead / context / metadata の 3 段が揃っている', () => {
    expect([...salienceLevels]).toEqual(['lead', 'context', 'metadata']);
    for (const level of salienceLevels) expect(salienceStyle[level]).toBeDefined();
  });

  it('SALIENCE-02: 3 段が文字サイズで互いに区別される (同じ大きさの段が無い)', () => {
    const sizes = salienceLevels.map(sizeOf);
    expect(new Set(sizes).size).toBe(3);
    expect(sizes).toEqual(['var(--hh-font-size-lg)', 'var(--hh-font-size-md)', 'var(--hh-font-size-sm)']);
  });

  it('SALIENCE-03: metadata だけが控えめな色で、lead と context は本文色を保つ', () => {
    // 中段まで textMuted にすると、要約が「読まなくてよい情報」に見える。
    // 中段と下段の差は色で付け、上段と中段の差は大きさで付ける。
    expect(colorOf('lead')).toBe(colorOf('context'));
    expect(colorOf('metadata')).not.toBe(colorOf('context'));
  });

  it('SALIENCE-04: 太さは 400 / 700 の 2 段だけを使い、中間の 600 を作らない', () => {
    const weights = salienceLevels.map((level) => String(salienceStyle[level].fontWeight));
    expect(new Set(weights)).toEqual(new Set(['var(--hh-font-weight-bold)', 'var(--hh-font-weight-normal)']));
  });

  it('SALIENCE-05: 生の px / hex を持たず、すべて token 参照になっている', () => {
    for (const level of salienceLevels) {
      for (const value of Object.values(salienceStyle[level])) {
        expect(String(value)).toMatch(/^var\(--hh-/);
      }
    }
  });
});
