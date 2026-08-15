/**
 * ナビの意味境界による改行と、モバイル導線の実ブラウザ契約。
 * jsdom は行ボックスを計算しないため、1280px / 360px の Chromium で固定する。
 */
import { buildShellCss, MobileTabBar, type ShellNavItem, ShellSidebar, UiProvider } from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';

import { viewportPresets, withBrowserSession } from './browser-harness.js';

const usageItem = {
  href: '/metrics/usage',
  label: '使用状況・削減効果',
  labelSegments: ['使用状況・', '削減効果'],
  icon: 'tracking',
} as const satisfies ShellNavItem;

const primaryItems = [
  { href: '/sheets', label: 'ヒアリングシート', icon: 'sheet' },
  { href: '/catalog', label: '業務ツール', icon: 'harness' },
  { href: '/docs', label: 'ドキュメント', icon: 'docs' },
  { href: '/feedback', label: '改善要望', icon: 'feedback' },
] as const satisfies readonly ShellNavItem[];

const routes = [
  {
    path: '/semantic-nav',
    title: '意味境界ナビ',
    body: (
      <UiProvider>
        <style>{buildShellCss()}</style>
        <div className="hh-shell">
          <ShellSidebar items={[usageItem]} label="主要ナビゲーション" />
          <div className="hh-shell__body">
            <main className="hh-shell__main">本文</main>
            <MobileTabBar items={primaryItems} moreItems={[usageItem]} label="画面切替" />
          </div>
        </div>
      </UiProvider>
    ),
  },
];

describe('ナビの意味境界改行', () => {
  it('1280px のフルサイドバーで、各 segment の内側を分断せず2行に分ける', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/semantic-nav', viewportPresets.desktop);

      const [sidebar] = await session.measure('.hh-shell__sidebar', ['display', 'width']);
      const segments = await session.measure('[data-hh-meaning-segment]', ['white-space']);

      expect(sidebar?.styles.display).not.toBe('none');
      expect(sidebar?.box.width).toBe(212);
      expect(segments.map((segment) => segment.text)).toEqual(['使用状況・', '削減効果']);
      expect(segments.every((segment) => segment.styles['white-space'] === 'nowrap')).toBe(true);
      expect(segments[1]?.box.y).toBeGreaterThan(segments[0]?.box.y ?? Number.POSITIVE_INFINITY);
    });
  });

  it('360px では完全 label の導線を「その他」から開ける', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/semantic-nav', viewportPresets.mobile);

      const [sidebar] = await session.measure('.hh-shell__sidebar', ['display']);
      const [tabbar] = await session.measure('.hh-shell__tabbar', ['display']);
      expect(sidebar?.styles.display).toBe('none');
      expect(tabbar?.styles.display).toBe('grid');

      await session.page.locator('summary[aria-label="その他"]').click();
      const usageLink = session.page.getByRole('link', { name: '使用状況・削減効果' });
      await expect(usageLink.isVisible()).resolves.toBe(true);
      await expect(usageLink.getAttribute('href')).resolves.toBe('/metrics/usage');
    });
  });
});
