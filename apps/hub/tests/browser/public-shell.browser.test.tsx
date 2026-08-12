/**
 * 公開画面 (未サインインでも到達する画面) の骨格の実測 (HarnessHub-vaov)。
 *
 * 「ヘッダーを固定すべきか」は感覚では決められない。決め手は 2 つだけで、
 *   1. その画面が実際に 1 画面を超えて縦に伸びるか (伸びないなら固定は可視領域を削るだけ)
 *   2. 伸びる画面で、スクロールしてもヘッダーが上端に残るか
 * どちらも実ブラウザでしか測れないので、ここで測って結論ごと固定する。
 *
 * 併せて、公開画面から利用規約へ到達できること (フッターの常時表示) も確認する。
 * サインイン前にこそ読む文書なのに、以前は公開画面のどこにも導線が無かった。
 */
import { Alert, Panel, ScreenHeader, Stack } from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';

import LegalPage from '../../src/app/legal/page.js';
import { PublicShell } from '../../src/components/shell/public-shell.js';
import { viewportPresets, withBrowserSession } from './browser-harness.js';

/**
 * 端末承認 (/device) の代表的な中身。実ページは `headers()` を読む server component で
 * ここからは呼べないため、縦の長さを決めている要素 (注意書き + 1 つの面) だけを写した。
 */
const deviceBody = (
  <PublicShell>
    <Stack gap={4}>
      <Alert
        tone="info"
        title="この画面について"
        description="CLI や Publisher から表示された確認コードを承認します。"
      />
      <ScreenHeader title="端末の承認" description="表示された確認コードを入力してください。" />
      <Panel title="確認コード">
        <p style={{ marginBlockStart: 0 }}>コードは 8 文字です。大文字・小文字は区別しません。</p>
      </Panel>
    </Stack>
  </PublicShell>
);

/** サインイン入口 (/) の代表的な中身。テナントを選ぶ 1 枚だけの短い画面。 */
const signinBody = (
  <PublicShell>
    <Stack gap={4}>
      <ScreenHeader title="サインイン" description="お使いのテナントを指定してください。" />
      <Panel title="テナント">
        <p style={{ marginBlockStart: 0 }}>テナント識別子を入力すると、その組織のサインイン画面へ進みます。</p>
      </Panel>
    </Stack>
  </PublicShell>
);

const routes = [
  { path: '/legal', body: <LegalPage />, title: '利用規約・プライバシーポリシー' },
  { path: '/device', body: deviceBody, title: '端末の承認' },
  { path: '/signin', body: signinBody, title: 'サインイン' },
];

describe('公開画面の骨格', () => {
  it('PUB-001: 縦の長さを実測し、1 画面に収まらない公開画面を特定する', async () => {
    const measured = await withBrowserSession({ routes, viewport: viewportPresets.mobile }, async (session) => {
      const result: Record<string, { scrollHeight: number; clientHeight: number }> = {};
      for (const route of routes) {
        await session.goto(route.path, viewportPresets.mobile);
        result[route.path] = await session.page.evaluate(() => ({
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight,
        }));
      }
      return result;
    });

    // 規約は本文が長く、最も狭い実機 (360x800) で必ず 1 画面を超える = 固定の対象。
    expect(measured['/legal']?.scrollHeight).toBeGreaterThan(measured['/legal']?.clientHeight ?? 0);
    // 端末承認とサインインは短い。ここが将来伸びたらこの検査が落ち、判断のやり直しに気付ける。
    for (const path of ['/device', '/signin']) {
      expect(
        measured[path]?.scrollHeight,
        `${path} が 1 画面に収まらなくなった。固定表示の要否を判断し直すこと`,
      ).toBeLessThanOrEqual((measured[path]?.clientHeight ?? 0) * 2);
    }
  });

  it('PUB-002: 縦に長い公開画面でも、スクロール後にヘッダーが上端へ残る', async () => {
    const top = await withBrowserSession({ routes, viewport: viewportPresets.mobile }, async (session) => {
      await session.goto('/legal', viewportPresets.mobile);
      await session.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      // 追従は CSS の sticky なので再描画を 1 フレーム待つ
      await session.page.waitForTimeout(50);
      const [header] = await session.measure('header');
      return header?.box.y;
    });

    expect(top).toBeDefined();
    // 上端に貼り付いている (0 付近)。流れていれば大きな負の値になる
    expect(Math.abs(top ?? -1)).toBeLessThanOrEqual(1);
  });

  it('PUB-003: 公開画面から利用規約へ到達できる (フッターが全公開画面に出る)', async () => {
    const hrefs = await withBrowserSession({ routes, viewport: viewportPresets.mobile }, async (session) => {
      const result: Record<string, string[]> = {};
      for (const route of routes) {
        await session.goto(route.path, viewportPresets.mobile);
        result[route.path] = await session.page.evaluate(() =>
          [...document.querySelectorAll('footer a')].map((node) => node.getAttribute('href') ?? ''),
        );
      }
      return result;
    });

    for (const route of routes) {
      expect(hrefs[route.path], `${route.path} のフッターに利用規約への導線が無い`).toContain('/legal');
    }
  });

  it('PUB-004: /legal の文書内リンクは通常のフラグメント移動として機能し、nav は印刷時に隠れる', async () => {
    const result = await withBrowserSession({ routes, viewport: viewportPresets.mobile }, async (session) => {
      await session.goto('/legal', viewportPresets.mobile);
      await session.page.locator('nav[aria-label="このページの文書"] a[href="#privacy"]').click();
      const screenState = await session.page.evaluate(() => {
        const target = document.querySelector<HTMLElement>('#privacy');
        return {
          hash: window.location.hash,
          targetExists: target !== null,
          targetTop: target?.getBoundingClientRect().top ?? -1,
          scrollMarginBlockStart: target === null ? '' : getComputedStyle(target).scrollMarginBlockStart,
        };
      });

      await session.page.emulateMedia({ media: 'print' });
      const printNavDisplay = await session.page
        .locator('nav[aria-label="このページの文書"]')
        .evaluate((element) => getComputedStyle(element).display);
      return { ...screenState, printNavDisplay };
    });

    expect(result.hash).toBe('#privacy');
    expect(result.targetExists).toBe(true);
    expect(result.targetTop).toBeGreaterThanOrEqual(0);
    expect(result.scrollMarginBlockStart).not.toBe('0px');
    expect(result.printNavDisplay).toBe('none');
  });
});
