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
  Noto_Sans_JP: () => ({
    variable: 'hh-test-font',
    className: 'hh-test-font-class',
  }),
}));

const { HubShell } = await import('../../components/shell/hub-shell.js');
const navItems = await import('../../components/shell/nav-items.js');

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
  it('UIS-NAV-001: scope はクエリへ引き継がれ、空の値は載せない', () => {
    expect(navItems.scopedHref('/sheets', SCOPE, true)).toBe('/sheets?tenant=tenant-a&workspace=ws-1');
    expect(navItems.scopedHref('/users', SCOPE, false)).toBe('/users?tenant=tenant-a');
    expect(navItems.scopedHref('/sheets', { tenantId: '', workspaceId: '' }, true)).toBe('/sheets');
  });

  it('UIS-NAV-002: モバイルのボトムタブは主要 4 枠に収まる (§6.2)', () => {
    expect(navItems.primaryNavItems(SCOPE)).toHaveLength(4);
  });

  it('UIS-NAV-003: サイドバーは主要 + 分析 + 管理をこの順で並べる', () => {
    const sidebar = navItems.sidebarNavItems(SCOPE, 'provider-admin').map((item) => item.label);
    expect(sidebar).toStrictEqual([
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
  });

  it('UIS-NAV-006c: 一覧側が絞り込めない画面ではヘッダー検索を出さない', () => {
    // 一覧 API が `q` を受けない (ドキュメント・改善要望・利用者) と
    // そもそも探す対象が無い画面 (ダッシュボード・設定) は null になる
    for (const href of ['/docs', '/feedback', '/users', '/metrics', '/builds', '/settings/account']) {
      expect(navItems.headerSearch(SCOPE, href)).toBeNull();
    }
    expect(navItems.headerSearch(SCOPE, undefined)).toBeNull();
  });

  it('UIS-NAV-007: member と role 未確定時は管理者専用の導線を DOM へ渡さない', () => {
    for (const role of [null, 'member'] as const) {
      expect(navItems.secondaryNavItems(SCOPE, role).map((item) => item.label)).toStrictEqual(['アカウント設定']);
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
    ]);
    expect(navItems.secondaryNavItems(SCOPE, 'provider-admin').map((item) => item.label)).toStrictEqual([
      'ユーザー管理',
      'アカウント設定',
      '認証設定',
      '見積係数設定',
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

  it('UIS-SHELL-006: 現在地からモバイルヘッダーの画面名を補う (§6.2)', () => {
    renderShell('/sheets/hs-1');

    const header = document.querySelector('header');
    expect(header?.querySelector('.hh-shell__mobile-only')?.textContent).toBe('ヒアリングシート');
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
