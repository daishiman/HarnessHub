// P04 テストスタブ (SYS-FEEDBACK-LOOP-P04)
// markdown-sanitize-render: feedbacks.body / ai_response の Markdown は raw 保存し、
// 描画時にのみ共通レンダラで sanitize する (SEC7, ADR §1)。
//
// hearing-intake (apps/hub/tests/hearing-intake/markdown-sanitize.test.ts) と同じ設計判断
// (ADR AD-4 相当): 検証点は保存側ではなく描画側。共通レンダラ自体のテストは
// owner=feat-hub-foundation のためスコープ外とし、ここでは feedback body/ai_response を
// 同じ MarkdownView 経路に通したときの無害化のみを固定する。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MarkdownView, markdownSanitizeSchema } from '@harness-hub/ui';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const APP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const detailView = () =>
  readFileSync(path.resolve(APP_SRC, 'app/(dashboard)/feedback/[id]/feedback-detail.tsx'), 'utf8');

function renderFeedbackContent(content: string): string {
  return renderToStaticMarkup(createElement(MarkdownView, { content }));
}

describe('markdown-sanitize-render: feedback body / ai_response の sanitize', () => {
  it('FL-SEC7-001: body の script タグが描画結果に残らない', () => {
    const html = renderFeedbackContent('## 要望\n\n<script>alert("xss")</script>\n\nUI を改善してほしい。');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert("xss")');
  });

  it('FL-SEC7-002: ai_response のイベントハンドラ属性が残らない', () => {
    const html = renderFeedbackContent('<img src="x" onerror="alert(1)">\n\n対応方針を提案します。');

    expect(html).not.toContain('onerror');
  });

  it('FL-SEC7-003: javascript: スキームのリンクが残らない', () => {
    const html = renderFeedbackContent('[詳細](javascript:alert(1))');

    expect(html).not.toContain('javascript:');
  });

  it('FL-SEC7-004: 正常な Markdown は描画される (空出力で緑化しない)', () => {
    const html = renderFeedbackContent('## 再現手順\n\n1. ログイン\n2. 一覧を開く\n\n**エラー**が出ます。');

    expect(html).toContain('<h2');
    expect(html).toContain('再現手順');
    expect(html).toContain('<strong>エラー</strong>');
    expect(html).toContain('<li>ログイン</li>');
  });

  it('FL-SEC7-005: feature 側が sanitize schema を独自に上書きしていない', () => {
    expect(markdownSanitizeSchema.tagNames).not.toContain('script');
    expect(markdownSanitizeSchema.tagNames).not.toContain('iframe');
    expect(markdownSanitizeSchema.protocols?.href).not.toContain('javascript');
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---
  describe('P05 実装後: S14 詳細ビューの描画経路', () => {
    it('FL-SEC7-101: feedback 詳細ビューは MarkdownView だけで body/ai_response を描画し dangerouslySetInnerHTML を使わない', () => {
      const view = detailView();
      expect(view).toContain('MarkdownView');
      expect(view).toContain('content={feedback.body}');
      expect(view).toContain('content={feedback.ai_response}');
      expect(view).not.toContain('dangerouslySetInnerHTML');
    });
  });
});
