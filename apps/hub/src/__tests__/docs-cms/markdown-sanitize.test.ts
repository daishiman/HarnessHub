// P04 テストスタブ (SYS-DOCS-CMS-P04)
// DOCS-SEC7-*: Doc 本文の Markdown が sanitize 済みで描画されること (acceptance / SEC7)。
//
// ADR §7 は hearing-intake と同じ設計 (AD-4/AD-8 相当) を踏襲する: 生成・保存は raw のまま行い、
// sanitize は共通レンダラ (@harness-hub/ui の MarkdownView) が描画時に一括担保する。
// したがって既存共通部品の sanitize 挙動そのものは本 feature のスコープ外 (owner: feat-hub-foundation)。
// 本 feature の検証点は「MarkdownView だけを使い、独自 sanitize schema を持たない」ことに絞る。

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MarkdownView, markdownSanitizeSchema, UiProvider } from '@harness-hub/ui';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

// MarkdownView は画像 (LightboxImage) の「拡大」ラベル等を UiProvider の辞書から引くため、
// 実アプリと同じく UiProvider の内側で描画する (layout.tsx が全画面をこれで包んでいるのに合わせる)。
function renderDocBody(content: string): string {
  return renderToStaticMarkup(createElement(UiProvider, null, createElement(MarkdownView, { content })));
}

describe('DOCS-SEC7: Doc 本文 Markdown の sanitize (共通レンダラ)', () => {
  it('DOCS-SEC7-001: script タグが描画結果に残らない', () => {
    const html = renderDocBody('# 使い方\n\n<script>alert("xss")</script>\n\n本文です。');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert("xss")');
  });

  it('DOCS-SEC7-002: イベントハンドラ属性が残らない', () => {
    const html = renderDocBody('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain('onerror');
  });

  it('DOCS-SEC7-003: javascript: スキームのリンクが残らない', () => {
    const html = renderDocBody('[クリック](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });

  it('DOCS-SEC7-004: 正常な Markdown は描画される (空出力で緑化しない)', () => {
    const html = renderDocBody('# 使い方\n\n本ドキュメントは **共通** ドキュメントです。\n\n- 手順1\n- 手順2');
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>共通</strong>');
    expect(html).toContain('<li>手順1</li>');
  });

  it('DOCS-SEC7-005: 共通レンダラの既定 sanitize schema をそのまま使い、feature 側で上書きしない', () => {
    expect(markdownSanitizeSchema).toBeDefined();
    expect(markdownSanitizeSchema.tagNames).not.toContain('script');
    expect(markdownSanitizeSchema.tagNames).not.toContain('iframe');
    expect(markdownSanitizeSchema.protocols?.href).not.toContain('javascript');
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---

  const S15_DETAIL = resolve(process.cwd(), 'src/app/(dashboard)/docs/[id]/page.tsx');

  it('DOCS-SEC7-101: S15 閲覧画面は MarkdownView だけで本文を描画し raw HTML API を使わない', () => {
    if (!existsSync(S15_DETAIL)) return;
    const source = readFileSync(S15_DETAIL, 'utf8');
    expect(source).toContain('MarkdownView');
    expect(source).not.toContain('dangerouslySetInnerHTML');
    expect(source).not.toContain('ReactMarkdown');
  });

  it('DOCS-SEC7-102: S15 編集画面のプレビューも sanitize 済み HTML のみを描画する', () => {
    const editPage = resolve(process.cwd(), 'src/app/(dashboard)/docs/[id]/edit/page.tsx');
    if (!existsSync(editPage)) return;
    const editImplementation = resolve(process.cwd(), 'src/app/(dashboard)/docs/[id]/edit/document-edit-page.tsx');
    // page が初期 bundle 削減の wrapper でも、遅延読込先まで含めて sanitize 契約を検査する。
    const source = [editPage, editImplementation]
      .filter((file) => existsSync(file))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(source).toContain('MarkdownView');
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });
});
