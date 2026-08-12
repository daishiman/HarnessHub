// @vitest-environment jsdom
// P06 実行テスト (SYS-DOCS-CMS-P06)
// DOCS-UI-*: docs-cms 実画面の fetch 成功/失敗パスと操作 (絞り込み・ページ送り・保存・作成) を
// apps/hub/src/__tests__/dual-catalog-web/authorization-cache-boundary.test.tsx と同型の
// createRoot + act パターンで検証する。

import type { DocumentDetail, DocumentListResponse } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// route wrapper はbundle分割だけを担うため、保存契約は遅延読込先の実装本体で検証する。
import DocumentEditPage from '../../app/(dashboard)/docs/[id]/edit/document-edit-page.js';
import DocumentDetailPage from '../../app/(dashboard)/docs/[id]/page.js';
import { DocumentList } from '../../app/(dashboard)/docs/document-list.js';
import { DocumentCreateForm } from '../../app/(dashboard)/docs/new/document-create-form.js';

function resolved<T>(value: T): Promise<T> {
  const promise = Promise.resolve(value) as Promise<T> & { status?: string; value?: T };
  promise.status = 'fulfilled';
  promise.value = value;
  return promise;
}

const LIST_RESPONSE: DocumentListResponse = {
  items: [
    {
      id: 'doc-1',
      scope: 'tenant',
      title: '導入ガイド',
      status: 'draft',
      created_by: 'user-1',
      updated_by: 'user-1',
      created_at: 1_700_000_000,
      updated_at: 1_700_000_000,
      category: '運用',
      tags: ['セットアップ'],
      thumbnail_url: null,
      thumbnail_source: 'auto',
      excerpt: '導入手順の要約です。',
      excerpt_source: 'auto',
      asset_summary: { image_count: 1, has_table: false, has_code: true },
    },
  ],
  next_cursor: 'cursor-2',
};

const DOC: DocumentDetail = {
  id: 'doc-1',
  scope: 'tenant',
  title: '導入ガイド',
  body_markdown: '# 導入ガイド\n\n手順。',
  status: 'draft',
  created_by: 'user-1',
  updated_by: 'user-1',
  created_at: 1_700_000_000,
  updated_at: 1_700_000_000,
  category: null,
  tags: null,
  thumbnail_url: null,
  thumbnail_source: 'auto',
  excerpt: null,
  excerpt_source: 'auto',
  asset_summary: null,
};

function jsonResponse(body: unknown, init: { readonly ok?: boolean; readonly status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? (init.ok === false ? 500 : 200),
  });
}

let container: HTMLDivElement;
let root: Root;
let assign: ReturnType<typeof vi.fn>;

async function render(element: ReactElement): Promise<void> {
  await act(async () => {
    root.render(createElement(UiProvider, null, element));
  });
  await flush();
}

async function flush(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.replaceChildren(container);
  root = createRoot(container);
  assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign },
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DOCS-UI: DocumentList の一覧取得と操作', () => {
  it('DOCS-UI-001: 取得成功で行と次へボタンが有効になる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => jsonResponse(LIST_RESPONSE)),
    );
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" />);

    expect(container.textContent).toContain('導入ガイド');
    const nextButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '次へ');
    expect(nextButton?.disabled).toBe(false);
  });

  it('DOCS-UI-002: 絞り込み submit で scope/status を query へ渡し cursor をリセットする', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(LIST_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" />);

    const selects = container.querySelectorAll('select');
    const scopeSelect = selects[0] as HTMLSelectElement;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (valueSetter === undefined) throw new Error('select value setter がありません');
    await act(async () => {
      valueSetter.call(scopeSelect, 'common');
      scopeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form');
    if (form === null) throw new Error('絞り込み form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    const lastCallUrl = fetchMock.mock.calls.at(-1)?.[0] as string;
    expect(lastCallUrl).toContain('scope=common');
    expect(container.textContent).not.toContain('読み込みエラー');
  });

  it('DOCS-UI-010: 次へ/前へでページ送りし cursor 履歴を往復する', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(LIST_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" />);

    const nextButton = () => [...container.querySelectorAll('button')].find((button) => button.textContent === '次へ');
    const previousButton = () =>
      [...container.querySelectorAll('button')].find((button) => button.textContent === '前へ');

    expect(previousButton()?.disabled).toBe(true);
    await act(async () => nextButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();
    expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('cursor=cursor-2');
    expect(previousButton()?.disabled).toBe(false);

    await act(async () => previousButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();
    expect(fetchMock.mock.calls.at(-1)?.[0]).not.toContain('cursor=');
  });

  it('DOCS-UI-003: 取得失敗はエラーバナーを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" />);

    expect(container.textContent).toContain('読み込みエラー');
  });
});

describe('DOCS-UI: DocumentCreateForm の作成', () => {
  it('DOCS-UI-004: 作成成功で作成先ドキュメントへ遷移する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(DOC, { status: 201 })));
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" />);

    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(assign).toHaveBeenCalledWith(expect.stringContaining(`/docs/${DOC.id}`));
  });

  it('DOCS-UI-005: 作成失敗はエラーバナーを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" />);

    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(container.textContent).toContain('作成できませんでした');
  });
});

describe('DOCS-UI: DocumentDetailPage の表示', () => {
  it('DOCS-UI-006: 取得成功で本文と編集ボタンを描画する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(DOC)));
    await render(
      <DocumentDetailPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );

    expect(container.textContent).toContain(DOC.title);
    const editButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '編集する');
    expect(editButton).not.toBeUndefined();
    await act(async () => editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(assign).toHaveBeenCalledWith(expect.stringContaining(`/docs/${DOC.id}/edit`));
  });

  it('DOCS-UI-007: 取得失敗はエラーバナーを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));
    await render(
      <DocumentDetailPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );

    expect(container.textContent).toContain('ドキュメントを取得できませんでした');
  });
});

describe('DOCS-UI: DocumentEditPage の保存', () => {
  it('DOCS-UI-008: 保存成功で詳細画面へ遷移する', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(DOC));
    vi.stubGlobal('fetch', fetchMock);
    await render(
      <DocumentEditPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );
    expect(container.textContent).toContain(DOC.title);

    const saveButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '保存する');
    if (saveButton === undefined) throw new Error('保存ボタンがありません');
    await act(async () => saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();

    expect(assign).toHaveBeenCalledWith(expect.stringContaining(`/docs/${DOC.id}?tenant=`));
  });

  it('DOCS-UI-009: 保存失敗はエラーバナーを表示する', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v1/me/notion-integration') return jsonResponse(null);
      if (url === `/api/v1/docs/${DOC.id}` && init?.method === 'PATCH') {
        return jsonResponse({}, { ok: false, status: 500 });
      }
      return jsonResponse(DOC);
    });
    vi.stubGlobal('fetch', fetchMock);
    await render(
      <DocumentEditPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );

    const saveButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '保存する');
    if (saveButton === undefined) throw new Error('保存ボタンがありません');
    await act(async () => saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();

    expect(container.textContent).toContain('保存できませんでした');
  });

  it('DOCS-UI-011: 初回取得が例外 (通信断) で失敗した場合もエラーバナーを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network error')));
    await render(
      <DocumentEditPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );

    expect(container.textContent).toContain('読み込みエラー');
    expect(container.textContent).toContain('network error');
  });
});
