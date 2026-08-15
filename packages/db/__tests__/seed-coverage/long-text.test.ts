// T5: 長文パターン (test-design.md §3.5)。
//
// 折返しが実際にどう見えるかは画面側の関心なので、ここでは扱わない。
// 「折返しが起きる条件を満たした文面が定義されているか」というデータ内容だけを見る (§5 の C1)。
import { beforeAll, describe, expect, it } from 'vitest';

import { loadPendingModule } from './support/pending-module';

/** ADR §6.2 の文字数規約。 */
const MIN_LENGTH = {
  heading: 40,
  body: 200,
  tagName: 20,
  personName: 25,
} as const;

type LongTextKey = keyof typeof MIN_LENGTH;

/** L1: 実運用に近い折返し条件を作る記号。 */
const WRAPPING_MARKS = /[、。・（）]/;
/** L2: 単語区切り。タグ名はこれを含まない。 */
const WORD_SEPARATORS = /[\s\-_/,.･]/;
/** L3: 同一文字の反復で字数を埋めていないことの閾値。 */
const MAX_CHAR_RATIO = 0.2;

/** 最頻文字の出現比率。空文字は 0 とする。 */
function topCharRatio(text: string): number {
  if (text.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const char of text) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  return Math.max(...counts.values()) / text.length;
}

/** T5-1〜T5-4 の判定本体。T5-5 はこの関数の境界を検査する。 */
function inspect(key: LongTextKey, text: string): string[] {
  const defects: string[] = [];
  if (text.length < MIN_LENGTH[key]) {
    defects.push(`${key}: ${text.length} 文字 (最小 ${MIN_LENGTH[key]})`);
  }
  if ((key === 'heading' || key === 'body') && !WRAPPING_MARKS.test(text)) {
    defects.push(`${key}: 句読点・中黒・全角括弧のいずれも含まない (L1)`);
  }
  if (key === 'tagName' && WORD_SEPARATORS.test(text)) {
    defects.push(`${key}: 区切りを含む (L2)`);
  }
  if (topCharRatio(text) >= MAX_CHAR_RATIO) {
    defects.push(`${key}: 最頻文字が ${Math.round(topCharRatio(text) * 100)}% (L3)`);
  }
  return defects;
}

let longText: Record<LongTextKey, readonly string[]>;

beforeAll(async () => {
  const fixtures = await loadPendingModule<{ LONG_TEXT: typeof longText }>('scripts/demo-coverage/fixtures.ts', [
    'LONG_TEXT',
  ]);
  longText = fixtures.LONG_TEXT;
});

describe('T5: 長文パターン', () => {
  it('T5-1: 4 キーがそろい、各文面が最小文字数を満たす', () => {
    expect(Object.keys(longText).sort()).toEqual(Object.keys(MIN_LENGTH).sort());
    const defects: string[] = [];
    for (const key of Object.keys(MIN_LENGTH) as LongTextKey[]) {
      expect(longText[key].length).toBeGreaterThan(0);
      for (const [index, text] of longText[key].entries()) {
        if (text.length < MIN_LENGTH[key]) {
          defects.push(`${key}[${index}]: ${text.length} 文字 (最小 ${MIN_LENGTH[key]})`);
        }
      }
    }
    expect(defects).toEqual([]);
  });

  it('T5-2: 見出しと本文が折返し条件となる記号を含む (L1)', () => {
    const defects = (['heading', 'body'] as const).flatMap((key) =>
      longText[key]
        .map((text, index) => ({ text, index }))
        .filter(({ text }) => !WRAPPING_MARKS.test(text))
        .map(({ index }) => `${key}[${index}]`),
    );
    expect(defects).toEqual([]);
  });

  it('T5-3: タグ名が区切りを持たない連続文字列である (L2)', () => {
    const defects = longText.tagName
      .map((text, index) => ({ text, index }))
      .filter(({ text }) => WORD_SEPARATORS.test(text))
      .map(({ text, index }) => `tagName[${index}]: ${text}`);
    expect(defects).toEqual([]);
  });

  it('T5-4: 各文面の最頻文字が 20% 未満である (L3)', () => {
    const defects = (Object.keys(MIN_LENGTH) as LongTextKey[]).flatMap((key) =>
      longText[key]
        .map((text, index) => ({ ratio: topCharRatio(text), index }))
        .filter(({ ratio }) => ratio >= MAX_CHAR_RATIO)
        .map(({ ratio, index }) => `${key}[${index}]: ${Math.round(ratio * 100)}%`),
    );
    expect(defects).toEqual([]);
  });

  it('T5-5: 判定が最小文字数の境界で合否を分ける', () => {
    // 検査そのものが機能していることの確認。境界を跨がない検査は、
    // 「全部合格」と「常に合格」を区別できない。
    for (const key of Object.keys(MIN_LENGTH) as LongTextKey[]) {
      const min = MIN_LENGTH[key];
      // 文字数だけを見るため、L1〜L3 は満たす文面を組み立てる。
      const base = '設計判断の記録と検証結果を整理した文書（暫定版）、';
      const filler = base.repeat(Math.ceil(min / base.length) + 1);
      const exact = filler.slice(0, min);
      const short = filler.slice(0, min - 1);
      expect(inspect(key, exact).filter((d) => d.includes('最小'))).toEqual([]);
      expect(inspect(key, short).filter((d) => d.includes('最小'))).toHaveLength(1);
    }
  });
});
