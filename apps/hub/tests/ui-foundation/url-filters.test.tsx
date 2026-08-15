// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useRememberedViewMode, useUrlFilters, VIEW_MODE_STORAGE_KEYS } from '../../src/lib/list/remembered-filters.js';

interface TestFilters extends Record<string, string> {
  tab: string;
  query: string;
}

const INITIAL: TestFilters = { tab: 'all', query: '' };
const PARAMS = { tab: 'tab', query: 'q' } as const;

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.history.replaceState(null, '', '/docs');
});

describe('CARD-LIST-URL-001: 絞り込みの正本は URL query', () => {
  it('URL に載っている条件で復元し、記憶には左右されない (受入条件 3)', async () => {
    // 前の版が sessionStorage に残していても、URL の条件が勝つこと
    window.sessionStorage.setItem('harness-hub:filters:docs', JSON.stringify({ tab: 'draft', query: '古い' }));
    window.history.replaceState(null, '', '/docs?tab=published&q=請求');

    const { result } = renderHook(() => useUrlFilters<TestFilters>(INITIAL, PARAMS));

    await waitFor(() => expect(result.current.restored).toBe(true));
    expect(result.current.filters).toEqual({ tab: 'published', query: '請求' });
  });

  it('確定は履歴を 1 段積み、既定値は URL から消える', async () => {
    window.history.replaceState(null, '', '/docs');
    const { result } = renderHook(() => useUrlFilters<TestFilters>(INITIAL, PARAMS));
    await waitFor(() => expect(result.current.restored).toBe(true));

    act(() => result.current.apply({ tab: 'draft', query: '見積' }));
    expect(window.location.search).toBe('?tab=draft&q=%E8%A6%8B%E7%A9%8D');

    // 既定値へ戻すと URL からも消える。「条件が付いているか」を URL の見た目で判断できる
    act(() => result.current.apply(INITIAL));
    expect(window.location.search).toBe('');
  });

  it('戻る/進むで一覧が取り残されない', async () => {
    window.history.replaceState(null, '', '/docs?tab=published');
    const { result } = renderHook(() => useUrlFilters<TestFilters>(INITIAL, PARAMS));
    await waitFor(() => expect(result.current.filters.tab).toBe('published'));

    // jsdom は history 操作で popstate を発火しないので、戻った後の状態を作って通知する
    window.history.replaceState(null, '', '/docs?tab=draft');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => expect(result.current.filters.tab).toBe('draft'));
  });
});

describe('CARD-LIST-URL-002: 表示形式だけが記憶に残る (受入条件 4)', () => {
  it('記憶した表示形式は再訪時に戻り、URL の絞り込みを触らない', async () => {
    window.sessionStorage.setItem(VIEW_MODE_STORAGE_KEYS.docs, 'table');
    window.history.replaceState(null, '', '/docs?tab=published');

    const { result } = renderHook(() => useRememberedViewMode(VIEW_MODE_STORAGE_KEYS.docs));

    await waitFor(() => expect(result.current[0]).toBe('table'));
    // 表示形式は URL に載らない。共有した相手の結果を変えないための境界
    expect(window.location.search).toBe('?tab=published');
  });

  it('既定はカードで、切り替えると次回に持ち越す', async () => {
    const { result } = renderHook(() => useRememberedViewMode(VIEW_MODE_STORAGE_KEYS.docs));
    await waitFor(() => expect(result.current[0]).toBe('cards'));

    act(() => result.current[1]('table'));
    expect(window.sessionStorage.getItem(VIEW_MODE_STORAGE_KEYS.docs)).toBe('table');
  });
});
