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
import { describe, expect, it, vi } from 'vitest';

import {
  ActionLink,
  Button,
  breakpointTokens,
  buildShellCss,
  Card,
  HistoryNavigation,
  isCurrentNav,
  isResolvedCurrentNav,
  MobileTabBar,
  mediaUp,
  mobileTabPrimarySlots,
  Panel,
  resolveCurrentNavTarget,
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

describe('resolveCurrentNavTarget', () => {
  const items = [
    { href: '/metrics', label: 'ダッシュボード', icon: 'dashboard' },
    { href: '/metrics/usage', label: '使用状況', icon: 'tracking' },
    { href: '/sheets', label: 'シート', icon: 'sheet' },
  ] as const satisfies readonly ShellNavItem[];

  it('入れ子パスでは最も長い一致だけを現在地にする', () => {
    expect(resolveCurrentNavTarget(items, '/metrics/usage')).toBe('/metrics/usage');
    expect(isResolvedCurrentNav(items[0], '/metrics/usage')).toBe(false);
    expect(isResolvedCurrentNav(items[1], '/metrics/usage')).toBe(true);
  });

  it('祖先だけのパスでは祖先を現在地にする', () => {
    expect(resolveCurrentNavTarget(items, '/metrics')).toBe('/metrics');
    expect(isResolvedCurrentNav(items[0], '/metrics')).toBe(true);
    expect(isResolvedCurrentNav(items[1], '/metrics')).toBe(false);
  });
});

describe('ShellSidebar', () => {
  it('現在地のリンクにだけ aria-current を付ける', () => {
    renderWithUi(<ShellSidebar items={navItems} currentHref="/sheets/abc" label="主要ナビゲーション" />);

    expect(screen.getByRole('link', { name: /シート/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /ダッシュボード/ }).getAttribute('aria-current')).toBeNull();
  });

  it('入れ子の nav があるとき祖先と子孫の両方を現在地にしない', () => {
    renderWithUi(
      <ShellSidebar
        items={[
          { href: '/metrics', label: '分析ダッシュボード', icon: 'dashboard' },
          { href: '/metrics/usage', label: '使用状況', icon: 'tracking' },
        ]}
        currentHref="/metrics/usage"
        label="分析"
      />,
    );

    expect(screen.getByRole('link', { name: /使用状況/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /分析ダッシュボード/ }).getAttribute('aria-current')).toBeNull();
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

  it('別メニューを開くと前を閉じ、Escape は開閉元へフォーカスを戻す', async () => {
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

    const workspaceSummary = screen.getByLabelText('ワークスペースを切り替える');
    const workspaceDetails = workspaceSummary.closest('details');
    const accountSummary = screen.getByLabelText('アカウントメニュー');
    const accountDetails = accountSummary.closest('details');

    await user.click(workspaceSummary);
    expect(workspaceDetails?.open).toBe(true);

    await user.click(accountSummary);
    expect(workspaceDetails?.open).toBe(false);
    expect(accountDetails?.open).toBe(true);
    expect(document.activeElement).toBe(accountSummary);

    await user.keyboard('{Escape}');
    expect(accountDetails?.open).toBe(false);
    expect(document.activeElement).toBe(accountSummary);
  });

  it('外側をクリックすると閉じ、クリック先からフォーカスを奪わない', async () => {
    const user = userEvent.setup();
    renderWithUi(<ShellHeader {...headerProps} />);

    const summary = screen.getByLabelText('アカウントメニュー');
    const details = summary.closest('details');
    const search = screen.getByRole('searchbox');

    await user.click(summary);
    expect(details?.open).toBe(true);

    await user.click(search);
    expect(details?.open).toBe(false);
    expect(document.activeElement).toBe(search);
  });

  it('画面タイトルを全幅で出し、長い文字列はヘッダー内で省略できる', () => {
    const { container } = renderWithUi(<ShellHeader {...headerProps} screenTitle="ヒアリングシート" />);

    const title = screen.getByText('ヒアリングシート');
    expect(title.hasAttribute('data-hh-screen-title')).toBe(true);
    expect(title.classList.contains('hh-shell__mobile-only')).toBe(false);
    expect(Number.parseFloat(title.style.minWidth)).toBe(0);
    expect(title.style.textOverflow).toBe('ellipsis');
    expect(container.querySelector('[data-hh-screen-title]')).toBe(title);
  });

  it('履歴ナビゲーションを server-first ヘッダーの slot に差し込める', () => {
    renderWithUi(<ShellHeader {...headerProps} historyNavigation={<HistoryNavigation />} />);

    const header = screen.getByRole('banner');
    expect(within(header).getByRole('navigation', { name: 'ページ履歴' })).toBeDefined();
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

  it('WorkspaceSwitcher は desktop-only に閉じず、モバイルでも同じ UI を使う', () => {
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

describe('HistoryNavigation', () => {
  it('戻る/進むを常時操作可能な 44px Graphite ボタンで提供する', () => {
    renderWithUi(<HistoryNavigation />);

    const navigation = screen.getByRole('navigation', { name: 'ページ履歴' });
    const back = within(navigation).getByRole('button', { name: '戻る' });
    const forward = within(navigation).getByRole('button', { name: '進む' });

    expect(back.getAttribute('title')).toBe('戻る');
    expect(forward.getAttribute('title')).toBe('進む');
    expect(back.getAttribute('disabled')).toBeNull();
    expect(forward.getAttribute('disabled')).toBeNull();
    expect(back.className).toBe('hh-shell__history-button');
    const shellCss = buildShellCss();
    expect(shellCss).toContain('min-width: var(--hh-control-height)');
    expect(shellCss).toContain('min-height: var(--hh-control-height)');
    expect(shellCss).toContain('color: var(--hh-color-primary)');
    expect(back.querySelector('[data-icon="arrowLeft"]')).not.toBeNull();
    expect(forward.querySelector('[data-icon="arrowRight"]')).not.toBeNull();
  });

  it('window.history の戻る/進むだけを client island から呼ぶ', async () => {
    const user = userEvent.setup();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const forward = vi.spyOn(window.history, 'forward').mockImplementation(() => undefined);
    renderWithUi(<HistoryNavigation />);

    await user.click(screen.getByRole('button', { name: '戻る' }));
    await user.click(screen.getByRole('button', { name: '進む' }));

    expect(back).toHaveBeenCalledOnce();
    expect(forward).toHaveBeenCalledOnce();
    back.mockRestore();
    forward.mockRestore();
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

  it('その他シートは details の標準操作で開閉する', async () => {
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

  it('その他シートも外側クリックと Escape の共通規則に従う', async () => {
    const user = userEvent.setup();
    renderWithUi(
      <div>
        <button type="button">別の設定</button>
        <MobileTabBar items={navItems.slice(0, 4)} moreItems={[navItems[4] as ShellNavItem]} label="ボトムタブ" />
      </div>,
    );

    const summary = screen.getByRole('navigation', { name: 'ボトムタブ' }).querySelector('summary') as HTMLElement;
    const details = summary.closest('details');

    await user.click(summary);
    await user.keyboard('{Escape}');
    expect(details?.open).toBe(false);
    expect(document.activeElement).toBe(summary);

    await user.click(summary);
    const outsideButton = screen.getByRole('button', { name: '別の設定' });
    await user.click(outsideButton);
    expect(details?.open).toBe(false);
    expect(document.activeElement).toBe(outsideButton);
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

  it('ActionLink は明示時だけ別タブを安全に開く', () => {
    renderWithUi(
      <>
        <ActionLink href="/device" openInNewTab>
          Device 承認
        </ActionLink>
        <ActionLink href="/sheets/new">新規作成</ActionLink>
      </>,
    );

    const externalFlow = screen.getByRole('link', { name: 'Device 承認' });
    expect(externalFlow.getAttribute('target')).toBe('_blank');
    expect(externalFlow.getAttribute('rel')).toBe('noopener noreferrer');

    const sameTab = screen.getByRole('link', { name: '新規作成' });
    expect(sameTab.getAttribute('target')).toBeNull();
    expect(sameTab.getAttribute('rel')).toBeNull();
  });

  it('ActionLink と Button は同じ variant なら見た目が完全に一致する', () => {
    // 「押せるもの」の形は 1 か所 (internal/style の actionBaseStyle) が決める。
    // 片方だけを直せる状態に戻すと、リンク型ボタンだけ角丸や太さがずれる。
    renderWithUi(
      <>
        <ActionLink href="/sheets/new" variant="primary">
          新規作成
        </ActionLink>
        <Button variant="primary">保存</Button>
      </>,
    );

    const link = screen.getByRole('link', { name: '新規作成' }) as HTMLAnchorElement;
    const button = screen.getByRole('button', { name: '保存' }) as HTMLButtonElement;

    for (const property of ['border-radius', 'font-weight', 'min-height', 'padding', 'background', 'color', 'border']) {
      expect(link.style.getPropertyValue(property), property).toBe(button.style.getPropertyValue(property));
    }
  });

  it('面の角丸はカード段で統一され、部品ごとにずれない', () => {
    renderWithUi(
      <>
        <Panel title="パネル">本文</Panel>
        <Card title="カード">本文</Card>
      </>,
    );

    const panel = screen.getByRole('heading', { name: 'パネル' }).closest('section');
    const card = screen.getByRole('heading', { name: 'カード' }).closest('section');
    expect(panel?.style.borderRadius).toBe('var(--hh-radius-card)');
    expect(card?.style.borderRadius).toBe('var(--hh-radius-card)');
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
    expect(css).toContain('grid-template-columns: 68px minmax(0, 1fr);');
    expect(css).toContain(`${mediaUp('lg')} {`);
    expect(css).toContain('grid-template-columns: 212px minmax(0, 1fr);');
  });

  it('開閉トグルは mobile で隠し、サイドバーが現れる md 以上でだけ表示する', () => {
    const css = buildShellCss();
    const mobileSelector = '[data-hh-sidebar-toggle] {';
    const desktopRule = `${mediaUp('md')} {\n  [data-hh-sidebar-toggle] {\n    display: inline-flex;\n  }\n}`;
    const mobileRuleIndex = css.indexOf(mobileSelector);

    expect(mobileRuleIndex).toBeGreaterThanOrEqual(0);
    expect(css.slice(mobileRuleIndex, css.indexOf('}', mobileRuleIndex))).toContain('display: none;');
    expect(css).toContain(desktopRule);
    // mobile-first: 既定の非表示を定義した後で md 以上だけ上書きする。
    expect(mobileRuleIndex).toBeLessThan(css.indexOf(desktopRule));
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

  it('mobile は本文塊ごと固定タブ + セーフエリア分の余白を取り、desktop では 0 に戻す', () => {
    const css = buildShellCss();

    // 余白は main と footer に二重掛けせず、両者を包む body へ 1 回だけ置く
    expect(css).toContain('padding-block-end: calc(76px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('.hh-shell__main {\n    overflow-y: auto;');
    expect(css).toContain('.hh-shell__body {\n    padding-block-end: 0;');
  });

  it('md 以上ではアプリ本体を外枠として浮かせ、mobile では全幅に張り付ける', () => {
    const css = buildShellCss();
    const [mobilePart, desktopPart] = css.split(`${mediaUp('md')} {`);

    // 外枠は md 以上でだけ現れる。狭い画面で余白を削らないため
    expect(mobilePart).not.toContain('border-radius: var(--hh-radius-frame)');
    expect(desktopPart).toContain('border-radius: var(--hh-radius-frame);');
    expect(desktopPart).toContain('box-shadow: var(--hh-shadow-frame);');
    // 高さの引き算は変数 1 つに閉じる (本体・body・サイドバーでずれないこと)
    expect(desktopPart).toContain('--hh-shell-frame-inset: var(--hh-space-3);');
    expect(
      [...css.matchAll(/calc\(100vh - var\(--hh-shell-frame-inset\) \* 2\)/g)].length,
      '本体・body・サイドバーの 3 か所が同じ式を使う',
    ).toBe(3);
  });

  it('現在地を色だけで示さない (面の持ち上げ・輪郭・太字も併用する)', () => {
    const css = buildShellCss();

    expect(css).toContain("aria-current='page'");
    expect(css).toContain('font-weight: var(--hh-font-weight-bold)');
    // サイドバー: surface へ持ち上げ + 輪郭。色を失っても形で現在地が読める
    expect(css).toContain('background: var(--hh-color-surface);\n  color: var(--hh-color-text);');
    expect(css).toContain('border: 1px solid var(--hh-color-border);');
    // タブバー: 高さが足りず面の持ち上げが読めないので色 + 太字 + aria-current
    expect(css).toContain(".hh-shell__tabbar .hh-shell__nav-link[aria-current='page'] {");
    expect(css).toContain('color: var(--hh-color-accent);');
  });

  it('影は有限集合の token だけを使い、共通シェルにも直接値を増やさない', () => {
    const css = buildShellCss();

    expect(css).not.toMatch(/box-shadow:\s*0\s/);
    expect(css.match(/box-shadow:\s*var\(--hh-shadow-(?:frame|raised)\)/g)?.length).toBeGreaterThan(0);
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
    ['HistoryNavigation', () => <HistoryNavigation />],
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
