// @vitest-environment jsdom
// P06 実行テスト (SYS-DOCS-CMS-P06)
// DOCS-A11Y-*: docs-cms 実画面 (S13-S15 相当) の axe 違反 0 件。
//
// apps/hub/tests/hearing-intake/a11y-screens.test.tsx (HI-A11Y-101〜103) と同型のパターン:
// mountScreen() で SSR し jsdom へ載せ、useEffect が発火する前の初期状態を axe で検査する。

import { UiProvider } from '@harness-hub/ui';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import DocumentDetailPage from '../../src/app/(dashboard)/docs/[id]/page.js';
import DocumentEditPage from '../../src/app/(dashboard)/docs/[id]/edit/page.js';
import { DocumentList } from '../../src/app/(dashboard)/docs/document-list.js';
import DocumentsPage from '../../src/app/(dashboard)/docs/page.js';
import DocumentCreatePage from '../../src/app/(dashboard)/docs/new/page.js';
import { DocumentCreateForm } from '../../src/app/(dashboard)/docs/new/document-create-form.js';

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
    expect(document.querySelector('table')).not.toBeNull();
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
    mountScreen(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" />);
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
});
