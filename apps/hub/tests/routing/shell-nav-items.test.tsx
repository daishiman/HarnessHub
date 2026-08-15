/**
 * TID-PNAV-01〜06: 共通シェルのナビゲーション導線 (`nav-items.ts`) の href 生成契約。
 *
 * ログイン後の着地先 (`/dashboard`、URL クエリなし) から URL 直打ち以外で他画面へ
 * 遷移できない状態を防ぐのがこのテストの目的。守るべき契約は 2 つある。
 *
 * 1. 主要導線が全て 1 本ずつ出ること (リンクが欠けると再びその画面へ到達不能になる)
 * 2. resolveDashboardScope() 由来の scope をクエリへ引き継ぐこと。遷移先の page.tsx は
 *    URL クエリを最優先で読むため、ここで落とすと遷移のたびに scope が失われる
 *
 * とくに `workspace` は「画面ごとに付ける/付けない」が分かれる (tenant 単位の設定系には付けない)。
 * ここが崩れても画面は表示できてしまい気付けないので、リンク単位で固定する。
 *
 * 描画結果ではなく `sidebarNavItems()` の返り値を検証するのは、サイドバーがアイコンを
 * 持つようになった以降、HTML からラベルを取り出す方法が装飾に依存するため。
 * 「導線が壊れた」のか「装飾が増えた」のかを取り違えないよう、契約はデータ側で固定する。
 * (以前は PrimaryNav という別実装の描画結果を見ていたが、リンク定義の正本を
 *  nav-items.ts へ一本化したのに伴いここへ移した)
 */
import { ShellSidebar } from '@harness-hub/ui';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { type ShellScope, sidebarNavItems } from '../../src/components/shell/nav-items.js';
import { DEFAULT_POST_SIGNIN_LANDING } from '../../src/lib/routing/post-signin-landing.js';

function linksOf(tenantId: string, workspaceId: string): ReadonlyMap<string, string> {
  const scope: ShellScope = { tenantId, workspaceId };
  return new Map(sidebarNavItems(scope, 'provider-admin').map((item) => [item.label, item.href]));
}

/** ホーム。「業務」グループの先頭に固定 (ボトムタブの主要 4 枠には含めない)。 */
const HOME_SCOPED = ['ホーム'] as const;
/** scope を引き継ぐ導線 (workspace 単位の画面)。並びは利用頻度順。 */
const WORKSPACE_SCOPED = ['ヒアリングシート', '業務ツール', 'ドキュメント', '改善要望'] as const;
/** 分析系 (S09/S13/S16)。集計対象が workspace 単位なので workspace も引き継ぐ。 */
const INSIGHT_SCOPED = ['ダッシュボード', 'パイプライン', '使用状況・削減効果'] as const;
/** tenant 単位の画面。workspace を付けると「その workspace 限定の設定」と誤読される。 */
const TENANT_SCOPED = ['ユーザー管理', 'アカウント設定', '認証設定', '見積係数設定'] as const;
/** 管理カテゴリに置くが、設定の所有範囲は workspace。 */
const WORKSPACE_SETTINGS = ['Notion連携'] as const;
/** 製品全体の傾向 (配色の採用状況)。tenant にも workspace にも属さないので scope を付けない。 */
const PROVIDER_SETTINGS = ['システム'] as const;

describe('TID-PNAV: 共通シェルのナビゲーション href 生成', () => {
  it('TID-PNAV-01: 主要導線を過不足なく 1 本ずつ出す', () => {
    const links = linksOf('tenant-a', 'ws-1');

    expect([...links.keys()]).toEqual([
      ...HOME_SCOPED,
      ...WORKSPACE_SCOPED,
      ...INSIGHT_SCOPED,
      ...TENANT_SCOPED,
      ...WORKSPACE_SETTINGS,
      ...PROVIDER_SETTINGS,
    ]);
  });

  it('TID-PNAV-01b: 分析系の導線も workspace まで引き継ぐ (集計範囲が workspace 単位のため)', () => {
    const links = linksOf('tenant-a', 'ws-1');

    expect(links.get('ダッシュボード')).toBe('/metrics?tenant=tenant-a&workspace=ws-1');
    expect(links.get('パイプライン')).toBe('/builds?tenant=tenant-a&workspace=ws-1');
    expect(links.get('使用状況・削減効果')).toBe('/tracking?tenant=tenant-a&workspace=ws-1');
  });

  it('TID-PNAV-01c: 使用状況の導線は完全 label と意味境界の宣言を別々に保つ', () => {
    const item = sidebarNavItems({ tenantId: 'tenant-a', workspaceId: 'ws-1' }, 'provider-admin').find((candidate) =>
      candidate.href.startsWith('/metrics/usage'),
    );

    expect(item?.label).toBe('使用状況・削減効果');
    expect(item?.labelSegments).toEqual(['使用状況・', '削減効果']);
    expect(item?.labelSegments?.join('')).toBe(item?.label);
  });

  it('TID-PNAV-02: workspace 単位の画面へは tenant と workspace の両方を引き継ぐ', () => {
    const links = linksOf('tenant-a', 'ws-1');

    expect(links.get('ホーム')).toBe(`${DEFAULT_POST_SIGNIN_LANDING}?tenant=tenant-a&workspace=ws-1`);
    expect(links.get('ヒアリングシート')).toBe('/sheets?tenant=tenant-a&workspace=ws-1');
    expect(links.get('ドキュメント')).toBe('/docs?tenant=tenant-a&workspace=ws-1');
    expect(links.get('改善要望')).toBe('/feedback?tenant=tenant-a&workspace=ws-1');
    expect(links.get('業務ツール')).toBe('/catalog?tenant=tenant-a&workspace=ws-1');
  });

  it('TID-PNAV-03: tenant 単位の画面へは workspace を付けない', () => {
    const links = linksOf('tenant-a', 'ws-1');

    expect(links.get('ユーザー管理')).toBe('/users?tenant=tenant-a');
    expect(links.get('アカウント設定')).toBe('/settings/account?tenant=tenant-a');
    expect(links.get('認証設定')).toBe('/settings/auth?tenant=tenant-a');
    expect(links.get('見積係数設定')).toBe('/settings/coefficients?tenant=tenant-a');
  });

  it('TID-PNAV-03b: Notion 連携は workspace 共有設定なので両方の scope を引き継ぐ', () => {
    const links = linksOf('tenant-a', 'ws-1');

    expect(links.get('Notion連携')).toBe('/settings/notion?tenant=tenant-a&workspace=ws-1');
  });

  it('TID-PNAV-04: scope 未解決 (両方とも空) -> クエリを付けず素のパスにする', () => {
    // `?tenant=&workspace=` を出すと、遷移先が「空文字の tenant を明示指定された」と読んで
    // session フォールバックへ落ちなくなる。空なら付けない、が正しい。
    const links = linksOf('', '');

    expect(links.get('ホーム')).toBe(DEFAULT_POST_SIGNIN_LANDING);
    expect(links.get('ヒアリングシート')).toBe('/sheets');
    expect(links.get('ユーザー管理')).toBe('/users');
  });

  it('TID-PNAV-05: tenant のみ解決済み (複数 workspace 所属で workspace 未確定) -> tenant だけ引き継ぐ', () => {
    const links = linksOf('tenant-a', '');

    expect(links.get('ホーム')).toBe(`${DEFAULT_POST_SIGNIN_LANDING}?tenant=tenant-a`);
    expect(links.get('ヒアリングシート')).toBe('/sheets?tenant=tenant-a');
    expect(links.get('ユーザー管理')).toBe('/users?tenant=tenant-a');
  });

  it('TID-PNAV-06: 支援技術から辿れるよう landmark に名前を付ける', () => {
    const html = renderToStaticMarkup(
      <ShellSidebar
        items={sidebarNavItems({ tenantId: 'tenant-a', workspaceId: 'ws-1' }, 'provider-admin')}
        label="主要ナビゲーション"
      />,
    );

    expect(html).toMatch(/<nav\b[^>]*aria-label="主要ナビゲーション"/);
  });
});
