// DOCS-CA-*: 本文からの自動解析 (content-analysis.ts) の純粋関数テスト。
// 境界値 (見出しなし/画像なし/長文切り詰め/HTML混在) を優先してカバーする。

import { describe, expect, it } from 'vitest';

import {
  extractExcerpt,
  extractFirstImageUrl,
  extractHeadingOutline,
  extractTitleCandidate,
  summarizeAssets,
} from '../../features/docs-cms/content-analysis.js';

// slugify は content-analysis.ts の非公開関数 (packages/ui の同名公開 export との
// 重複検出 duplicate-detector を避けるため、モジュール内限定にしてある)。
// ここでは日本語 (漢字・かな) はアルファベットや空白を含まない限りそのまま slug になる
// (小文字化・記号除去・空白->ハイフンのみの処理のため) ことを踏まえ、期待値は文字列リテラルで書く。

describe('DOCS-CA: extractTitleCandidate', () => {
  it('DOCS-CA-001: 最初の H1 を返す', () => {
    expect(extractTitleCandidate('# タイトル\n\n本文')).toBe('タイトル');
  });

  it('DOCS-CA-002: H1 が無ければ最初の H2 を返す', () => {
    expect(extractTitleCandidate('本文\n## 見出し2\n続き')).toBe('見出し2');
  });

  it('DOCS-CA-003: 見出しが無ければ null', () => {
    expect(extractTitleCandidate('見出しのない本文だけ。')).toBeNull();
  });

  it('DOCS-CA-004: インライン装飾を剥がす', () => {
    expect(extractTitleCandidate('# **太字**な *タイトル*')).toBe('太字な タイトル');
  });
});

describe('DOCS-CA: extractFirstImageUrl', () => {
  it('DOCS-CA-005: 最初の画像 URL を返す', () => {
    expect(extractFirstImageUrl('文章\n![alt](https://example.test/a.png)\n![alt2](https://example.test/b.png)')).toBe(
      'https://example.test/a.png',
    );
  });

  it('DOCS-CA-006: 画像が無ければ null', () => {
    expect(extractFirstImageUrl('画像のない本文。')).toBeNull();
  });
});

describe('DOCS-CA: extractExcerpt', () => {
  it('DOCS-CA-007: 見出し/画像/コードブロックを除いた最初の段落を返す', () => {
    const markdown =
      '# タイトル\n\n![img](https://example.test/a.png)\n\n```js\nconst a = 1;\n```\n\nこれが本文の最初の段落です。';
    expect(extractExcerpt(markdown)).toBe('これが本文の最初の段落です。');
  });

  it('DOCS-CA-008: maxLength を超えたら切り詰めて末尾に … を付ける', () => {
    const long = 'あ'.repeat(200);
    const result = extractExcerpt(long, 10);
    expect(result).toBe(`${'あ'.repeat(10)}…`);
  });

  it('DOCS-CA-009: 超えなければそのまま返す (… を付けない)', () => {
    expect(extractExcerpt('短い本文。', 120)).toBe('短い本文。');
  });

  it('DOCS-CA-010: 本文が空なら空文字を返す', () => {
    expect(extractExcerpt('# タイトルだけ')).toBe('');
  });

  it('DOCS-CA-011: 生 HTML 行 (details/summary) を除外する', () => {
    const markdown = '<details>\n<summary>開閉</summary>\n\n中身のテキスト。\n\n</details>';
    expect(extractExcerpt(markdown)).toBe('中身のテキスト。');
  });

  it('DOCS-CA-012: コールアウトの先頭行は除外し本文行は取り込む', () => {
    const markdown = '> [!POINT]\n> ポイントの本文です。';
    expect(extractExcerpt(markdown)).toBe('ポイントの本文です。');
  });
});

describe('DOCS-CA: slugify / extractHeadingOutline', () => {
  it('DOCS-CA-013: 見出し階層を level/text/slug でパースする', () => {
    const markdown = '# 導入\n## 使い方\n### 詳細';
    expect(extractHeadingOutline(markdown)).toEqual([
      { level: 1, text: '導入', slug: '導入' },
      { level: 2, text: '使い方', slug: '使い方' },
      { level: 3, text: '詳細', slug: '詳細' },
    ]);
  });

  it('DOCS-CA-014: 同名見出しには連番 suffix を付けて一意にする', () => {
    const markdown = '# 概要\n## 概要\n';
    const outline = extractHeadingOutline(markdown);
    expect(outline[0]?.slug).toBe('概要');
    expect(outline[1]?.slug).toBe('概要-1');
  });

  it('DOCS-CA-015: コードブロック内の # 行は見出しとして拾わない', () => {
    const markdown = '```\n# これはコード\n```\n\n# 本物の見出し';
    expect(extractHeadingOutline(markdown)).toEqual([{ level: 1, text: '本物の見出し', slug: '本物の見出し' }]);
  });

  it('DOCS-CA-016: 見出しが無ければ空配列', () => {
    expect(extractHeadingOutline('見出しなし本文')).toEqual([]);
  });
});

describe('DOCS-CA: summarizeAssets', () => {
  it('DOCS-CA-017: 画像枚数/表/コードの有無を数える', () => {
    const markdown = [
      '![a](a.png)',
      '![b](b.png)',
      '',
      '| h1 | h2 |',
      '| -- | -- |',
      '| v1 | v2 |',
      '',
      '```js',
      'code();',
      '```',
    ].join('\n');
    expect(summarizeAssets(markdown)).toEqual({ imageCount: 2, hasTable: true, hasCode: true });
  });

  it('DOCS-CA-018: 何も無ければ全て false/0', () => {
    expect(summarizeAssets('ただの本文。')).toEqual({ imageCount: 0, hasTable: false, hasCode: false });
  });

  it('DOCS-CA-019: 単一行の表記法だけでは表ありと判定しない (ヘッダー行のみでは表とみなさない)', () => {
    expect(summarizeAssets('| 単独行 |').hasTable).toBe(false);
  });
});
