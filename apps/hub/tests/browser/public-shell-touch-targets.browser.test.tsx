/**
 * 公開シェルの必須ナビゲーションを 44px 角以上に保つ契約。
 * 見た目の情報量は増やさず、リンク自体の操作域を実測する。
 */
import { Alert, UiProvider } from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';

import LegalPage from '../../src/app/legal/page.js';
import { PublicShell } from '../../src/components/shell/public-shell.js';
import { viewportPresets, withBrowserSession } from './browser-harness.js';

const routes = [
  {
    path: '/public-shell-touch-targets',
    title: '公開シェルの操作域',
    body: (
      <UiProvider defaultPreferences={{ density: 'compact' }}>
        <PublicShell>
          <LegalPage />
        </PublicShell>
      </UiProvider>
    ),
  },
  {
    path: '/alert-action-touch-target',
    title: 'Alert の次の一手',
    body: (
      <UiProvider defaultPreferences={{ density: 'compact' }}>
        <Alert
          tone="info"
          title="次の一手"
          description="情報量を増やさずにリンクの操作域を保ちます。"
          action={<a href="/"> リンクを開く </a>}
        />
      </UiProvider>
    ),
  },
];

describe('公開シェルのタップ領域', () => {
  it('360px でブランド・文書ナビ 2 件・フッターの幅と高さがすべて 44px 以上', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/public-shell-touch-targets', viewportPresets.mobile);

      const targets = [
        ...(await session.measure('header a[href="/"]', [])),
        ...(await session.measure('nav[aria-label="このページの文書"] a', [])),
        ...(await session.measure('footer a[href="/legal"]', [])),
      ];

      expect(targets).toHaveLength(4);
      expect(
        targets.map((target) => ({ text: target.text, width: target.box.width, height: target.box.height })),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Harness Hub' }),
          expect.objectContaining({ text: '利用規約' }),
          expect.objectContaining({ text: 'プライバシーポリシー' }),
          expect.objectContaining({ text: '利用規約・プライバシーポリシー' }),
        ]),
      );
      const undersized = targets.flatMap((target) =>
        target.box.width < 44 || target.box.height < 44
          ? [{ text: target.text, width: target.box.width, height: target.box.height }]
          : [],
      );
      expect(undersized).toEqual([]);
    });
  });

  it('compact でも Alert のリンク型 action 自体が 44px 角以上', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/alert-action-touch-target', viewportPresets.mobile);
      const [target] = await session.measure('[role="status"] a[href="/"]', []);

      expect(target).toBeDefined();
      expect(target?.box.width).toBeGreaterThanOrEqual(44);
      expect(target?.box.height).toBeGreaterThanOrEqual(44);
    });
  });
});
