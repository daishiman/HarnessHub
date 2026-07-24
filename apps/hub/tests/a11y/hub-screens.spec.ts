// @vitest-environment jsdom
// HF-QA-A11Y-002: apps/hub 画面結合の axe 違反が 0 件であること (qa-018 / WCAG 2.2 AA)

import axe from 'axe-core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RootLayout, { metadata } from '../../src/app/layout';
import HomePage from '../../src/app/page';

/** SSR 済みの HTML を jsdom の document へ載せ替える (layout の <html lang> ごと検査対象にする) */
function mountScreen(html: string): void {
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');

  // <title> は Next が metadata から head へ注入する。実配信と同じ状態で検査するためここで再現する
  const title = parsed.createElement('title');
  title.textContent = String(metadata.title);
  parsed.head.appendChild(title);

  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

function formatViolations(violations: readonly axe.Result[]): string {
  return violations.map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`).join('\n');
}

describe('apps/hub 画面結合の a11y', () => {
  it('トップ画面 (layout + page) に axe 違反が無い', async () => {
    const html = renderToStaticMarkup(createElement(RootLayout, null, createElement(HomePage)));
    mountScreen(html);

    const results = await axe.run(document);
    expect(formatViolations(results.violations)).toBe('');
    expect(results.violations).toHaveLength(0);
  });

  it('検査対象の DOM が実際に描画されている (空ページを緑にしない)', () => {
    const html = renderToStaticMarkup(createElement(RootLayout, null, createElement(HomePage)));
    mountScreen(html);

    // 「何も無いページなら違反 0 件」で通ってしまう Goodhart 化を防ぐ
    expect(document.documentElement.getAttribute('lang')).toBe('ja');
    expect(document.title).not.toBe('');
    expect(document.querySelector('main')).not.toBeNull();
    expect(document.querySelectorAll('h1, h2').length).toBeGreaterThan(0);
    expect(document.querySelector('a[href="#main"]')).not.toBeNull();
  });

  it('意図的な a11y 違反を画面結合の検査系が検出し、常時緑ではない', async () => {
    const html = renderToStaticMarkup(createElement(RootLayout, null, createElement(HomePage)));
    mountScreen(html);

    // 実画面へ alt の無い画像を注入し、この検査系 (mountScreen + axe.run(document)) 自体が
    // 違反を検出できることを固定する (packages/ui 側の注入テストと対の、画面結合側の実効性検査)
    const image = document.createElement('img');
    image.src = '/missing-alt.png';
    document.querySelector('main')?.appendChild(image);

    const results = await axe.run(document);
    expect(results.violations.some((violation) => violation.id === 'image-alt')).toBe(true);
  });
});
