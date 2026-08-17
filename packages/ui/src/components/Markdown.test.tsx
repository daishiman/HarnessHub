/** Markdown レンダラの単体テスト。中心は XSS sanitize (SEC7) — 危険な入力が描画に漏れないことを固定する。 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { collectCardBlockWarnings, MarkdownEditor, MarkdownView, markdownSanitizeSchema, slugify } from '../index.js';
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

  it('CARD-BLOCK-008: ツールバーから 2 列 / 3 列の雛形を挿入できる', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithUi(<MarkdownEditor label="本文" value="" onValueChange={onValueChange} />);

    await user.click(screen.getByRole('button', { name: '2列カード' }));
    const twoColumns = onValueChange.mock.calls.at(-1)?.[0] as string;
    expect(twoColumns).toContain(':::cards cols=2');
    // 挿入直後に「カードが 2 枚ある行」として成立している (書き足さないと壊れる雛形にしない)
    expect(twoColumns.match(/^:::card$/gm)).toHaveLength(2);
    expect(collectCardBlockWarnings(twoColumns)).toEqual([]);

    await user.click(screen.getByRole('button', { name: '3列カード' }));
    const threeColumns = onValueChange.mock.calls.at(-1)?.[0] as string;
    expect(threeColumns).toContain(':::cards cols=3');
    expect(threeColumns.match(/^:::card$/gm)).toHaveLength(3);
  });

  it('CARD-BLOCK-003: 記法ミスは保存を止めない注意として、行番号つきで出す', () => {
    renderWithUi(
      <MarkdownEditor label="本文" value={':::cards cols=7\n:::card\n本文\n:::'} onValueChange={() => undefined} />,
    );

    // role="alert" ではなく status。入力のたびに読み上げへ割り込ませない
    const notice = screen.getByRole('status', { name: 'カード記法の注意' });
    expect(notice.textContent).toContain('1 行目');
    expect(notice.textContent).toContain('cols=2 または cols=3');
    // 入力欄は無効化されない (非 blocking)
    expect(screen.getByLabelText('本文').hasAttribute('disabled')).toBe(false);
  });

  it('記法が正しければ注意は出ない', () => {
    renderWithUi(
      <MarkdownEditor
        label="本文"
        value={':::cards cols=2\n:::card\n本文\n:::\n:::'}
        onValueChange={() => undefined}
      />,
    );

    expect(screen.queryByRole('status', { name: 'カード記法の注意' })).toBeNull();
  });
});

describe('CARD-BLOCK-006: 編集面と確認面の並べ方', () => {
  /** 大画面 (1025px 以上) を名乗る matchMedia を差し込む。jsdom は既定で matchMedia を持たない。 */
  const stubWideViewport = (): void => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('1025'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('大画面は 2 ペインで編集と確認を同時に出す (tab に隠さない)', async () => {
    stubWideViewport();
    const draft = ':::cards cols=2\n:::card\n下書きの本文\n:::\n:::';
    const { container } = renderWithUi(<MarkdownEditor label="本文" value={draft} onValueChange={() => undefined} />);

    await waitFor(() => expect(container.querySelector('[data-hh-editor-panes]')).not.toBeNull());
    expect(screen.queryByRole('tab', { name: '編集' })).toBeNull();
    expect(screen.getByLabelText('本文')).toBeDefined();
    // 狭幅の tab と同じ MarkdownView 経路なので、draft のカードもそのまま出る
    expect(container.querySelector('[data-hh-editor-panes] [data-hh-cards]')).not.toBeNull();
    expect(screen.getByText('下書きの本文')).toBeDefined();
  });

  it('狭幅は同じ 2 面を tab で切り替える', () => {
    renderWithUi(<MarkdownEditor label="本文" value="本文" onValueChange={() => undefined} />);

    expect(screen.getByRole('tab', { name: '編集' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'プレビュー' })).toBeDefined();
  });
});

describe('カードブロック記法 (:::cards / :::card)', () => {
  const twoCardDocument = [
    ':::cards cols=2',
    ':::card',
    '### 左のカード',
    '',
    '左の本文',
    ':::',
    ':::card',
    '### 右のカード',
    '',
    '右の本文',
    ':::',
    ':::',
  ].join('\n');

  it('CARD-BLOCK-001: cols=2 / cols=3 が正規化済みの data-cols として残る', () => {
    const { container } = renderWithUi(<MarkdownView content={twoCardDocument} />);

    const grid = container.querySelector('[data-hh-cards]');
    expect(grid?.getAttribute('data-cols')).toBe('2');
    expect(container.querySelectorAll('[data-hh-card]')).toHaveLength(2);
  });

  it('CARD-BLOCK-001: 未知の cols は 2 列へ寄せ、記事は壊れない', () => {
    const { container } = renderWithUi(<MarkdownView content={':::cards cols=99\n:::card\nカード本文\n:::\n:::'} />);

    expect(container.querySelector('[data-hh-cards]')?.getAttribute('data-cols')).toBe('2');
    expect(screen.getByText('カード本文')).toBeDefined();
  });

  it('CARD-BLOCK-001: 列数の切替は media query で持ち、DOM を差し替えない', () => {
    renderWithUi(<MarkdownView content={twoCardDocument} />);

    // 幅ごとの列数は CSS が決める。JS で幅を測って描き分けると SSR と初回描画がずれる
    const css = [...document.querySelectorAll('style')].map((node) => node.textContent ?? '').join('');
    expect(css).toContain('@media (min-width:641px)');
    expect(css).toContain('@media (min-width:1025px)');
    expect(css).toContain('[data-cols="3"]');
  });

  it('CARD-BLOCK-002: 列数が変わっても DOM 順は記述順のまま', () => {
    const { container } = renderWithUi(<MarkdownView content={twoCardDocument} />);

    const headings = [...container.querySelectorAll('[data-hh-card] h3')].map((node) => node.textContent);
    expect(headings).toEqual(['左のカード', '右のカード']);
  });

  it('CARD-BLOCK-003: 閉じ忘れは例外にせず、本文をそのまま描き切る', () => {
    const { container } = renderWithUi(<MarkdownView content={':::cards cols=2\n:::card\n書きかけの本文'} />);

    expect(container.querySelector('[data-hh-cards]')).toBeNull();
    expect(screen.getByText('書きかけの本文')).toBeDefined();
  });

  it('CARD-BLOCK-003: 対応する :::cards が無い :::card も本文を落とさない', () => {
    renderWithUi(<MarkdownView content={':::card\n迷子のカード\n:::'} />);

    expect(screen.getByText('迷子のカード')).toBeDefined();
  });

  it('CARD-BLOCK-004: sanitize 後に残るのは hh-cards / hh-card と data-cols だけ', () => {
    const { container } = renderWithUi(
      <MarkdownView
        content={[
          ':::cards cols=3',
          ':::card',
          '<script>window.__pwned = true;</script>',
          '',
          '<div class="danger" id="danger" onclick="window.__pwned = true">危険</div>',
          ':::',
          ':::',
        ].join('\n')}
      />,
    );

    const grid = container.querySelector('[data-hh-cards]');
    expect(grid).not.toBeNull();
    expect([...(grid?.attributes ?? [])].map((attribute) => attribute.name).sort()).toEqual([
      'data-cols',
      'data-hh-cards',
    ]);
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('__pwned');
    expect(container.innerHTML).not.toContain('onclick');
    expect(container.querySelector('.danger')).toBeNull();
    expect(container.querySelector('#danger')).toBeNull();
  });

  it('CARD-BLOCK-005: カード内の見出しは見出しレベルと id (TOC アンカー) を保つ', () => {
    const { container } = renderWithUi(
      <MarkdownView content={':::cards cols=2\n:::card\n## カードの見出し\n:::\n:::'} />,
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'カードの見出し' });
    expect(heading.getAttribute('id')).toBe(slugify('カードの見出し'));
    expect(container.querySelector('[data-hh-card] h2')).not.toBeNull();
  });

  it('CARD-BLOCK-005: カード内の連続画像も既存の画像グループとして扱う', () => {
    const { container } = renderWithUi(
      <MarkdownView
        content={[
          ':::cards cols=2',
          ':::card',
          '![1枚目](https://example.com/a.png)',
          '![2枚目](https://example.com/b.png)',
          ':::',
          ':::',
        ].join('\n')}
      />,
    );

    expect(container.querySelector('[data-hh-card] [data-hh-image-group]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /1枚目/ })).toBeDefined();
  });

  it('コードフェンスの中の ::: は記法として解釈しない (記法の解説を書ける)', () => {
    const { container } = renderWithUi(<MarkdownView content={'```\n:::cards cols=2\n:::card\n```'} />);

    expect(container.querySelector('[data-hh-cards]')).toBeNull();
    expect(container.querySelector('code')?.textContent).toContain(':::cards cols=2');
  });
});

describe('collectCardBlockWarnings (編集中の非 blocking 警告)', () => {
  it('正しい記法では何も返さない', () => {
    expect(collectCardBlockWarnings(':::cards cols=3\n:::card\n本文\n:::\n:::')).toEqual([]);
  });

  it('閉じ忘れ・未知 cols・入れ子を、行番号つきで返す', () => {
    const warnings = collectCardBlockWarnings(':::cards cols=5\n:::cards cols=2\n:::card\n本文\n:::');

    // 1 行目: 未知 cols と閉じ忘れ、2 行目: 入れ子と閉じ忘れ。行番号の昇順で返る
    expect(warnings.map((warning) => warning.line)).toEqual([1, 1, 2, 2]);
    expect(warnings[0]?.message).toContain('cols=5 は使えません');
    expect(warnings.map((warning) => warning.message).join('\n')).toContain(':::cards の中に :::cards');
    expect(warnings.filter((warning) => warning.message.includes('閉じられていません'))).toHaveLength(2);
  });

  it('余分な ::: も指摘する', () => {
    const warnings = collectCardBlockWarnings(':::cards cols=2\n:::card\n本文\n:::\n:::\n:::');

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toEqual({ line: 6, message: expect.stringContaining('余分なら削除') });
  });

  it('コードフェンスの中は数えない', () => {
    expect(collectCardBlockWarnings('```\n:::cards cols=9\n```')).toEqual([]);
  });
});
