/**
 * 共通シェル (サイドバー・ヘッダー・フッター・ボトムタブ・面部品) の単体テスト。
 *
 * 見た目そのものではなく「仕様が要求している構造」を固定する:
 * 現在地の伝達 (aria-current)、JS 無しで成立する検索・アカウントメニュー、
 * ボトムタブの 5 slot 固定、そして axe 違反 0 件。
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe, { type Result } from 'axe-core';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import {
  ActionLink,
  breakpointTokens,
  buildShellCss,
  isCurrentNav,
  MobileTabBar,
  mediaUp,
  mobileTabPrimarySlots,
  Panel,
  ScreenHeader,
  ShellFooter,
  ShellHeader,
  type ShellNavItem,
  ShellSidebar,
  ToastProvider,
  UiProvider,
} from '../index.js';
import { renderWithUi } from '../test-utils.js';

const navItems: readonly ShellNavItem[] = [
  { href: '/dashboard', label: 'ダッシュボード', icon: 'dashboard' },
  { href: '/sheets', label: 'シート', icon: 'sheet' },
  { href: '/feedback', label: 'フィードバック', icon: 'feedback', badgeCount: 3 },
  { href: '/docs', label: 'ドキュメント', icon: 'docs' },
  { href: '/users', label: 'ユーザー管理', icon: 'users' },
];

const headerProps = {
  workspaceName: '営業ワークスペース',
  workspaceLabel: 'ワークスペース',
  searchAction: '/search',
  searchLabel: '検索',
  searchPlaceholder: 'シートを探す',
  notificationsHref: '/notifications',
  notificationsLabel: '通知',
  unreadLabel: '未読',
  accountName: '山田 太郎',
  accountMenuLabel: 'アカウントメニュー',
  accountLinks: [{ href: '/settings/account', label: 'アカウント設定' }],
  signOutHref: '/signout',
  signOutLabel: 'サインアウト',
} as const;

describe('isCurrentNav', () => {
  it('完全一致と配下パスを現在地とみなす', () => {
    const item: ShellNavItem = { href: '/sheets', label: 'シート', icon: 'sheet' };

    expect(isCurrentNav(item, '/sheets')).toBe(true);
    expect(isCurrentNav(item, '/sheets/abc')).toBe(true);
    expect(isCurrentNav(item, '/sheets/')).toBe(true);
  });

  it('前方一致だけの別パスは現在地にしない', () => {
    const item: ShellNavItem = { href: '/sheets', label: 'シート', icon: 'sheet' };

    expect(isCurrentNav(item, '/sheetsx')).toBe(false);
    expect(isCurrentNav(item, '/docs')).toBe(false);
    expect(isCurrentNav(item, undefined)).toBe(false);
  });

  it('クエリ文字列は判定に影響しない', () => {
    const item: ShellNavItem = { href: '/sheets?tenant=t1', label: 'シート', icon: 'sheet' };

    expect(isCurrentNav(item, '/sheets?workspace=w9')).toBe(true);
  });

  it('ルート項目は配下すべてを飲み込まない', () => {
    const item: ShellNavItem = { href: '/', label: 'ホーム', icon: 'dashboard' };

    expect(isCurrentNav(item, '/')).toBe(true);
    expect(isCurrentNav(item, '/docs')).toBe(false);
  });
});

describe('ShellSidebar', () => {
  it('現在地のリンクにだけ aria-current を付ける', () => {
    renderWithUi(<ShellSidebar items={navItems} currentHref="/sheets/abc" label="主要ナビゲーション" />);

    expect(screen.getByRole('link', { name: /シート/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /ダッシュボード/ }).getAttribute('aria-current')).toBeNull();
  });

  it('件数バッジは 0 より大きいときだけ出す', () => {
    renderWithUi(
      <ShellSidebar
        items={[
          { href: '/a', label: 'A', icon: 'docs', badgeCount: 0 },
          { href: '/b', label: 'B', icon: 'docs', badgeCount: 7 },
        ]}
        label="ナビ"
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'ナビ' });
    expect(within(nav).queryByText('0')).toBeNull();
    expect(within(nav).getByText('7')).toBeDefined();
  });

  it('リンク名は可視テキストに依存しない (md〜lg のアイコンのみ表示でも名前を失わない)', () => {
    renderWithUi(<ShellSidebar items={[{ href: '/a', label: 'ドキュメント', icon: 'docs' }]} label="ナビ" />);

    const link = screen.getByRole('link', { name: 'ドキュメント' });
    // ラベル用の span は CSS で畳まれる。名前は属性側が持っていなければならない
    expect(link.getAttribute('aria-label')).toBe('ドキュメント');
    expect(link.getAttribute('title')).toBe('ドキュメント');
  });

  it('ブランド表示を上部に置ける', () => {
    renderWithUi(<ShellSidebar items={navItems} label="ナビ" brand={<span>Harness Hub</span>} />);

    expect(screen.getByText('Harness Hub')).toBeDefined();
  });
});

describe('ShellHeader', () => {
  it('検索は素の GET フォームで、追加のクエリを hidden で引き継ぐ', () => {
    const { container } = renderWithUi(
      <ShellHeader {...headerProps} searchHiddenFields={{ tenant: 't1', workspace: 'w1' }} />,
    );

    const form = container.querySelector('form');
    expect(form?.getAttribute('method')).toBe('get');
    expect(form?.getAttribute('action')).toBe('/search');
    expect(screen.getByRole('banner').hasAttribute('data-hh-shell-header')).toBe(true);
    expect(container.querySelector('input[type="hidden"][name="tenant"]')?.getAttribute('value')).toBe('t1');
    expect(container.querySelector('input[name="q"]')).not.toBeNull();
  });

  it('検索の行き先が無い画面では検索欄そのものを出さない', () => {
    const { searchAction: _a, searchLabel: _l, searchPlaceholder: _p, ...withoutSearch } = headerProps;
    const { container } = renderWithUi(<ShellHeader {...withoutSearch} />);

    // 空振りする欄を置かない。フォームも入力欄もモバイルの虫眼鏡リンクも消える
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('input[name="q"]')).toBeNull();
    // 通知・アカウントは残る (検索が無いだけで他の入口は変わらない)
    expect(screen.getByRole('link', { name: '通知' })).toBeDefined();
  });

  it('未読があるときだけ通知リンクの読み上げ名に件数を含める', () => {
    const { rerender } = renderWithUi(<ShellHeader {...headerProps} unreadCount={0} />);
    expect(screen.getByRole('link', { name: '通知' })).toBeDefined();

    rerender(
      <UiProvider>
        <ToastProvider>
          <ShellHeader {...headerProps} unreadCount={5} />
        </ToastProvider>
      </UiProvider>,
    );
    expect(screen.getByRole('link', { name: '通知 (5 未読)' })).toBeDefined();
  });

  it('アカウントメニューは開くまで閉じており、役割とサインアウトを持つ', async () => {
    const user = userEvent.setup();
    renderWithUi(<ShellHeader {...headerProps} accountRoleLabel="管理者" />);

    const summary = screen.getByLabelText('アカウントメニュー');
    // details 要素なので開閉状態は DOM の open 属性が正本
    const details = summary.closest('details');
    expect(details?.open).toBe(false);

    await user.click(summary);
    expect(details?.open).toBe(true);
    expect(screen.getByText('管理者')).toBeDefined();
    expect(screen.getByRole('link', { name: 'サインアウト' }).getAttribute('href')).toBe('/signout');
  });

  it('モバイル向けの画面タイトルを出せる', () => {
    renderWithUi(<ShellHeader {...headerProps} screenTitle="ヒアリングシート" />);

    expect(screen.getByText('ヒアリングシート')).toBeDefined();
  });

  it('切替候補が無ければ Workspace は表示だけで、操作の存在を主張しない', () => {
    renderWithUi(<ShellHeader {...headerProps} />);

    expect(screen.queryByLabelText('ワークスペースを切り替える')).toBeNull();
    expect(screen.getByText(headerProps.workspaceName)).toBeDefined();
  });

  it('切替候補があればヘッダーに切替 UI が常設される', async () => {
    const user = userEvent.setup();
    renderWithUi(
      <ShellHeader
        {...headerProps}
        workspaceSwitchLabel="ワークスペースを切り替える"
        workspaceOptions={[
          { href: '/w/ws-1', label: 'ws-1', isIdentifier: false, current: true },
          { href: '/w/ws-2', label: 'ws-2', isIdentifier: false, current: false },
        ]}
      />,
    );

    const summary = screen.getByLabelText('ワークスペースを切り替える');
    const details = summary.closest('details');
    expect(details?.open).toBe(false);

    await user.click(summary);
    expect(details?.open).toBe(true);
    // 現在地は候補ではなく状態として示す
    expect(screen.queryByRole('link', { name: 'ws-1' })).toBeNull();
    expect(screen.getByText('ws-1').getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('link', { name: 'ws-2' }).getAttribute('href')).toBe('/w/ws-2');
  });

  it('現在値と各候補の表示名 provenance を混同しない', () => {
    const { container } = renderWithUi(
      <ShellHeader
        {...headerProps}
        workspaceName="ws-1"
        workspaceNameIsIdentifier
        workspaceSwitchLabel="ワークスペースを切り替える"
        workspaceOptions={[
          { href: '/w/ws-1', label: 'ws-1', isIdentifier: true, current: true },
          { href: '/w/ws-2', label: '企画部', isIdentifier: false, current: false },
          { href: '/w/ws-3', label: 'ws-3', isIdentifier: true, current: false },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: '企画部' }).getAttribute('href')).toBe('/w/ws-2');
    expect(screen.getByRole('link', { name: 'ワークスペース ID: ws-3' }).getAttribute('href')).toBe('/w/ws-3');
    // 切替 summary / link の中に対話型 IdBadge (`details`) を入れない。
    expect(container.querySelector('[data-hh-workspace-switcher] [data-hh-id-badge]')).toBeNull();
  });

  it('WorkspaceSwitcher は desktop-only に閉じず、モバイルでも同じ server-only UI を使う', () => {
    const { container } = renderWithUi(
      <ShellHeader
        {...headerProps}
        workspaceSwitchLabel="ワークスペースを切り替える"
        workspaceOptions={[
          { href: '/w/ws-1', label: 'ws-1', isIdentifier: false, current: true },
          { href: '/w/ws-2', label: 'ws-2', isIdentifier: false, current: false },
        ]}
      />,
    );

    expect(container.querySelector('.hh-shell__desktop-only [data-hh-workspace-switcher]')).toBeNull();
    expect(container.querySelector('[data-hh-workspace-switcher]')).not.toBeNull();
  });

  it('候補 1 件では切替 UI を出さない (選べない選択肢を見せない)', () => {
    renderWithUi(
      <ShellHeader
        {...headerProps}
        workspaceSwitchLabel="ワークスペースを切り替える"
        workspaceOptions={[{ href: '/w/ws-1', label: 'ws-1', isIdentifier: false, current: true }]}
      />,
    );

    expect(screen.queryByLabelText('ワークスペースを切り替える')).toBeNull();
  });
});

describe('ShellFooter', () => {
  it('法的情報のリンクを名前付き nav にまとめる', () => {
    renderWithUi(
      <ShellFooter
        label="フッター情報"
        links={[
          { href: '/legal', label: '利用規約' },
          { href: 'https://example.com', label: '外部', external: true },
        ]}
        note="© 2026 Harness Hub"
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'フッター情報' });
    expect(within(nav).getByRole('link', { name: '利用規約' })).toBeDefined();
    expect(within(nav).getByRole('link', { name: '外部' }).getAttribute('rel')).toBe('noreferrer noopener');
    expect(screen.getByText('© 2026 Harness Hub')).toBeDefined();
  });
});

describe('MobileTabBar', () => {
  it(`主要 slot は ${mobileTabPrimarySlots} 件までで、あふれた分は「その他」へ回す`, () => {
    renderWithUi(<MobileTabBar items={navItems} moreItems={[]} label="ボトムタブ" />);

    const tabbar = screen.getByRole('navigation', { name: 'ボトムタブ' });
    // 直下 (= 常時見えている slot) は 4 件。5 件目 (ユーザー管理) は details の中へ落ちる
    expect(tabbar.querySelectorAll(':scope > a')).toHaveLength(mobileTabPrimarySlots);

    const overflow = screen.getByRole('link', { name: 'ユーザー管理' });
    expect(overflow.closest('details')).not.toBeNull();
  });

  it('その他シートは details の標準開閉で開く (開閉のための JS を全画面へ配らない)', async () => {
    const user = userEvent.setup();
    renderWithUi(
      <MobileTabBar items={navItems.slice(0, 4)} moreItems={[navItems[4] as ShellNavItem]} label="ボトムタブ" />,
    );

    const summary = screen.getByRole('navigation', { name: 'ボトムタブ' }).querySelector('summary') as HTMLElement;
    const details = summary.closest('details');
    expect(details?.open).toBe(false);

    await user.click(summary);
    expect(details?.open).toBe(true);

    await user.click(summary);
    expect(details?.open).toBe(false);
  });

  it('シート内の項目が現在地なら「その他」自身も現在地として示す', () => {
    renderWithUi(
      <MobileTabBar
        items={navItems.slice(0, 4)}
        moreItems={[navItems[4] as ShellNavItem]}
        currentHref="/users/42"
        label="ボトムタブ"
      />,
    );

    const summary = screen.getByRole('navigation', { name: 'ボトムタブ' }).querySelector('summary');
    expect(summary?.getAttribute('aria-label')).toBe('その他');
    expect(summary?.getAttribute('aria-current')).toBe('page');
  });
});

describe('Panel / ScreenHeader / ActionLink', () => {
  it('Panel は見出しと操作を持てる', () => {
    renderWithUi(
      <Panel title="最近のシート" description="直近 7 日" actions={<button type="button">追加</button>}>
        <p>本文</p>
      </Panel>,
    );

    expect(screen.getByRole('heading', { level: 2, name: '最近のシート' })).toBeDefined();
    expect(screen.getByText('直近 7 日')).toBeDefined();
    expect(screen.getByRole('button', { name: '追加' })).toBeDefined();
  });

  it('Panel の見出し階層を指定できる', () => {
    renderWithUi(
      <Panel title="内訳" headingLevel={3} flush>
        <p>本文</p>
      </Panel>,
    );

    expect(screen.getByRole('heading', { level: 3, name: '内訳' })).toBeDefined();
  });

  it('ScreenHeader のパンくずは現在地だけリンクにしない', () => {
    renderWithUi(
      <ScreenHeader
        title="シート詳細"
        description="申請の内容を確認します"
        breadcrumbs={[{ href: '/sheets', label: 'シート' }, { label: 'HS-0001' }]}
        breadcrumbsLabel="現在地"
        actions={
          <ActionLink href="/sheets/new" variant="primary">
            新規作成
          </ActionLink>
        }
      />,
    );

    const crumbs = screen.getByRole('navigation', { name: '現在地' });
    expect(within(crumbs).getByRole('link', { name: 'シート' })).toBeDefined();
    expect(within(crumbs).queryByRole('link', { name: 'HS-0001' })).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'シート詳細' })).toBeDefined();
    expect(screen.getByRole('link', { name: '新規作成' }).getAttribute('href')).toBe('/sheets/new');
  });
});

describe('buildShellCss', () => {
  it('ブレークポイントごとのサイドバー幅を出力する', () => {
    const css = buildShellCss();

    // 既定 (< md) はスマホ。サイドバーは描画せずボトムタブへ寄せる (§6.2)
    expect(css).toContain('.hh-shell__sidebar {\n  display: none;');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr);');
    // md で折りたたみサイドバー、lg で展開
    expect(css).toContain(`${mediaUp('md')} {`);
    expect(css).toContain('grid-template-columns: 64px minmax(0, 1fr);');
    expect(css).toContain(`${mediaUp('lg')} {`);
    expect(css).toContain('grid-template-columns: 220px minmax(0, 1fr);');
  });

  it('閾値は breakpointTokens だけを使い、px を直書きしない (spec §2)', () => {
    const css = buildShellCss();

    // mediaUp() は min-width しか作らない。max-width が現れたら閾値の直書きが復活した合図
    expect(css).not.toContain('max-width:');
    const thresholds = [...css.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => Number(m[1]));
    expect(thresholds.length).toBeGreaterThan(0);
    for (const threshold of thresholds) {
      expect(Object.values(breakpointTokens)).toContain(threshold);
    }
  });

  it('mobile は shell → screen → filter の順に実測 offset を積み、desktop は shell 分を外す', () => {
    const css = buildShellCss();

    expect(css).toContain('--hh-shell-header-offset: var(--hh-shell-header-height, 56px);');
    expect(css).toContain(
      '--hh-screen-header-offset: calc(var(--hh-shell-header-offset) + var(--hh-screen-header-height, 0px));',
    );
    expect(css).toContain(`${mediaUp('md')} {`);
    expect(css).toContain('--hh-shell-header-offset: 0px;');
  });

  it('mobile footer は通常フローのまま固定タブの余白を取り、desktop は本文外に残す', () => {
    const css = buildShellCss();

    expect(css).toContain('margin-block-end: calc(var(--hh-control-height) + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('.hh-shell__main {\n    overflow-y: auto;');
    expect(css).toContain('.hh-shell__body > footer {\n    margin-block-end: 0;');
  });

  it('現在地を色だけで示さない (太字と縦棒も併用する)', () => {
    const css = buildShellCss();

    expect(css).toContain("aria-current='page'");
    expect(css).toContain('font-weight: var(--hh-font-weight-bold)');
    expect(css).toContain('box-shadow: inset 3px 0 0 0 var(--hh-color-primary)');
  });

  it('「その他」パネルは 5 番目の slot ではなくタブバー全幅を使う', () => {
    const css = buildShellCss();

    expect(css).toContain('.hh-shell__more {\n  position: static;');
    expect(css).toContain('.hh-shell__more-panel {\n  position: absolute;\n  inset-inline: 0;');
  });

  it('色と余白は token 経由でしか書かない', () => {
    const css = buildShellCss();
    const literalColors = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];

    expect(literalColors).toEqual([]);
  });
});

describe('シェルの axe 検査', () => {
  const scenarios: Array<[string, () => ReactNode]> = [
    ['ShellSidebar', () => <ShellSidebar items={navItems} currentHref="/sheets" label="主要ナビゲーション" />],
    ['ShellHeader', () => <ShellHeader {...headerProps} unreadCount={2} accountRoleLabel="管理者" />],
    [
      'ShellHeader + WorkspaceSwitcher',
      () => (
        <ShellHeader
          {...headerProps}
          workspaceSwitchLabel="ワークスペースを切り替える"
          workspaceOptions={[
            { href: '/w/ws-1', label: 'ws-1', isIdentifier: false, current: true },
            { href: '/w/ws-2', label: 'ws-2', isIdentifier: false, current: false },
          ]}
        />
      ),
    ],
    ['ShellFooter', () => <ShellFooter label="フッター情報" links={[{ href: '/legal', label: '利用規約' }]} />],
    ['MobileTabBar', () => <MobileTabBar items={navItems} moreItems={[]} label="ボトムタブ" />],
    [
      'Panel + ScreenHeader',
      () => (
        <>
          <ScreenHeader title="シート一覧" actions={<ActionLink href="/sheets/new">新規作成</ActionLink>} />
          <Panel title="一覧">
            <p>本文</p>
          </Panel>
        </>
      ),
    ],
  ];

  it.each(scenarios)('%s に違反がない', async (_name, build) => {
    const { container } = render(
      <UiProvider>
        <ToastProvider>
          <main>{build()}</main>
        </ToastProvider>
      </UiProvider>,
    );

    const results = await axe.run(container, { resultTypes: ['violations'] });
    const violations = results.violations.map(
      (violation: Result) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(' | ')}`,
    );

    expect(violations).toEqual([]);
  });
});
