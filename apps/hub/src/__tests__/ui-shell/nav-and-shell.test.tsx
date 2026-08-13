// @vitest-environment jsdom
/**
 * UIS-*: 共通シェル (frontend-spec §3.0 / §6.2) の hub 側配線。
 *
 * packages/ui 側の部品単体は packages/ui/src/shell/shell.test.tsx が見ている。
 * ここで固定するのは **hub にしか無い判断**、すなわち
 *  - 並べた導線が実在する route を指しているか (押したら 404 にならないか)
 *  - 現在地の強調が middleware 由来の pathname と噛み合うか
 *  - シェルを被せた状態で axe 違反が出ないか
 * の 3 点。
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UiProvider } from '@harness-hub/ui';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// next/font はビルド時にフォントを取得する仕組みで、テストプロセスでは動かない。
// シェルの配線を見たいだけなので、CSS 変数名だけを返す薄い偽物へ差し替える。
vi.mock('next/font/google', () => ({
  JetBrains_Mono: () => ({ variable: 'hh-test-font-mono', className: 'hh-test-font-mono-class' }),
  IBM_Plex_Sans: () => ({
    variable: 'hh-test-font',
    className: 'hh-test-font-class',
  }),
}));

const { HubShell } = await import('../../components/shell/hub-shell.js');
const navItems = await import('../../components/shell/nav-items.js');
const routeTitles = await import('../../components/shell/route-titles.js');

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app');
const SCOPE = { tenantId: 'tenant-a', workspaceId: 'ws-1' } as const;

/** href から route の実体 (page.tsx) の在処を求める。route group 名は URL に出ないため両方を探す。 */
function pageExists(href: string): boolean {
  const pathname = (href.split('?')[0] ?? '').split('#')[0] ?? '';
  const segments = pathname.split('/').filter((segment) => segment !== '');
  return ['(dashboard)', '(workspace)', ''].some((group) =>
    existsSync(path.join(APP_DIR, group, ...segments, 'page.tsx')),
  );
}

function mount(node: ReactNode): void {
  const html = renderToStaticMarkup(
    <html lang="ja">
      <body>{node}</body>
    </html>,
  );
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');
  const title = parsed.createElement('title');
  title.textContent = 'Harness Hub';
  parsed.head.appendChild(title);
  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

function renderShell(currentHref?: string): void {
  mount(
    <UiProvider>
      <HubShell
        scope={SCOPE}
        accountName="user-1"
        accountRole="workspace-admin"
        {...(currentHref === undefined ? {} : { currentHref })}
      >
        <h1>本文の見出し</h1>
      </HubShell>
    </UiProvider>,
  );
}

describe('UIS-NAV: 導線の定義', () => {
  it('UIS-NAV-000: 業務シェルの全 route を現在地タイトルへ決定論的に解決する', () => {
    const cases = [
      ['/dashboard', 'ホーム'],
      ['/catalog', '業務ツール'],
      ['/catalog/publish', 'Skill を公開する'],
      ['/catalog/releases', 'リリース履歴'],
      ['/catalog/tool-1', '業務ツール詳細'],
      ['/builds', '構築パイプライン'],
      ['/docs', 'ドキュメント'],
      ['/docs/new', 'ドキュメントを作成'],
      ['/docs/doc-1', 'ドキュメント詳細'],
      ['/docs/doc-1/edit', 'ドキュメントを編集'],
      ['/feedback', '改善要望フィードバック'],
      ['/feedback/new', '改善要望を報告'],
      ['/feedback/fb-1', 'フィードバック詳細'],
      ['/metrics', '効果測定ダッシュボード'],
      ['/metrics/usage', '使用状況・削減効果'],
      ['/sheets', 'ヒアリングシート'],
      ['/sheets/new', '業務の困りごとを登録'],
      ['/sheets/hs-1', 'ヒアリングシート詳細'],
      ['/users', 'ユーザー管理'],
      ['/users/user-1', 'ユーザー詳細'],
      ['/settings/account', 'アカウント設定'],
      ['/settings/auth', '認証設定 — 顧客所有 Google OAuth'],
      ['/settings/coefficients', '見積係数設定'],
      ['/settings/notion', 'Notion連携'],
      ['/legal', '利用規約・プライバシーポリシー'],
    ] as const;

    for (const [href, expected] of cases) {
      expect(routeTitles.resolveShellScreenTitle(`${href}?tenant=t1#section`)).toBe(expected);
    }
    expect(routeTitles.resolveShellScreenTitle('/unknown')).toBeUndefined();
  });

  it('UIS-NAV-001: scope はクエリへ引き継がれ、空の値は載せない', () => {
    expect(navItems.scopedHref('/sheets', SCOPE, true)).toBe('/sheets?tenant=tenant-a&workspace=ws-1');
    expect(navItems.scopedHref('/users', SCOPE, false)).toBe('/users?tenant=tenant-a');
    expect(navItems.scopedHref('/sheets', { tenantId: '', workspaceId: '' }, true)).toBe('/sheets');
  });

  it('UIS-NAV-002: モバイルのボトムタブは主要 4 枠に収まる (§6.2)', () => {
    expect(navItems.primaryNavItems(SCOPE)).toHaveLength(4);
  });

  it('UIS-NAV-003: サイドバーはホーム + 主要 + 分析 + 管理をこの順で並べる', () => {
    const sidebar = navItems.sidebarNavItems(SCOPE, 'provider-admin').map((item) => item.label);
    expect(sidebar).toStrictEqual([
      'ホーム',
      ...navItems.primaryNavItems(SCOPE).map((item) => item.label),
      ...navItems.insightNavItems(SCOPE).map((item) => item.label),
      ...navItems.secondaryNavItems(SCOPE, 'provider-admin').map((item) => item.label),
    ]);
  });

  it('UIS-NAV-004: 並べた導線はすべて実在する route を指す (押したら 404 を作らない)', () => {
    const hrefs = [
      ...navItems.sidebarNavItems(SCOPE, 'provider-admin').map((item) => item.href),
      ...navItems.accountMenuLinks(SCOPE, 'provider-admin').map((link) => link.href),
      ...navItems.footerLinks.map((link) => link.href),
      navItems.notificationsHref(SCOPE),
      // 検索欄の行き先も導線の一種。画面ごとに変わるので、全導線から引ける行き先を集める
      ...navItems
        .sidebarNavItems(SCOPE, 'provider-admin')
        .map((item) => navItems.headerSearch(SCOPE, item.href)?.action)
        .filter((href): href is string => href !== undefined),
    ];

    expect(hrefs.filter((href) => !pageExists(href))).toStrictEqual([]);
  });

  it('UIS-NAV-005: 通知ベルの飛び先はアカウント設定に実在する見出し id を指す', () => {
    const href = navItems.notificationsHref(SCOPE);
    const anchor = href.split('#')[1];

    expect(anchor).toBe('notification-settings-heading');
    // 対応する見出しが実装側にあることまで見ないと、リンクだけ生き残って飛び先が消える事故を拾えない
    const source = readAccountSettings();
    expect(source).toContain(`id="${anchor}"`);
  });

  it('UIS-NAV-006: ヘッダー検索は scope を hidden field で引き継ぐ', () => {
    expect(navItems.searchHiddenFields(SCOPE)).toStrictEqual({
      tenant: 'tenant-a',
      workspace: 'ws-1',
    });
    expect(navItems.searchHiddenFields({ tenantId: '', workspaceId: '' })).toStrictEqual({});
  });

  it('UIS-NAV-006b: ヘッダー検索はいま見ている領域を探す (行き先・見出し語・例示がずれない)', () => {
    const sheets = navItems.headerSearch(SCOPE, '/sheets?tenant=tenant-a');
    expect(sheets?.action).toBe('/sheets');
    expect(sheets?.label).toContain('ヒアリングシート');
    expect(sheets?.placeholder).toContain('HS コード');

    // 詳細画面でも同じ領域を探せる
    expect(navItems.headerSearch(SCOPE, '/sheets/hs-001')?.action).toBe('/sheets');

    const catalog = navItems.headerSearch(SCOPE, '/catalog');
    expect(catalog?.action).toBe('/catalog');
    expect(catalog?.label).toContain('業務ツール');

    const docs = navItems.headerSearch(SCOPE, '/docs');
    expect(docs?.action).toBe('/docs');
    expect(docs?.label).toContain('ドキュメント');
    // 例示は実際の検索対象と揃える。本文まで当たると読めるとズレる (対象はタイトルのみ)
    expect(docs?.placeholder).toContain('タイトル');

    const feedback = navItems.headerSearch(SCOPE, '/feedback');
    expect(feedback?.action).toBe('/feedback');
    expect(feedback?.label).toContain('改善要望');
    expect(feedback?.placeholder).toContain('受付番号');

    const users = navItems.headerSearch(SCOPE, '/users');
    expect(users?.action).toBe('/users');
    expect(users?.label).toContain('利用者');
    expect(users?.placeholder).toContain('氏名');
  });

  it('UIS-NAV-006c: 探す対象を持たない画面ではヘッダー検索を出さない', () => {
    // 一覧そのものが無い画面 (指標・パイプライン・設定) は null になる。
    // 押しても何も起きない欄は、無い欄より悪い (壊れていると読まれる)
    for (const href of ['/metrics', '/builds', '/settings/account']) {
      expect(navItems.headerSearch(SCOPE, href)).toBeNull();
    }
    expect(navItems.headerSearch(SCOPE, undefined)).toBeNull();
  });

  it('UIS-NAV-006d: 検索欄を出す画面は、その一覧が実際に `q` を受け取れる', () => {
    // 「押しても何も起きない欄を作らない」を、宣言ではなく実装との対応で確かめる。
    // これは繋がりの検査であって振る舞いの検査ではない (各一覧の挙動は各画面のテストが見る)。
    // ここが守るのは片側だけの改修 — 一覧から絞り込みを外してもヘッダーは検索欄を出し続ける、を防ぐ。
    // APP_DIR (= apps/hub/src/app) からの相対
    const listSources: Readonly<Record<string, string>> = {
      '/sheets': '(dashboard)/sheets/hearing-sheet-list.tsx',
      '/catalog': '../components/catalog/CatalogList.tsx',
      '/docs': '(dashboard)/docs/document-list.tsx',
      '/feedback': '(dashboard)/feedback/feedback-list.tsx',
      '/users': '(dashboard)/users/user-list.tsx',
    };
    for (const [href, relative] of Object.entries(listSources)) {
      const search = navItems.headerSearch(SCOPE, href);
      expect(search, `${href} にヘッダー検索が無い`).not.toBeNull();
      const file = path.join(APP_DIR, relative);
      expect(existsSync(file), `${relative} が見つからない (移動したらこの表も直す)`).toBe(true);
      const source = readFileSync(file, 'utf8');
      // 組立て方は画面ごとに違う (URLSearchParams.set か、オブジェクトリテラルのキー)
      expect(source, `${relative} が q を送っていない`).toMatch(/set\('q'|\bq: /);
    }
  });

  it('UIS-NAV-007: member と role 未確定時は管理者専用の導線を DOM へ渡さない', () => {
    expect(navItems.secondaryNavItems(SCOPE, null).map((item) => item.label)).toStrictEqual(['アカウント設定']);
    expect(navItems.secondaryNavItems(SCOPE, 'member').map((item) => item.label)).toStrictEqual([
      'アカウント設定',
      'Notion連携',
    ]);
    for (const role of [null, 'member'] as const) {
      expect(navItems.accountMenuLinks(SCOPE, role).map((item) => item.label)).toStrictEqual([
        'アカウント設定',
        '利用規約・プライバシーポリシー',
      ]);
    }
  });

  it('UIS-NAV-008: workspace-admin と provider-admin の管理導線を API 認可と揃える', () => {
    expect(navItems.secondaryNavItems(SCOPE, 'workspace-admin').map((item) => item.label)).toStrictEqual([
      'ユーザー管理',
      'アカウント設定',
      '見積係数設定',
      'Notion連携',
    ]);
    expect(navItems.secondaryNavItems(SCOPE, 'provider-admin').map((item) => item.label)).toStrictEqual([
      'ユーザー管理',
      'アカウント設定',
      '認証設定',
      '見積係数設定',
      'Notion連携',
    ]);
  });
});

function readAccountSettings(): string {
  return readFileSync(path.join(APP_DIR, '(dashboard)/settings/account/account-settings.tsx'), 'utf8');
}

describe('UIS-SHELL: HubShell の描画', () => {
  it('UIS-SHELL-001: サイドバー・ヘッダー・フッター・ボトムタブがすべて載る', () => {
    renderShell('/sheets');

    expect(document.querySelector('nav[aria-label="主要ナビゲーション"]')).not.toBeNull();
    expect(document.querySelector('form[aria-label="ヒアリングシートを検索"]')).not.toBeNull();
    expect(document.querySelector('nav[aria-label="フッター情報"]')).not.toBeNull();
    expect(document.querySelector('nav[aria-label="画面切替"]')).not.toBeNull();
  });

  it('UIS-SHELL-002: 現在地が aria-current="page" で 1 か所だけ示される', () => {
    renderShell('/sheets');

    const sidebar = document.querySelector('nav[aria-label="主要ナビゲーション"]');
    const current = sidebar?.querySelectorAll('[aria-current="page"]') ?? [];

    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain('ヒアリングシート');
  });

  it('UIS-SHELL-003: 詳細画面でも親の導線が現在地になる (/sheets/hs-1 -> ヒアリングシート)', () => {
    renderShell('/sheets/hs-1');

    const sidebar = document.querySelector('nav[aria-label="主要ナビゲーション"]');
    expect(sidebar?.querySelector('[aria-current="page"]')?.textContent).toContain('ヒアリングシート');
  });

  it('UIS-SHELL-004: pathname が取れないときは現在地を強調しない (誤った現在地を出さない)', () => {
    renderShell(undefined);

    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });

  it('UIS-SHELL-005: 役割はアバターメニューに表示名で出る (qa-005)', () => {
    renderShell('/sheets');

    expect(document.body.textContent).toContain('ワークスペース管理者');
  });

  it('UIS-SHELL-006: 現在地から全幅ヘッダーの画面名を補う (§6.2)', () => {
    renderShell('/sheets/hs-1');

    const header = document.querySelector('header');
    expect(header?.querySelector('[data-hh-screen-title]')?.textContent).toBe('ヒアリングシート詳細');
  });

  it('UIS-SHELL-006b: 入れ子 route は最も具体的な現在地タイトルを出す', () => {
    renderShell('/metrics/usage');

    const title = document.querySelector('[data-hh-screen-title]');
    expect(title?.textContent).toBe('使用状況・削減効果');
    expect(title?.textContent).not.toBe('ダッシュボード');
  });

  it('UIS-SHELL-007: サインアウトは既存の NextAuth route を指す', () => {
    renderShell('/sheets');

    expect(document.querySelector('a[href="/api/auth/signout"]')).not.toBeNull();
  });

  it('UIS-SHELL-008: シェルを被せた状態で axe 違反が 0 件', async () => {
    renderShell('/sheets');

    const results = await axe.run(document, { resultTypes: ['violations'] });

    expect(results.violations.map((violation) => violation.id)).toStrictEqual([]);
  });
});
