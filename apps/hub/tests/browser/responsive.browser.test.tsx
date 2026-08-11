/**
 * レスポンシブ崩れの機械検出 (HarnessHub-4a2z)。
 *
 * 「モバイルで見ると崩れている」は、jsdom ベースのテストでは原理的に緑のまま通る。
 * レイアウト計算が無いので矩形が全て 0 になり、横スクロールもタップ域も測れないためである。
 * ここでは実 Chromium に 360 / 768 / 1280px の 3 幅で描かせ、次の 2 つを数値で判定する。
 *
 *  1. 横方向オーバーフローが無いこと
 *     横スクロールが出た画面は、内容の右側が「存在するが見えない」状態になる。
 *     利用者は気付けないので、機能があっても無いのと同じになる。
 *  2. 操作部品のタップ域が comfortable 密度で 44px 以上あること
 *     WCAG 2.2 の 2.5.8 (Target Size) と frontend-spec §6.1 の要求。
 *
 * 失敗時は「どの要素が原因か」まで出す。幅だけ報告しても、実際に直すときには
 * 結局ブラウザを手で開くことになり、検査が自動化された意味が薄れるため。
 */
import {
  AppShell,
  Button,
  Card,
  DataTable,
  NavList,
  ScreenHeader,
  SidebarLayout,
  Stack,
  UiProvider,
} from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';

import { viewportPresets, withBrowserSession } from './browser-harness.js';

/** 崩れやすい条件を意図的に集めた画面。折り返せない長い文字列と、幅を食う表を同居させる。 */
const denseBody = (density: 'comfortable' | 'compact') => (
  // UiProvider は自前で data-density を持つ div を描くため、html 属性だけ compact にしても
  // 内側で comfortable へ上書きされる。密度の指定はここへ渡すのが正しい経路。
  <UiProvider defaultPreferences={{ density }}>
    <AppShell
      brand="Harness Hub"
      // 素の <button> ではなく Button を使う。タップ域を担保しているのは design system の
      // 部品側であり、素の要素を測ると「部品を使っていないから小さい」を検査の失敗として
      // 読んでしまい、何を保証したいのかが崩れる
      headerActions={<Button variant="secondary">アカウント</Button>}
    >
      <SidebarLayout
        nav={
          <NavList
            label="主要ナビゲーション"
            currentHref="/catalog"
            items={[
              { href: '/catalog', label: '業務ツール' },
              { href: '/docs', label: 'ドキュメント' },
              { href: '/sheets', label: 'ヒアリングシート' },
              { href: '/feedback', label: 'フィードバック' },
            ]}
          />
        }
      >
        <ScreenHeader
          title="業務ツール一覧"
          description="テナントに配布済みのツールと、公開待ちの要求をまとめて確認できます。"
          actions={<Button>新規作成</Button>}
        />
        <Stack gap={5}>
          <Card title="最近の更新">
            {/* 折り返し位置を持たない長い文字列。min-width: auto が残っていると単独で画面を押し広げる */}
            <p>https://example.com/very/long/path/that/never/wraps/on/narrow/screens/abcdefghijklmnopqrstuvwxyz</p>
          </Card>
          <Card title="配布状況">
            <DataTable
              caption="配布状況"
              rowKey={(row: { id: string }) => row.id}
              columns={[
                { key: 'name', header: 'ツール名', value: (row: { name: string }) => row.name },
                { key: 'owner', header: '管理者', value: (row: { owner: string }) => row.owner },
                { key: 'status', header: '公開状態', value: (row: { status: string }) => row.status },
                { key: 'updated', header: '最終更新', value: (row: { updated: string }) => row.updated },
                { key: 'version', header: 'バージョン', value: (row: { version: string }) => row.version },
              ]}
              rows={[
                {
                  id: '1',
                  name: '見積もり作成支援ツール (営業部向け)',
                  owner: 'harness-hub-operations-team',
                  status: '公開中',
                  updated: '2026-08-08 12:00',
                  version: '1.12.0',
                },
              ]}
            />
          </Card>
        </Stack>
      </SidebarLayout>
    </AppShell>
  </UiProvider>
);

const routes = [
  { path: '/dense', body: denseBody('comfortable'), title: '密度の高い画面' },
  {
    path: '/dense-compact',
    body: denseBody('compact'),
    title: '密度の高い画面 (compact)',
    density: 'compact' as const,
  },
];

/** WCAG 2.2 の 2.5.8。comfortable 密度の操作部品はこれを下回らない。 */
const MIN_TAP_TARGET_PX = 44;

describe('レスポンシブ崩れ検査', () => {
  it.each(Object.entries(viewportPresets))('%s 幅で横方向オーバーフローが出ない', async (_name, viewport) => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/dense', viewport);

      const metrics = await session.documentMetrics();
      const offenders = await session.overflowingElements();

      expect(metrics.clientWidth).toBe(viewport.width);
      // 原因要素を message に載せる。数値だけだと結局ブラウザを手で開くことになる
      expect(
        metrics.overflowsHorizontally,
        `画面幅 ${viewport.width}px を超える要素: ${JSON.stringify(offenders)}`,
      ).toBe(false);
    });
  });

  /**
   * 幅ごとの列数が変わることの確認。`grid-template-columns` の値を見るのは、
   * 「1 カラムに見えるが実は 2 カラムが縦に潰れているだけ」を区別するため。
   */
  it('md 未満は 1 カラム、md 以上は 2 カラムへ切り替わる', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/dense', viewportPresets.mobile);
      const [narrow] = await session.measure('[data-hh-sidebar-layout]', ['grid-template-columns']);

      await session.setViewport(viewportPresets.desktop);
      const [wide] = await session.measure('[data-hh-sidebar-layout]', ['grid-template-columns']);

      const columnCount = (value: string | undefined): number => (value ?? '').split(/\s+/).filter(Boolean).length;
      expect(columnCount(narrow?.styles['grid-template-columns'])).toBe(1);
      expect(columnCount(wide?.styles['grid-template-columns'])).toBe(2);
    });
  });

  /**
   * 表は列が増えるほど最小幅が伸びるので、狭い画面では必ず親を超える。
   * それを画面全体ではなく箱の内側で受け止めていることを、実際のスクロール量で確かめる。
   */
  it('狭い画面では表が箱の内側で横スクロールする (画面ごと動かない)', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/dense', viewportPresets.mobile);

      const boxes = await session.scrollMetrics('[data-hh-scroll-x]');
      expect(boxes.length).toBeGreaterThan(0);
      expect(boxes.some((box) => box.overflowsHorizontally)).toBe(true);
      expect((await session.documentMetrics()).overflowsHorizontally).toBe(false);
    });
  });

  it.each(Object.entries(viewportPresets))(
    '%s 幅で comfortable 密度の操作部品が 44px 以上ある',
    async (_name, viewport) => {
      await withBrowserSession({ routes }, async (session) => {
        await session.goto('/dense', viewport);

        const targets = await session.measure('main a[href], main button');
        expect(targets.length).toBeGreaterThan(0);

        const tooSmall = targets.filter((target) => target.box.height < MIN_TAP_TARGET_PX);
        expect(tooSmall.map((target) => `${target.text}: ${target.box.height}px`)).toEqual([]);
      });
    },
  );

  /**
   * compact は「情報を詰めたい利用者向け」の明示的な選択なので 44px を要求しない。
   * ただし 36px (densityTokens.compact.controlHeight) は下回らせない。
   * これを検査しないと、compact を逃げ道にしてタップ域の要求が実質無効化される。
   */
  it('compact 密度でも操作部品は 36px を下回らない', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/dense-compact', viewportPresets.mobile);

      const targets = await session.measure('main a[href], main button');
      const tooSmall = targets.filter((target) => target.box.height < 36);
      expect(tooSmall.map((target) => `${target.text}: ${target.box.height}px`)).toEqual([]);
    });
  });
});
