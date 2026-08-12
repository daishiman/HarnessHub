/**
 * サイドバー開閉トグルの単体テスト (HarnessHub 配色統一・サイドバートグル対応)。
 *
 * 検証したいのは 3 点: 既定は展開・押すたびに開閉状態 (`data-hh-sidebar-collapsed`) が
 * 反転する・選んだ状態が `localStorage` に残り次回の mount でも復元される、の 3 つ。
 * 実レイアウトの折りたたみ幅そのものは `buildShellCss()` が持つ CSS の責務なので
 * ここでは検証しない (CSS の値まで固定すると、幅の微調整のたびにテストが割れる)。
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SidebarToggleButton } from './sidebar-collapse.js';

const STORAGE_KEY = 'harness-hub:sidebar-collapsed';

function renderToggle(): void {
  render(
    <SidebarToggleButton
      expandedLabel="サイドバーを閉じる"
      collapsedLabel="サイドバーを開く"
      icon={<span aria-hidden="true">menu</span>}
    />,
  );
}

function hostCollapsedAttr(): string | null {
  return document.documentElement.getAttribute('data-hh-sidebar-collapsed');
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-hh-sidebar-collapsed');
});

describe('SidebarToggleButton', () => {
  it('既定は展開状態 (data-hh-sidebar-collapsed="false") で描画する', () => {
    renderToggle();

    expect(hostCollapsedAttr()).toBe('false');
    const button = screen.getByRole('button', { name: 'サイドバーを閉じる' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    // 見た目を inline style に戻すと、mobile の CSS `display: none` より強くなる。
    // トグルの見た目とレスポンシブ表示はすべて buildShellCss の責務に保つ。
    expect(button.getAttribute('style')).toBeNull();
    expect(button.style.display).toBe('');
  });

  it('押すたびに開閉状態が反転し、localStorage に保存する', async () => {
    const user = userEvent.setup();
    renderToggle();

    const button = screen.getByRole('button');
    await user.click(button);

    expect(hostCollapsedAttr()).toBe('true');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');

    await user.click(button);
    expect(hostCollapsedAttr()).toBe('false');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');
  });

  it('前回選んだ折りたたみ状態を次の mount で復元する', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');

    act(() => {
      renderToggle();
    });

    expect(hostCollapsedAttr()).toBe('true');
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('壊れた保存値 (true/false 以外) は無視し展開のまま保つ', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-a-boolean');

    act(() => {
      renderToggle();
    });

    expect(hostCollapsedAttr()).toBe('false');
  });
});
