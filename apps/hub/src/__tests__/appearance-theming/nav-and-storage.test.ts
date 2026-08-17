// @vitest-environment jsdom

/**
 * 「システム」画面への導線と、端末側の外観控えの検証。
 *
 * 認可の正本は API 側 (`withAuthz`) だが、押せないリンクを出さないための
 * deny-by-default (権限を確認できないときは隠す) が効いているかは画面側で守る。
 */

import { paletteNames } from '@harness-hub/ui';
import { describe, expect, it } from 'vitest';

import { readStoredAppearance, writeStoredAppearance } from '../../components/appearance/appearance-storage.js';
import { secondaryNavItems } from '../../components/shell/nav-items.js';
import { resolveShellScreenTitle } from '../../components/shell/route-titles.js';
import { BASE_ROLES, sessionActionVisible } from '../../lib/authz/index.js';

const SCOPE = { tenantId: 'tenant-a', workspaceId: 'workspace-a' };

function hasSystemLink(role: Parameters<typeof secondaryNavItems>[1]): boolean {
  return secondaryNavItems(SCOPE, role).some((item) => item.href.startsWith('/settings/system'));
}

describe('システム画面の導線', () => {
  it('provider-admin にだけ出す', () => {
    expect(hasSystemLink('provider-admin')).toBe(true);
  });

  it('workspace-admin / member / 未確認には出さない', () => {
    expect(hasSystemLink('workspace-admin')).toBe(false);
    expect(hasSystemLink('member')).toBe(false);
    expect(hasSystemLink(null)).toBe(false);
  });

  it('導線の可否と認可表 (appearance.usage_read) が同じ判断を返す', () => {
    // 総当たりの role 一覧は lib/authz の正本 (BASE_ROLES) から取る。ここへ書き写すと、
    // role が増えたときにテストだけ古い集合を回り続け、「緑だが未検査」になる。
    for (const role of [...BASE_ROLES, null]) {
      expect(hasSystemLink(role)).toBe(sessionActionVisible(role, 'appearance.usage_read'));
    }
  });

  it('リンクはテナントを引き継ぐ', () => {
    const item = secondaryNavItems(SCOPE, 'provider-admin').find((entry) => entry.href.startsWith('/settings/system'));
    expect(item?.href).toBe('/settings/system?tenant=tenant-a');
  });

  it('ヘッダーの現在地タイトルを持つ', () => {
    expect(resolveShellScreenTitle('/settings/system')).toBe('システム');
    expect(resolveShellScreenTitle('/settings/system?tenant=tenant-a')).toBe('システム');
  });
});

describe('端末側の外観控え', () => {
  it('書いた値をそのまま読み戻す', () => {
    writeStoredAppearance({ theme: 'dark', palette: 'navy' });
    expect(readStoredAppearance()).toEqual({ theme: 'dark', palette: 'navy' });
  });

  it('全ての配色を保存できる', () => {
    for (const palette of paletteNames) {
      writeStoredAppearance({ theme: 'auto', palette });
      expect(readStoredAppearance()?.palette).toBe(palette);
    }
  });

  it('壊れた値・知らない配色は既定へ落とす (画面を落とさない)', () => {
    globalThis.localStorage.setItem('hh.appearance', '{壊れた');
    expect(readStoredAppearance()).toBeUndefined();

    globalThis.localStorage.setItem('hh.appearance', JSON.stringify({ theme: 'x', palette: 'sunset' }));
    expect(readStoredAppearance()).toEqual({});
  });

  it('未保存なら undefined を返す', () => {
    globalThis.localStorage.removeItem('hh.appearance');
    expect(readStoredAppearance()).toBeUndefined();
  });
});
