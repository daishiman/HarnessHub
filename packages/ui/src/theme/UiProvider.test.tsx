/** テーマ・表示密度・言語の切替と、design token 適用属性の単体テスト。 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { defaultUiPreferences, UiProvider, useUi, useUiText } from '../index.js';

function Probe(): ReactNode {
  const { theme, resolvedTheme, density, locale, setTheme, setDensity, setLocale } = useUi();
  const t = useUiText();

  return (
    <div>
      <span data-testid="state">{`${theme}/${resolvedTheme}/${density}/${locale}`}</span>
      <span data-testid="text">{t('action.cancel')}</span>
      <button type="button" onClick={() => setTheme('dark')}>
        dark へ
      </button>
      <button type="button" onClick={() => setDensity('compact')}>
        compact へ
      </button>
      <button type="button" onClick={() => setLocale('en')}>
        en へ
      </button>
    </div>
  );
}

describe('defaultUiPreferences', () => {
  it('ja / comfortable / auto を既定にする', () => {
    expect(defaultUiPreferences).toEqual({ theme: 'auto', density: 'comfortable', locale: 'ja' });
  });
});

describe('UiProvider', () => {
  it('data-theme / data-density / lang を DOM へ反映する', () => {
    const { container } = render(
      <UiProvider defaultPreferences={{ theme: 'dark', density: 'compact', locale: 'en' }}>
        <span>本文</span>
      </UiProvider>,
    );

    const root = container.querySelector('div');
    expect(root?.getAttribute('data-theme')).toBe('dark');
    expect(root?.getAttribute('data-density')).toBe('compact');
    expect(root?.getAttribute('lang')).toBe('en');
  });

  it('matchMedia の無い環境でも auto を light に解決して落ちない', () => {
    render(
      <UiProvider>
        <Probe />
      </UiProvider>,
    );

    expect(screen.getByTestId('state').textContent).toBe('auto/light/comfortable/ja');
  });

  it('テーマ・密度・言語を切り替えられる', async () => {
    const user = userEvent.setup();
    render(
      <UiProvider>
        <Probe />
      </UiProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'dark へ' }));
    await user.click(screen.getByRole('button', { name: 'compact へ' }));
    await user.click(screen.getByRole('button', { name: 'en へ' }));

    expect(screen.getByTestId('state').textContent).toBe('dark/dark/compact/en');
  });

  it('言語切替で文言が切り替わる', async () => {
    const user = userEvent.setup();
    render(
      <UiProvider>
        <Probe />
      </UiProvider>,
    );

    expect(screen.getByTestId('text').textContent).toBe('キャンセル');
    await user.click(screen.getByRole('button', { name: 'en へ' }));
    expect(screen.getByTestId('text').textContent).toBe('Cancel');
  });

  it('変更を onPreferencesChange へ通知する (サーバ保存は consumer の責務)', async () => {
    const user = userEvent.setup();
    const onPreferencesChange = vi.fn();
    render(
      <UiProvider onPreferencesChange={onPreferencesChange}>
        <Probe />
      </UiProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'dark へ' }));

    expect(onPreferencesChange).toHaveBeenCalledWith({
      theme: 'dark',
      density: 'comfortable',
      locale: 'ja',
    });
  });

  it('provider の外で useUi を呼ぶと例外にする', () => {
    // React が投げるエラーログでテスト出力が埋まるのを避ける
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/UiProvider/);
    spy.mockRestore();
  });
});
