// @vitest-environment jsdom
// DOCS-TOC-*: 目次 (extractHeadingOutline の slug) が MarkdownView の実描画 id と一致すること。
//
// extractHeadingOutline (content-analysis.ts) が slug 採番の正本で、
// packages/ui/src/components/Markdown.tsx の見出しレンダラーは同じ slugify + 同じ重複解決規則
// (base, base-1, base-2, ...) を複製している。両者がずれると TableOfContents のリンク
// (href="#slug") が MarkdownView の実際の見出し id を指さなくなり、クリックしても遷移しない。
// この乖離は過去に実在した (このセグメントで発見・修正済み) ため、再発を防ぐために固定する。
//
// jsdom 環境切り替えと DOMParser での解析は apps/hub/tests/docs-cms/a11y-screens.test.tsx と同じ手法。

import { MarkdownView, UiProvider } from '@harness-hub/ui';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { extractHeadingOutline } from '../../features/docs-cms/content-analysis.js';

function renderedHeadingIds(markdown: string): string[] {
  const html = renderToStaticMarkup(
    createElement(UiProvider, null, createElement(MarkdownView, { content: markdown })),
  );
  const dom = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html');
  const headings = dom.querySelectorAll('h1, h2, h3, h4, h5, h6');
  return Array.from(headings, (heading) => heading.id);
}

describe('DOCS-TOC: extractHeadingOutline の slug と MarkdownView の見出し id が一致する', () => {
  it('DOCS-TOC-001: 単純な見出し列で一致する', () => {
    const markdown = '# 概要\n\n本文。\n\n## 手順\n\n本文。\n\n### 補足\n\n本文。';
    const outline = extractHeadingOutline(markdown);
    expect(outline.map((entry) => entry.slug)).toEqual(renderedHeadingIds(markdown));
  });

  it('DOCS-TOC-002: 重複する見出しテキストでも同じ規則 (base, base-1, base-2, ...) で一致する', () => {
    const markdown = '## 概要\n\n本文。\n\n## 概要\n\n本文。\n\n## 概要\n\n本文。';
    const outline = extractHeadingOutline(markdown);
    const slugs = outline.map((entry) => entry.slug);
    expect(slugs).toEqual(['概要', '概要-1', '概要-2']);
    expect(slugs).toEqual(renderedHeadingIds(markdown));
  });

  it('DOCS-TOC-003: 見出しレベルが混在し、かつ一部が重複していても一致する', () => {
    const markdown = [
      '# はじめに',
      '本文。',
      '## 手順',
      '本文。',
      '## 手順',
      '本文。',
      '### 補足',
      '本文。',
      '## 手順',
      '本文。',
    ].join('\n\n');
    const outline = extractHeadingOutline(markdown);
    expect(outline.map((entry) => entry.slug)).toEqual(renderedHeadingIds(markdown));
  });

  it('DOCS-TOC-004: インライン装飾を含む見出しでも一致する (装飾を剥がした後のテキストで slugify する)', () => {
    const markdown = '## **太字**な見出し\n\n本文。\n\n## **太字**な見出し\n\n本文。';
    const outline = extractHeadingOutline(markdown);
    expect(outline.map((entry) => entry.slug)).toEqual(renderedHeadingIds(markdown));
  });
});
