// @vitest-environment jsdom
/**
 * feat-workspace-switch-ux: Workspace 常設切替と scope 未解決の回復導線。
 *
 * 入口側 (`/` の選択と `/signin/workspace` の cookie 受理) は
 * tests/routing/home-workspace-choice.test.ts と workspace-entry.test.ts が既に見ている。
 * ここで固定するのはその後 —— **業務画面に入ったあと**の 3 点:
 *   - 切替 UI を出す条件が「所属 2 件以上」だけであること (受入 1・3)
 *   - 切替が旧 scope の描画を持ち越さない構造であること (受入 4)
 *   - scope 未解決が認可層の語彙ではなく回復導線として現れること (受入 5・6)
 *
 * 受入 4・5 の一部は「描画結果」ではなく**実装の構造**が担保なので、
 * ソースに対する検査で固定する (client 側遷移や router cache は jsdom で再現できない)。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UiProvider } from '@harness-hub/ui';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { workspaceSwitcherOptions } from '../../components/shell/workspace-switcher-items.js';
import { renderDenyNavigationPage } from '../../lib/routing/deny-navigation.js';
import { workspaceEntryPath } from '../../lib/routing/workspace-entry.js';
import {
  WORKSPACE_RECOVERY_ACTION_LABEL,
  WORKSPACE_RECOVERY_HREF,
  workspaceRecoveryNotice,
} from '../../lib/routing/workspace-recovery.js';

// next/font はビルド時にフォントを取得する仕組みで、テストプロセスでは動かない (nav-and-shell と同じ理由)
vi.mock('next/font/google', () => ({
  Noto_Sans_JP: () => ({ variable: 'hh-test-font', className: 'hh-test-font-class' }),
}));

const { HubShell } = await import('../../components/shell/hub-shell.js');
const { ScopeUnresolvedScreen } = await import('../../components/screen-states.js');

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCOPE = { tenantId: 'tenant-a', workspaceId: 'ws-1' } as const;

function render(node: ReactNode): string {
  return renderToStaticMarkup(<UiProvider>{node}</UiProvider>);
}

function shellMarkup(workspaceIds: readonly string[]): string {
  return render(
    <HubShell
      scope={SCOPE}
      accountName="user-1"
      accountRole="member"
      workspaceIds={workspaceIds}
      currentHref="/catalog/releases"
    >
      <p>本文</p>
    </HubShell>,
  );
}

describe('受入 1・3: 切替 UI を出す条件', () => {
  it('所属 1 件では切替 UI を出さず、現在の Workspace を表示だけする', () => {
    const html = shellMarkup(['ws-1']);

    expect(html).not.toContain('data-hh-workspace-switcher');
    // 「今どこにいるか」は切替の有無に関わらず失われない
    expect(html).toContain('ws-1');
  });

  it('所属 0 件 (未認証・検証失敗) でも切替 UI は出ない (fail-closed)', () => {
    expect(shellMarkup([])).not.toContain('data-hh-workspace-switcher');
  });

  it('所属 2 件以上なら共通シェルに切替 UI が常設される', () => {
    const html = shellMarkup(['ws-1', 'ws-2']);

    expect(html).toContain('data-hh-workspace-switcher');
    expect(html).toContain('ワークスペースを切り替える');
    // Switcher 自体に desktop-only が付かないため、< md でも同じ server component を操作できる。
    expect(html).not.toMatch(/hh-shell__desktop-only[^>]*>\s*<div[^>]*data-hh-workspace-switcher/s);
  });

  it('切替先の href は入口 route と同じ組み立てを使う (押して 404 にならない)', () => {
    const options = workspaceSwitcherOptions(['ws-1', 'ws-2'], 'ws-1', '/catalog/releases');

    expect(options.map((option) => option.href)).toEqual([
      workspaceEntryPath('ws-1', '/catalog/releases'),
      workspaceEntryPath('ws-2', '/catalog/releases'),
    ]);
    // 現在地は「選べる候補」ではなく状態として示す
    expect(options.find((option) => option.current)?.label).toBe('ws-1');
  });

  it('現在の Workspace は状態として示し、同じ cookie を書く不要なリンクにしない', () => {
    const html = shellMarkup(['ws-1', 'ws-2']);

    expect(html).toContain('<span aria-current="true"');
    expect(html).not.toContain(`href="${workspaceEntryPath('ws-1', '/catalog/releases')}"`);
    expect(html).toContain(`href="${workspaceEntryPath('ws-2', '/catalog/releases').replaceAll('&', '&amp;')}"`);
  });

  /**
   * 名前が引けた Workspace だけ名前で出す。引けないものを候補から落とすと、
   * 名称未設定の Workspace へ切り替えられなくなり、表示の都合が到達可否になってしまう。
   */
  it('名前が分かる候補は名前で、分からない候補は識別子のまま出す', () => {
    const options = workspaceSwitcherOptions(['ws-1', 'ws-2'], 'ws-1', undefined, { 'ws-1': '営業部' });

    expect(options.map((option) => option.label)).toEqual(['営業部', 'ws-2']);
    expect(options.map((option) => option.isIdentifier)).toEqual([false, true]);
  });

  it('所属 1 件以下では候補そのものを作らない (UI 側の判定と二重化しない)', () => {
    expect(workspaceSwitcherOptions(['ws-1'], 'ws-1')).toEqual([]);
    expect(workspaceSwitcherOptions([], null)).toEqual([]);
  });
});

describe('受入 4: 切替直後に旧 scope の内容を表示しない', () => {
  it('切替先は client router を使わず、server intermediate 経路へ document 遷移する', () => {
    const source = readFileSync(path.resolve(SRC_DIR, '../../../packages/ui/src/shell/WorkspaceSwitcher.tsx'), 'utf8');
    const routeSource = readFileSync(path.resolve(SRC_DIR, 'app/signin/workspace/route.ts'), 'utf8');

    // WorkspaceSwitcher 自体は Server Component のままにし、切替リンクへ next/link を使わない。
    // 開閉だけを担う子 client island は、document 遷移の契約には影響しない。
    expect(source).not.toContain('next/link');
    expect(source.split('\n').map((line) => line.trim())).not.toContain("'use client';");
    // redirect 一発では旧 document が最終応答まで残るため、200 の中間文書を先に返す実装を固定する。
    expect(routeSource).toContain('data-hh-workspace-switch-intermediate');
    expect(routeSource).toContain('http-equiv="refresh"');
    expect(routeSource).toContain('status: 200');
  });
});

describe('受入 5: scope 未解決は 403 の生値ではなく回復導線として出る', () => {
  const REASONS = ['missing_tenant_scope', 'ambiguous_scope'] as const;

  it.each(REASONS)('%s の拒否ページに認可層の語彙が漏れない', (reason) => {
    const html = renderDenyNavigationPage(reason);

    expect(html).not.toContain(reason);
    expect(html).not.toContain('403');
    expect(html).toContain(WORKSPACE_RECOVERY_ACTION_LABEL);
    expect(html).toContain(`href="${WORKSPACE_RECOVERY_HREF}"`);
  });

  it('edge の拒否ページと RSC の画面が同じ文言を使う (層ごとに説明が変わらない)', () => {
    const notice = workspaceRecoveryNotice('unresolved');
    const edge = renderDenyNavigationPage('missing_tenant_scope');
    const rsc = render(<ScopeUnresolvedScreen />);

    for (const html of [edge, rsc]) {
      expect(html).toContain(notice.title);
      expect(html).toContain(notice.description);
    }
  });

  it('食い違い (ambiguous_scope) は「まだ選んでいない」と別の説明にする', () => {
    const unresolved = workspaceRecoveryNotice('unresolved');
    const conflicting = workspaceRecoveryNotice('conflicting');

    expect(conflicting.title).not.toBe(unresolved.title);
    expect(conflicting.description).not.toBe(unresolved.description);
    // 原因は違っても「選び直せば直る」ことは同じなので、行き先と行動は揃える
    expect(conflicting.actionHref).toBe(unresolved.actionHref);
    expect(conflicting.actionLabel).toBe(unresolved.actionLabel);
  });

  it('権限不足の画面と混ざらない (管理者へ依頼させない)', () => {
    const html = render(<ScopeUnresolvedScreen />);

    expect(html).not.toContain('権限の付与を依頼');
    expect(html).toContain(WORKSPACE_RECOVERY_ACTION_LABEL);
  });
});

describe('受入 6: qa-118 契約の非退行', () => {
  it('scope 未解決の画面は ErrorState だけで、旧 scope のデータを描かない', () => {
    const source = readFileSync(path.resolve(SRC_DIR, 'components/screen-states.tsx'), 'utf8');
    const html = render(<ScopeUnresolvedScreen reason="conflicting" />);

    // children を受け取らない = 呼び出し側が旧データを差し込む余地が構造的に無い
    expect(source).not.toMatch(/ScopeUnresolvedScreenProps\s*\{[^}]*children/s);
    expect(html).toContain('role="alert"');
  });
});
