/**
 * ハーネス自身の検証。「実ブラウザで測れている」ことを、jsdom では絶対に得られない
 * 値 (0 でない矩形・解決済みの CSS カスタムプロパティ) で示す。
 *
 * ここが緑でないと、後続の 4a2z (レスポンシブ検査) / xaa3 (VRT) の計測結果は
 * すべて信用できない。ハーネスは「検査の土台」なので土台自身を先に固定する。
 */
import { AppShell, Card, NavList, PageHeader, SidebarLayout, Stack } from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';

import { renderDocument, viewportPresets, withBrowserSession } from './browser-harness.js';

const sampleBody = (
  <AppShell brand="Harness Hub">
    <SidebarLayout
      nav={
        <NavList items={[{ href: '/docs', label: 'ドキュメント' }]} label="主要ナビゲーション" currentHref="/docs" />
      }
    >
      <PageHeader title="ドキュメント" description="共通とテナントの文書" />
      <Stack gap={5}>
        <Card title="最近の更新">本文</Card>
      </Stack>
    </SidebarLayout>
  </AppShell>
);

const routes = [
  { path: '/sample', body: sampleBody, title: 'サンプル' },
  { path: '/sample-dark', body: sampleBody, title: 'サンプル (dark)', theme: 'dark' as const },
];

describe('renderDocument', () => {
  it('theme 層と base 層を RootLayout と同じ順序で差し込む', () => {
    const html = renderDocument({ path: '/x', body: sampleBody });

    expect(html.indexOf('--hh-color-bg')).toBeGreaterThan(-1);
    // base 層 (素の要素への規則) が theme 層より後に来ないと、変数未定義のまま評価される
    expect(html.indexOf('-webkit-text-size-adjust')).toBeGreaterThan(html.indexOf('--hh-color-bg'));
  });

  it('dark / compact を html 属性として渡せる', () => {
    const html = renderDocument({ path: '/x', body: sampleBody, theme: 'dark', density: 'compact' });

    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('data-density="compact"');
  });
});

describe('withBrowserSession', () => {
  it('実ブラウザで矩形と computed style を取得できる', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/sample', viewportPresets.desktop);

      const [main] = await session.measure('main', ['background-color', 'font-family']);
      expect(main).toBeDefined();
      // jsdom ではここが必ず 0 になる。0 でないことが「実ブラウザで測れている」証拠。
      expect(main?.box.width).toBeGreaterThan(0);
      expect(main?.box.height).toBeGreaterThan(0);
      // token の CSS カスタムプロパティが実際に解決されている (未解決なら空文字か初期値になる)
      expect(main?.styles['font-family']).not.toBe('');

      const heading = await session.measure('h1');
      expect(heading).toHaveLength(1);
      expect(heading[0]?.text).toBe('ドキュメント');
    });
  });

  it('viewport 指定を変えるとレイアウトが追従する', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/sample', viewportPresets.desktop);
      const [wide] = await session.measure('main > [data-hh-container]');

      await session.setViewport(viewportPresets.mobile);
      const [narrow] = await session.measure('main > [data-hh-container]');

      expect(wide?.box.width).toBeGreaterThan(narrow?.box.width ?? 0);
    });
  });

  it('横方向オーバーフローを測れる (レスポンシブ検査の土台)', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/sample', viewportPresets.mobile);
      const metrics = await session.documentMetrics();

      expect(metrics.clientWidth).toBe(viewportPresets.mobile.width);
      expect(metrics.overflowsHorizontally).toBe(false);
    });
  });

  it('dark テーマの背景色が light と異なる (テーマ切替が実描画へ効く)', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/sample');
      const [light] = await session.measure('body', ['background-color']);

      await session.goto('/sample-dark');
      const [dark] = await session.measure('body', ['background-color']);

      expect(light?.styles['background-color']).not.toBe(dark?.styles['background-color']);
    });
  });

  it('PNG スクリーンショットを取得できる (VRT の土台)', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/sample', viewportPresets.tablet);
      const png = await session.screenshot();

      // PNG のシグネチャ。中身が空でも Buffer は返るため、先頭バイトで実体を確かめる
      expect(png.subarray(0, 4).toString('hex')).toBe('89504e47');
    });
  });

  it('未登録 path は暗黙の空ページではなく例外にする', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await expect(session.goto('/unknown')).rejects.toThrow('未登録の path');
    });
  });
});
