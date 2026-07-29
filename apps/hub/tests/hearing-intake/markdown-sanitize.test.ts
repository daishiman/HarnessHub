// P04 テストスタブ (SYS-HEARING-INTAKE-P04)
// HI-SEC7-*: シート本文の Markdown が sanitize 済みで描画されること (acceptance 3 / SEC7)。
//
// ADR AD-4 は「生成本文は raw のまま保存し、sanitize は描画時に共通レンダラで一括担保する」と決めている。
// したがって検証点は保存側ではなく描画側であり、共通レンダラ (@harness-hub/ui の MarkdownView) が
// 悪意ある入力を無害化することを feature の受入条件として固定する。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MarkdownView, markdownSanitizeSchema } from '@harness-hub/ui';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

/** AI が生成した本文を S12 と同じ経路で描画する。 */
function renderSheetBody(content: string): string {
  return renderToStaticMarkup(createElement(MarkdownView, { content }));
}

describe('HI-SEC7: シート本文 Markdown の sanitize', () => {
  it('HI-SEC7-001: script タグが描画結果に残らない', () => {
    const html = renderSheetBody('# 概要\n\n<script>alert("xss")</script>\n\n本文です。');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert("xss")');
  });

  it('HI-SEC7-002: イベントハンドラ属性 (onerror / onload) が残らない', () => {
    const html = renderSheetBody('<img src="x" onerror="alert(1)">\n\n<div onload="alert(2)">本文</div>');

    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onload');
  });

  it('HI-SEC7-003: javascript: スキームのリンクが残らない', () => {
    const html = renderSheetBody('[クリック](javascript:alert(1))');

    expect(html).not.toContain('javascript:');
  });

  it('HI-SEC7-004: 正常な Markdown は描画される (空出力で緑化しない)', () => {
    // 「何も描画しなければ危険な文字列も出ない」で通ってしまう Goodhart 化を防ぐ
    const html = renderSheetBody('# 概要\n\n請求書処理を **自動化** します。\n\n- OCR\n- 仕訳');

    expect(html).toContain('<h1');
    expect(html).toContain('概要');
    expect(html).toContain('<strong>自動化</strong>');
    expect(html).toContain('<li>OCR</li>');
  });

  it('HI-SEC7-005: 外部リンクに rel="noopener noreferrer" が付く', () => {
    const html = renderSheetBody('[外部](https://example.com)');

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('HI-SEC7-006: feature 側が sanitize schema を独自に上書きしていない', () => {
    // AD-8: schema の feature 独自上書きを禁止する。共通レンダラの既定をそのまま使う
    expect(markdownSanitizeSchema).toBeDefined();
    expect(markdownSanitizeSchema.tagNames).not.toContain('script');
    expect(markdownSanitizeSchema.tagNames).not.toContain('iframe');
    expect(markdownSanitizeSchema.protocols?.href).not.toContain('javascript');
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---

  const detailSource = () =>
    readFileSync(resolve(process.cwd(), 'src/app/(dashboard)/sheets/[id]/hearing-sheet-detail.tsx'), 'utf8');

  it('HI-SEC7-101: S12 は MarkdownView だけで本文を描画し raw HTML API を使わない', () => {
    const source = detailSource();
    expect(source).toContain('MarkdownView');
    expect(source).not.toContain('dangerouslySetInnerHTML');
    expect(source).not.toContain('ReactMarkdown');
  });

  it('HI-SEC7-102: generated_sections の 4 セクションすべてを MarkdownView へ渡す', () => {
    const source = detailSource();
    expect(source.match(/<MarkdownView/g)).toHaveLength(4);
    expect(source).toContain('sections.overview');
    expect(source).toContain('sections.issue');
    expect(source).toContain('sections.feature_tags');
    expect(source).toContain('sections.estimated_effect');
  });

  it('HI-SEC7-103: 印刷は同じ認可済み DOM を window.print し、PDF API を作らない', () => {
    const source = detailSource();
    expect(source).toContain('window.print()');
    expect(source).toContain('data-print-exclude');
    const routeFiles = readFileSync(resolve(process.cwd(), 'src/app/(dashboard)/sheets/[id]/page.tsx'), 'utf8');
    expect(routeFiles).toContain('@media print');
    expect(routeFiles).not.toMatch(/pdf|PDF/);
  });
});
