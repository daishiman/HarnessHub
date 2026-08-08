/**
 * TID-PNAV-01〜06: 共通ナビゲーション `PrimaryNav` の href 生成契約。
 *
 * この画面部品が入る前は、ログイン後の着地先 (`/sheets`、URL クエリなし) から
 * URL 直打ち以外でどの画面へも遷移できなかった。したがってここで守るべき契約は 2 つある。
 *
 * 1. 主要導線が全て 1 本ずつ出ること (リンクが欠けると再びその画面へ到達不能になる)
 * 2. resolveDashboardScope() 由来の scope をクエリへ引き継ぐこと。遷移先の page.tsx は
 *    URL クエリを最優先で読むため、ここで落とすと遷移のたびに scope が失われる
 *
 * とくに `workspace` は「画面ごとに付ける/付けない」が分かれる (tenant 単位の設定系には付けない)。
 * ここが崩れても画面は表示できてしまい気付けないので、リンク単位で固定する。
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PrimaryNav } from '../../src/components/primary-nav.js';

/**
 * 描画結果から href をリンク文言つきで取り出す (テスト側で DOM を組み立てずに済ませる)。
 *
 * 属性は `href` 以外も並ぶ前提で拾う。`<a href="...">` 決め打ちにすると、
 * 見た目 (style や aria-current) が増えただけで href の契約テストが落ち、
 * 「導線が壊れた」のか「装飾が付いた」のか区別できなくなるため。
 */
function renderLinks(tenantId: string, workspaceId: string): ReadonlyMap<string, string> {
  const html = renderToStaticMarkup(<PrimaryNav tenantId={tenantId} workspaceId={workspaceId} />);
  const links = new Map<string, string>();
  for (const match of html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)) {
    const href = /\bhref="([^"]*)"/.exec(match[1] as string)?.[1];
    if (href === undefined) continue;
    links.set(match[2] as string, href.replaceAll('&amp;', '&'));
  }
  return links;
}

/** scope を引き継ぐ導線 (workspace 単位の画面)。 */
const WORKSPACE_SCOPED = ['ヒアリングシート', 'ドキュメント', '改善要望', '業務ツール'] as const;
/** tenant 単位の画面。workspace を付けると「その workspace 限定の設定」と誤読される。 */
const TENANT_SCOPED = ['ユーザー管理', 'アカウント設定', '認証設定', '見積係数設定'] as const;

describe('TID-PNAV: PrimaryNav の href 生成', () => {
  it('TID-PNAV-01: 主要導線を過不足なく 1 本ずつ出す', () => {
    const links = renderLinks('tenant-a', 'ws-1');

    expect([...links.keys()]).toEqual([...WORKSPACE_SCOPED, ...TENANT_SCOPED]);
  });

  it('TID-PNAV-02: workspace 単位の画面へは tenant と workspace の両方を引き継ぐ', () => {
    const links = renderLinks('tenant-a', 'ws-1');

    expect(links.get('ヒアリングシート')).toBe('/sheets?tenant=tenant-a&workspace=ws-1');
    expect(links.get('ドキュメント')).toBe('/docs?tenant=tenant-a&workspace=ws-1');
    expect(links.get('改善要望')).toBe('/feedback?tenant=tenant-a&workspace=ws-1');
    expect(links.get('業務ツール')).toBe('/catalog?tenant=tenant-a&workspace=ws-1');
  });

  it('TID-PNAV-03: tenant 単位の画面へは workspace を付けない', () => {
    const links = renderLinks('tenant-a', 'ws-1');

    expect(links.get('ユーザー管理')).toBe('/users?tenant=tenant-a');
    expect(links.get('アカウント設定')).toBe('/settings/account?tenant=tenant-a');
    expect(links.get('認証設定')).toBe('/settings/auth?tenant=tenant-a');
    expect(links.get('見積係数設定')).toBe('/settings/coefficients?tenant=tenant-a');
  });

  it('TID-PNAV-04: scope 未解決 (両方とも空) -> クエリを付けず素のパスにする', () => {
    // `?tenant=&workspace=` を出すと、遷移先が「空文字の tenant を明示指定された」と読んで
    // session フォールバックへ落ちなくなる。空なら付けない、が正しい。
    const links = renderLinks('', '');

    expect(links.get('ヒアリングシート')).toBe('/sheets');
    expect(links.get('ユーザー管理')).toBe('/users');
  });

  it('TID-PNAV-05: tenant のみ解決済み (複数 workspace 所属で workspace 未確定) -> tenant だけ引き継ぐ', () => {
    const links = renderLinks('tenant-a', '');

    expect(links.get('ヒアリングシート')).toBe('/sheets?tenant=tenant-a');
    expect(links.get('ユーザー管理')).toBe('/users?tenant=tenant-a');
  });

  it('TID-PNAV-06: 支援技術から辿れるよう landmark に名前を付ける', () => {
    const html = renderToStaticMarkup(<PrimaryNav tenantId="tenant-a" workspaceId="ws-1" />);

    expect(html).toMatch(/<nav\b[^>]*aria-label="主要ナビゲーション"/);
  });
});
