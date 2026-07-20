/** Markdown レンダラの単体テスト。中心は XSS sanitize (SEC7) — 危険な入力が描画に漏れないことを固定する。 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownEditor, MarkdownView, markdownSanitizeSchema } from '../index.js';
import { renderWithUi } from '../test-utils.js';

describe('MarkdownView の基本描画', () => {
  it('見出しと段落を描画する', () => {
    renderWithUi(<MarkdownView content={'# 見出し\n\n本文です。'} />);

    expect(screen.getByRole('heading', { level: 1, name: '見出し' })).toBeDefined();
    expect(screen.getByText('本文です。')).toBeDefined();
  });

  it('GFM のテーブルを描画する', () => {
    const content = ['| 列A | 列B |', '| --- | --- |', '| 1 | 2 |'].join('\n');
    renderWithUi(<MarkdownView content={content} />);

    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByRole('columnheader', { name: '列A' })).toBeDefined();
  });

  it('外部リンクに rel="noopener noreferrer" を付ける', () => {
    renderWithUi(<MarkdownView content="[リンク](https://example.com)" />);

    const link = screen.getByRole('link', { name: 'リンク' });
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('href')).toBe('https://example.com');
  });
});

describe('MarkdownView の XSS sanitize (SEC7)', () => {
  it('script タグを描画しない', () => {
    const { container } = renderWithUi(
      <MarkdownView content={'本文\n\n<script>window.__pwned = true;</script>'} />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('__pwned');
  });

  it('img の onerror などのイベントハンドラ属性を除去する', () => {
    const { container } = renderWithUi(
      <MarkdownView content={'<img src="x" onerror="window.__pwned = true">'} />,
    );

    expect(container.innerHTML).not.toContain('onerror');
    expect(container.innerHTML).not.toContain('__pwned');
  });

  it('javascript: の href を通さない', () => {
    // eslint 的な誤解を避けるため、危険な URL は分割して組み立てる
    const dangerous = `[クリック](java${''}script:alert(1))`;
    const { container } = renderWithUi(<MarkdownView content={dangerous} />);

    const anchors = [...container.querySelectorAll('a')];
    for (const anchor of anchors) {
      expect(anchor.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
    }
  });

  it('iframe を描画しない', () => {
    const { container } = renderWithUi(
      <MarkdownView content={'<iframe src="https://evil.example.com"></iframe>'} />,
    );

    expect(container.querySelector('iframe')).toBeNull();
  });

  it('style タグと style 属性を通さない', () => {
    const { container } = renderWithUi(
      <MarkdownView content={'<style>body{display:none}</style>\n\n<p style="position:fixed">x</p>'} />,
    );

    expect(container.querySelector('style')).toBeNull();
    expect(container.innerHTML).not.toContain('position:fixed');
  });

  it('form / input を描画しない (偽ログインフォームの埋め込み防止)', () => {
    const { container } = renderWithUi(
      <MarkdownView content={'<form action="https://evil.example.com"><input name="password"></form>'} />,
    );

    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });

  it('安全な強調タグは残す (過剰な除去で表現力を失わないこと)', () => {
    const { container } = renderWithUi(<MarkdownView content="**太字** と `コード`" />);

    expect(container.querySelector('strong')?.textContent).toBe('太字');
    expect(container.querySelector('code')?.textContent).toBe('コード');
  });

  it('sanitize schema を公開し、規則変更を差分で追えるようにしている', () => {
    expect(markdownSanitizeSchema.tagNames).toBeDefined();
    expect(markdownSanitizeSchema.tagNames).not.toContain('script');
    expect(markdownSanitizeSchema.tagNames).not.toContain('iframe');
  });
});

describe('MarkdownEditor', () => {
  it('編集タブとプレビュータブを持つ', () => {
    renderWithUi(<MarkdownEditor label="本文" value="# 見出し" onValueChange={() => undefined} />);

    expect(screen.getByRole('tab', { name: '編集' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'プレビュー' })).toBeDefined();
  });

  it('入力を onValueChange へ通知する', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithUi(<MarkdownEditor label="本文" value="" onValueChange={onValueChange} />);

    await user.type(screen.getByLabelText('本文'), 'a');
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('プレビューは MarkdownView と同じ sanitize を通る', async () => {
    const user = userEvent.setup();
    const { container } = renderWithUi(
      <MarkdownEditor
        label="本文"
        value={'<script>window.__pwned = true;</script>\n\n# 安全な見出し'}
        onValueChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'プレビュー' }));

    expect(screen.getByRole('heading', { name: '安全な見出し' })).toBeDefined();
    expect(container.querySelector('script')).toBeNull();
  });
});
