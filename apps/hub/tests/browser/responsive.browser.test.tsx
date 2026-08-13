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
  buildShellCss,
  Card,
  DataTable,
  HistoryNavigation,
  NavList,
  ScreenHeader,
  ShellHeader,
  SidebarLayout,
  SidebarToggleButton,
  Stack,
  StageBoard,
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
  {
    path: '/stage-board',
    title: '構築パイプライン',
    body: (
      <UiProvider>
        <StageBoard
          label="構築パイプライン"
          onMoveCard={() => undefined}
          columns={[
            { stage: 'hearing', cards: [{ id: '1', title: 'ヒアリング中のツール' }] },
            { stage: 'requirements', cards: [] },
            { stage: 'design', cards: [] },
            { stage: 'build', cards: [] },
            { stage: 'test', cards: [] },
            { stage: 'review', cards: [] },
            { stage: 'publish', cards: [] },
          ]}
        />
      </UiProvider>
    ),
  },
  {
    path: '/sidebar-toggle',
    title: 'サイドバー開閉トグル',
    body: (
      <>
        <style>{buildShellCss()}</style>
        <div className="hh-shell">
          <aside className="hh-shell__sidebar">主要ナビゲーション</aside>
          <div className="hh-shell__body">
            <header>
              <SidebarToggleButton
                expandedLabel="サイドバーを閉じる"
                collapsedLabel="サイドバーを開く"
                icon={<span aria-hidden="true">menu</span>}
              />
            </header>
            <main className="hh-shell__main">本文</main>
          </div>
        </div>
      </>
    ),
  },
  {
    path: '/shell-header',
    title: '共通ヘッダー',
    body: (
      <UiProvider>
        <style>{buildShellCss()}</style>
        <ShellHeader
          historyNavigation={<HistoryNavigation />}
          workspaceName="営業ワークスペース"
          workspaceLabel="ワークスペース"
          screenTitle="使用状況・削減効果"
          searchAction="/sheets"
          searchLabel="ヒアリングシートを検索"
          searchPlaceholder="HS コード・業務名で探す"
          notificationsHref="/settings/account"
          notificationsLabel="通知設定"
          unreadLabel="未読"
          accountName="山田 太郎"
          accountMenuLabel="アカウントメニュー"
          accountLinks={[{ href: '/settings/account', label: 'アカウント設定' }]}
          signOutHref="/api/auth/signout"
          signOutLabel="サインアウト"
        />
      </UiProvider>
    ),
  },
];

/** WCAG 2.2 の 2.5.8。comfortable 密度の操作部品はこれを下回らない。 */
const MIN_TAP_TARGET_PX = 44;

describe('レスポンシブ崩れ検査', () => {
  it.each(Object.entries(viewportPresets))(
    '共通ヘッダーは %s 幅で履歴操作・現在地を保ち、画面全体を横へ押し出さない',
    async (name, viewport) => {
      await withBrowserSession({ routes }, async (session) => {
        await session.goto('/shell-header', viewport);

        const metrics = await session.documentMetrics();
        const historyTargets = await session.measure('nav[aria-label="ページ履歴"] button');
        const [title] = await session.measure('[data-hh-screen-title]');
        const [mobileSearch] = await session.measure('.hh-shell__mobile-search', ['display']);

        expect(metrics.overflowsHorizontally).toBe(false);
        expect(historyTargets).toHaveLength(2);
        expect(historyTargets.every((target) => target.box.width >= 44 && target.box.height >= 44)).toBe(true);
        expect(title?.box.width).toBeGreaterThanOrEqual(48);
        expect(mobileSearch?.styles.display === 'none').toBe(name !== 'mobile');
      });
    },
  );

  it('サイドバー開閉トグルは mobile で隠れ、md 以上でだけ表示される', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/sidebar-toggle', viewportPresets.mobile);
      const [mobileToggle] = await session.measure('[data-hh-sidebar-toggle]', ['display']);
      const [mobileSidebar] = await session.measure('.hh-shell__sidebar', ['display']);

      expect(mobileToggle?.styles.display).toBe('none');
      expect(mobileSidebar?.styles.display).toBe('none');

      await session.setViewport(viewportPresets.tablet);
      const [desktopToggle] = await session.measure('[data-hh-sidebar-toggle]', ['display']);
      const [desktopSidebar] = await session.measure('.hh-shell__sidebar', ['display']);

      expect(desktopToggle?.styles.display).toBe('inline-flex');
      expect(desktopSidebar?.styles.display).not.toBe('none');
    });
  });

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

  it('StageBoard は 768px で picker + 1 工程、1280px で 1 行 7 工程を横 overflow なしに表示する', async () => {
    await withBrowserSession({ routes }, async (session) => {
      await session.goto('/stage-board', viewportPresets.tablet);

      const [tabletPicker] = await session.measure('[data-hh-stage-picker]', ['display']);
      const tabletColumns = await session.measure('[data-hh-stage-column]', ['display']);
      expect(tabletPicker?.styles.display).not.toBe('none');
      expect(tabletColumns.filter((column) => column.styles.display !== 'none')).toHaveLength(1);
      expect((await session.documentMetrics()).overflowsHorizontally).toBe(false);

      await session.setViewport(viewportPresets.desktop);

      const [desktopPicker] = await session.measure('[data-hh-stage-picker]', ['display']);
      const [desktopGrid] = await session.measure('[data-hh-stage-columns]', ['grid-template-columns']);
      const desktopColumns = await session.measure('[data-hh-stage-column]', ['display']);
      const trackCount = (desktopGrid?.styles['grid-template-columns'] ?? '').split(/\s+/).filter(Boolean).length;
      expect(desktopPicker?.styles.display).toBe('none');
      expect(desktopColumns.filter((column) => column.styles.display !== 'none')).toHaveLength(7);
      expect(trackCount).toBe(7);
      expect((await session.documentMetrics()).overflowsHorizontally).toBe(false);
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
