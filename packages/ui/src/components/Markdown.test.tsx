/** Markdown レンダラの単体テスト。中心は XSS sanitize (SEC7) — 危険な入力が描画に漏れないことを固定する。 */
import { screen, within } from '@testing-library/react';
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
    const { container } = renderWithUi(<MarkdownView content={'本文\n\n<script>window.__pwned = true;</script>'} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('__pwned');
  });

  it('img の onerror などのイベントハンドラ属性を除去する', () => {
    const { container } = renderWithUi(<MarkdownView content={'<img src="x" onerror="window.__pwned = true">'} />);

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
    const { container } = renderWithUi(<MarkdownView content={'<iframe src="https://evil.example.com"></iframe>'} />);

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

  it('details/summary (トグル) だけを許可拡張し、on* 属性は依然として除去する', () => {
    const { container } = renderWithUi(
      <MarkdownView
        content={'<details onclick="window.__pwned = true">\n<summary>見出し</summary>\n\n本文\n\n</details>'}
      />,
    );

    expect(container.querySelector('details')).not.toBeNull();
    expect(container.querySelector('summary')?.textContent).toBe('見出し');
    expect(container.innerHTML).not.toContain('onclick');
    expect(container.innerHTML).not.toContain('__pwned');
  });

  it('details 以外の未許可タグ拡張は起きない (script はやはり通さない)', () => {
    const { container } = renderWithUi(
      <MarkdownView content={'<details><summary>x</summary><script>window.__pwned = true;</script></details>'} />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('__pwned');
  });
});

describe('MarkdownView のブロック UI 拡張', () => {
  it('> [!POINT] をコールアウトとして描画する', () => {
    renderWithUi(<MarkdownView content={'> [!POINT]\n> 重要なポイントです'} />);

    const note = screen.getByRole('note');
    expect(note.getAttribute('data-hh-callout')).toBe('point');
    expect(note.textContent).toContain('重要なポイントです');
  });

  it('> [!ATTENTION] をコールアウトとして描画する', () => {
    renderWithUi(<MarkdownView content={'> [!ATTENTION]\n> 注意してください'} />);

    const note = screen.getByRole('note');
    expect(note.getAttribute('data-hh-callout')).toBe('attention');
  });

  it('> [!WARNING] を警告のコールアウトとして描画する (新しい種類)', () => {
    renderWithUi(<MarkdownView content={'> [!WARNING]\n> 警告です'} />);

    const note = screen.getByRole('note');
    expect(note.getAttribute('data-hh-callout')).toBe('warning');
    expect(note.textContent).toContain('警告です');
  });

  it('> [!NOTE] を補足のコールアウトとして描画する (新しい種類)', () => {
    renderWithUi(<MarkdownView content={'> [!NOTE]\n> 補足です'} />);

    const note = screen.getByRole('note');
    expect(note.getAttribute('data-hh-callout')).toBe('note');
    expect(note.textContent).toContain('補足です');
  });

  it.each([
    ['POINT', 'point', 'lightbulb'],
    ['ATTENTION', 'attention', 'alertTriangle'],
    ['WARNING', 'warning', 'alertOctagon'],
    ['NOTE', 'note', 'infoCircle'],
  ])('[!%s] のしるしを絵文字ではなく %s 専用の SVG アイコンで描く', (marker, kind, iconName) => {
    const { container } = renderWithUi(<MarkdownView content={`> [!${marker}]\n> 本文`} />);

    const note = screen.getByRole('note');
    expect(note.getAttribute('data-hh-callout')).toBe(kind);
    expect(note.querySelector(`svg[data-icon="${iconName}"]`)).not.toBeNull();
    // 絵文字はフォント依存で字形も色も端末任せになるため、本文以外の文字が混ざらないことを固定する。
    expect(container.textContent?.trim()).toBe('本文');
  });

  it('未知の [!〜] 記法は変換せず、ただの引用として壊れずに描画する', () => {
    renderWithUi(<MarkdownView content={'> [!MYSTERY]\n> 何かの記法です'} />);

    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByText(/何かの記法です/)).toBeDefined();
  });

  it('コードブロックにコピー ボタンを表示する', () => {
    renderWithUi(<MarkdownView content={'```\nconsole.log(1)\n```'} />);

    expect(screen.getByText('コピー')).toBeDefined();
  });

  it('画像はボタンとして描画され、クリックで拡大表示できる', async () => {
    const user = userEvent.setup();
    renderWithUi(<MarkdownView content={'![説明](https://example.com/a.png)'} />);

    const trigger = screen.getByRole('button', { name: /説明/ });
    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('空行を挟まず連続する複数の画像を横並びグループとして描画する', () => {
    const content = '![1枚目](https://example.com/a.png)\n![2枚目](https://example.com/b.png)';
    const { container } = renderWithUi(<MarkdownView content={content} />);

    const group = container.querySelector('[data-hh-image-group]');
    expect(group).not.toBeNull();
    expect(group?.getAttribute('style')).toContain('flex');
    expect(screen.getByRole('button', { name: /1枚目/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /2枚目/ })).toBeDefined();
  });

  it('空行で区切られた画像はこれまでどおり縦に並ぶ (横並びグループにしない)', () => {
    const content = '![1枚目](https://example.com/a.png)\n\n![2枚目](https://example.com/b.png)';
    const { container } = renderWithUi(<MarkdownView content={content} />);

    expect(container.querySelector('[data-hh-image-group]')).toBeNull();
    expect(screen.getByRole('button', { name: /1枚目/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /2枚目/ })).toBeDefined();
  });

  it('表を横スクロール可能なラッパーで包む', () => {
    const content = ['| 列A | 列B |', '| --- | --- |', '| 1 | 2 |'].join('\n');
    const { container } = renderWithUi(<MarkdownView content={content} />);

    const table = screen.getByRole('table');
    expect(table.parentElement?.getAttribute('style')).toContain('overflow-x');
    expect(container.querySelector('table')).not.toBeNull();
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

  it('コールアウトボタンを開くと 4 種類 (ポイント/注意/警告/補足) を選べる', async () => {
    const user = userEvent.setup();
    renderWithUi(<MarkdownEditor label="本文" value="" onValueChange={() => undefined} />);

    await user.click(screen.getByRole('button', { name: 'コールアウト' }));

    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /ポイント/ })).toBeDefined();
    expect(within(menu).getByRole('menuitem', { name: /注意/ })).toBeDefined();
    expect(within(menu).getByRole('menuitem', { name: /警告/ })).toBeDefined();
    expect(within(menu).getByRole('menuitem', { name: /補足/ })).toBeDefined();
  });

  it('コールアウトメニューから種類を選ぶと対応する記法を挿入する', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithUi(<MarkdownEditor label="本文" value="" onValueChange={onValueChange} />);

    await user.click(screen.getByRole('button', { name: 'コールアウト' }));
    await user.click(screen.getByRole('menuitem', { name: /警告/ }));

    expect(onValueChange).toHaveBeenCalledWith(expect.stringContaining('[!WARNING]'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('画像アップロードを渡すと画像グループボタンが有効になる', () => {
    renderWithUi(
      <MarkdownEditor
        label="本文"
        value=""
        onValueChange={() => undefined}
        onImageUpload={() => Promise.resolve({ url: 'https://example.com/a.png' })}
      />,
    );

    const button = screen.getByRole('button', { name: '画像グループ' });
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('画像アップロードを渡さないと画像グループボタンは無効なまま', () => {
    renderWithUi(<MarkdownEditor label="本文" value="" onValueChange={() => undefined} />);

    const button = screen.getByRole('button', { name: '画像グループ' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
