// @vitest-environment jsdom
// P06 実行テスト (SYS-DOCS-CMS-P06)
// DOCS-A11Y-*: docs-cms 実画面 (S13-S15 相当) の axe 違反 0 件。
//
// apps/hub/tests/hearing-intake/a11y-screens.test.tsx (HI-A11Y-101〜103) と同型のパターン:
// mountScreen() で SSR し jsdom へ載せ、useEffect が発火する前の初期状態を axe で検査する。

import type { SessionRole } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import DocumentEditPage from '../../src/app/(dashboard)/docs/[id]/edit/page.js';
import DocumentDetailPage from '../../src/app/(dashboard)/docs/[id]/page.js';
import { DocumentList } from '../../src/app/(dashboard)/docs/document-list.js';
import { DocumentCreateForm } from '../../src/app/(dashboard)/docs/new/document-create-form.js';
import DocumentCreatePage from '../../src/app/(dashboard)/docs/new/page.js';
import DocumentsPage from '../../src/app/(dashboard)/docs/page.js';

// server page は `resolveDashboardScope` 経由で `cookies()` を無条件に呼ぶ (呼び出し元 page の静的化を防ぐため。
// 理由は src/lib/routing/dashboard-scope.ts のコメント参照)。ここは request scope の外で SSR するので空 cookie を差す。
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

// docs/page.tsx・docs/new/page.tsx は resolveShellIdentity() の role で「新しく作成」導線を出し分ける
// (docs.write_tenant = workspace-admin 以上)。実 cookie は張らないので、ここでは
// role を差し替え可能な identity を差す (既定は workspace-admin = 陽性経路)。
const resolveShellIdentityMock = vi.fn(
  async (): Promise<{
    readonly subject: string;
    readonly displayName: string;
    readonly role: SessionRole;
    readonly workspaceIds: readonly string[];
    readonly workspaceNames: Readonly<Record<string, string>>;
  }> => ({
    subject: 'user-1',
    displayName: 'テスト管理者',
    role: 'workspace-admin',
    workspaceIds: ['ws-1'],
    workspaceNames: {},
  }),
);
vi.mock('../../src/lib/routing/shell-identity.js', () => ({
  resolveShellIdentity: () => resolveShellIdentityMock(),
}));

function mountScreen(node: ReactNode): void {
  const html = renderToStaticMarkup(
    <html lang="ja">
      <body>
        <main>
          <UiProvider>{node}</UiProvider>
        </main>
      </body>
    </html>,
  );
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');

  const title = parsed.createElement('title');
  title.textContent = 'ドキュメント';
  parsed.head.appendChild(title);

  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

async function violationsOf(): Promise<readonly string[]> {
  const results = await axe.run(document, { resultTypes: ['violations'] });
  return results.violations.map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`);
}

/** params/searchParams は Promise だが、`use()` が同期展開できるよう解決済み thenable を渡す。 */
function resolved<T>(value: T): Promise<T> {
  const promise = Promise.resolve(value) as Promise<T> & { status?: string; value?: T };
  promise.status = 'fulfilled';
  promise.value = value;
  return promise;
}

describe('DOCS-A11Y: docs-cms 実画面の初期状態に axe 違反が無い', () => {
  it('DOCS-A11Y-001: ドキュメント一覧 (DocumentList) に axe 違反が 0 件', async () => {
    mountScreen(<DocumentList tenantId="tenant-a" workspaceId="ws-1" />);
    expect(await violationsOf()).toEqual([]);
    // カードで並べる一覧なので、読み込み状態が読み上げに伝わることを確かめる (型の割当は docs/screen-inventory.md)
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toContain('読み込');
    expect(document.querySelector('form[aria-label="ドキュメントの絞り込み"]')).not.toBeNull();
  });

  it('DOCS-A11Y-002: ドキュメント詳細の初期状態 (読み込み中) に axe 違反が 0 件', async () => {
    mountScreen(
      <DocumentDetailPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );
    expect(await violationsOf()).toEqual([]);
    expect(document.body.textContent).toContain('読み込み中');
  });

  it('DOCS-A11Y-003: ドキュメント編集の初期状態 (読み込み中) に axe 違反が 0 件', async () => {
    mountScreen(
      <DocumentEditPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );
    expect(await violationsOf()).toEqual([]);
    expect(document.body.textContent).toContain('読み込み中');
  });

  it('DOCS-A11Y-004: ドキュメント新規作成フォームに axe 違反が 0 件', async () => {
    mountScreen(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={false} />);
    expect(await violationsOf()).toEqual([]);
    expect(document.querySelector('form[aria-label="ドキュメントの新規作成"]')).not.toBeNull();
    expect(document.querySelectorAll('input, textarea')).not.toHaveLength(0);
  });

  it('DOCS-A11Y-005: 一覧ページ (server wrapper) に axe 違反が 0 件で新規作成リンクを持つ', async () => {
    mountScreen(await DocumentsPage({ searchParams: resolved({ tenant: 'tenant-a', workspace: 'ws-1' }) }));
    expect(await violationsOf()).toEqual([]);
    expect(document.querySelector('a[href^="/docs/new"]')).not.toBeNull();
  });

  it('DOCS-A11Y-006: 新規作成ページ (server wrapper) に axe 違反が 0 件', async () => {
    mountScreen(await DocumentCreatePage({ searchParams: resolved({ tenant: 'tenant-a', workspace: 'ws-1' }) }));
    expect(await violationsOf()).toEqual([]);
    expect(document.querySelector('form[aria-label="ドキュメントの新規作成"]')).not.toBeNull();
  });

  it('DOCS-A11Y-007: docs.write_tenant を満たさない role (member) では一覧に作成リンクを出さない (元不具合の権限不足経路)', async () => {
    resolveShellIdentityMock.mockResolvedValueOnce({
      subject: 'user-2',
      displayName: '一般ユーザー',
      role: 'member',
      workspaceIds: ['ws-1'],
      workspaceNames: {},
    });
    mountScreen(await DocumentsPage({ searchParams: resolved({ tenant: 'tenant-a', workspace: 'ws-1' }) }));
    expect(await violationsOf()).toEqual([]);
    expect(document.querySelector('a[href^="/docs/new"]')).toBeNull();
  });

  it('DOCS-A11Y-008: docs.write_tenant を満たさない role (member) では新規作成ページに form を出さず理由を示す', async () => {
    resolveShellIdentityMock.mockResolvedValueOnce({
      subject: 'user-2',
      displayName: '一般ユーザー',
      role: 'member',
      workspaceIds: ['ws-1'],
      workspaceNames: {},
    });
    mountScreen(await DocumentCreatePage({ searchParams: resolved({ tenant: 'tenant-a', workspace: 'ws-1' }) }));
    expect(await violationsOf()).toEqual([]);
    expect(document.querySelector('form[aria-label="ドキュメントの新規作成"]')).toBeNull();
    expect(document.body.textContent).toContain('作成できません');
  });
});
