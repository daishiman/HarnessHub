/**
 * 外観切替 UI (配色 5 種 × 明るさ 3 種) の単体テスト。
 *
 * ここで守りたいのは 2 点。
 * 1. 選んだ結果が `useUi()` (= DOM の data-palette / data-theme) へ即座に出ること。
 * 2. `onChange` が渡す `resolvedTheme` が、`theme` と矛盾しないこと。
 *    サーバ側 (`updateDisplaySettingsRequestSchema`) が両者の矛盾を 400 で拒否するため、
 *    ここでズレると保存が丸ごと失敗する。
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppearancePicker, type AppearanceSelection, UiProvider } from '../index.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(onChange?: (selection: AppearanceSelection) => void): HTMLElement {
  const { container } = render(
    <UiProvider>
      <AppearancePicker name="test" onChange={onChange} />
    </UiProvider>,
  );
  return container.querySelector('div') as HTMLElement;
}

describe('AppearancePicker', () => {
  it('配色 5 種と明るさ 3 種を選択肢として出す', () => {
    setup();

    for (const label of ['グレー', 'ブルー', 'ベージュ', 'グリーン', 'ネイビー']) {
      // 既定のグレーだけは選択中の注記が付くため、前方一致で拾う
      expect(screen.getByRole('radio', { name: new RegExp(`^${label}`) })).toBeTruthy();
    }
    for (const label of ['自動', 'Light', 'Dark']) {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy();
    }
  });

  it('選択状態を色以外の手がかり (テキスト) でも示す', async () => {
    setup();

    expect(screen.getByRole('radio', { name: 'グレー (選択中)' })).toBeTruthy();

    await userEvent.click(screen.getByRole('radio', { name: /^ネイビー/ }));

    expect(screen.getByRole('radio', { name: 'ネイビー (選択中)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'グレー' })).toBeTruthy();
  });

  it('配色を選ぶと data-palette へ即時反映し、明るさは据え置く', async () => {
    const onChange = vi.fn();
    const root = setup(onChange);

    await userEvent.click(screen.getByRole('radio', { name: /^ブルー/ }));

    expect(root.getAttribute('data-palette')).toBe('blue');
    expect(root.getAttribute('data-theme')).toBe('auto');
    expect(onChange).toHaveBeenCalledWith({ theme: 'auto', palette: 'blue', resolvedTheme: 'light' });
  });

  it('明るさを選ぶと配色を据え置いたまま theme と resolvedTheme が揃う', async () => {
    const onChange = vi.fn();
    const root = setup(onChange);

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.getAttribute('data-resolved-theme')).toBe('dark');
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark', palette: 'gray', resolvedTheme: 'dark' });
  });

  it('自動を選ぶと OS 設定を読んで resolvedTheme を決める', async () => {
    // OS が dark のとき、`theme=auto` でも実表示は dark。API はこの対を検証するので、
    // auto のまま resolvedTheme を light と申告してはいけない。
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    const onChange = vi.fn();
    setup(onChange);

    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    await userEvent.click(screen.getByRole('radio', { name: '自動' }));

    expect(onChange).toHaveBeenLastCalledWith({ theme: 'auto', palette: 'gray', resolvedTheme: 'dark' });
  });

  it('配色と明るさを別々のラジオグループに分ける', () => {
    setup();

    const names = new Set(
      screen.getAllByRole('radio').map((radio) => (radio as HTMLInputElement).getAttribute('name')),
    );
    expect(names).toEqual(new Set(['test-palette', 'test-theme']));
  });
});
