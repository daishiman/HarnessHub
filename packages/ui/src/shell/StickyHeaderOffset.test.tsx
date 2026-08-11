import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StickyHeaderOffset } from './StickyHeaderOffset.js';
import { screenHeaderHeightVariable, shellHeaderHeightVariable } from './sticky-stack.js';

class TestResizeObserver {
  static instances: TestResizeObserver[] = [];

  readonly observed = new Set<Element>();
  readonly unobserved: Element[] = [];

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
    this.unobserved.push(target);
  }

  disconnect(): void {
    this.observed.clear();
  }

  trigger(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

function rectWithHeight(height: number): DOMRect {
  return {
    bottom: height,
    height,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
}

beforeEach(() => {
  TestResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function getTestRect(this: Element) {
    const height = Number((this as HTMLElement).dataset.testHeight ?? '0');
    return rectWithHeight(height);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty(shellHeaderHeightVariable);
  document.documentElement.style.removeProperty(screenHeaderHeightVariable);
});

describe('StickyHeaderOffset', () => {
  it('shell と後から現れる screen header を測り、DOM 交換後の node へ監視を移す', async () => {
    const view = (screen: { key: string; height: number } | null) => (
      <>
        <header data-hh-shell-header="" data-test-height="56" />
        <StickyHeaderOffset />
        {screen === null ? null : (
          <div key={screen.key} data-hh-screen-header="sticky" data-test-height={screen.height} />
        )}
      </>
    );

    const result = render(view(null));

    expect(document.documentElement.style.getPropertyValue(shellHeaderHeightVariable)).toBe('56px');
    expect(document.documentElement.style.getPropertyValue(screenHeaderHeightVariable)).toBe('0px');

    result.rerender(view({ key: 'loaded', height: 88 }));
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue(screenHeaderHeightVariable)).toBe('88px');
    });

    const firstScreenHeader = document.querySelector('[data-hh-screen-header="sticky"]');
    result.rerender(view({ key: 'next-route', height: 104 }));
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue(screenHeaderHeightVariable)).toBe('104px');
    });

    const observer = TestResizeObserver.instances[0];
    if (observer === undefined) throw new Error('ResizeObserver が作成されていません');
    expect(firstScreenHeader === null ? false : observer.unobserved.includes(firstScreenHeader)).toBe(true);

    const currentScreenHeader = document.querySelector<HTMLElement>('[data-hh-screen-header="sticky"]');
    if (currentScreenHeader === null) throw new Error('交換後の ScreenHeader がありません');
    currentScreenHeader.dataset.testHeight = '120';
    act(() => observer.trigger());
    expect(document.documentElement.style.getPropertyValue(screenHeaderHeightVariable)).toBe('120px');

    result.unmount();
    expect(document.documentElement.style.getPropertyValue(shellHeaderHeightVariable)).toBe('');
    expect(document.documentElement.style.getPropertyValue(screenHeaderHeightVariable)).toBe('');
  });

  it('同じ node の static / sticky 切替も再発見する', async () => {
    const result = render(
      <>
        <StickyHeaderOffset />
        <div data-hh-screen-header="static" data-test-height="72" />
      </>,
    );
    expect(document.documentElement.style.getPropertyValue(screenHeaderHeightVariable)).toBe('0px');

    result.rerender(
      <>
        <StickyHeaderOffset />
        <div data-hh-screen-header="sticky" data-test-height="72" />
      </>,
    );
    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue(screenHeaderHeightVariable)).toBe('72px');
    });
  });
});
