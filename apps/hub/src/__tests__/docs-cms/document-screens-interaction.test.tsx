// @vitest-environment jsdom
// P06 実行テスト (SYS-DOCS-CMS-P06)
// DOCS-UI-*: docs-cms 実画面の fetch 成功/失敗パスと操作 (絞り込み・ページ送り・保存・作成) を
// apps/hub/src/__tests__/dual-catalog-web/authorization-cache-boundary.test.tsx と同型の
// createRoot + act パターンで検証する。

import type { DocumentDetail, DocumentListResponse } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionRoleProvider } from '../../app/(dashboard)/dashboard-scope-context.js';
// route wrapper はbundle分割だけを担うため、保存契約は遅延読込先の実装本体で検証する。
import { DocumentDetailContent } from '../../app/(dashboard)/docs/[id]/document-detail-content.js';
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
      revision: 1,
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
      publish_at: null,
    },
  ],
  next_cursor: 'cursor-2',
};

const DOC: DocumentDetail = {
  id: 'doc-1',
  revision: 1,
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
  publish_at: null,
};

const SCHEDULED_PUBLISH_AT = Date.parse('2099-04-05T12:34');
const SCHEDULED_DOC: DocumentDetail = {
  ...DOC,
  title: '予約公開するガイド',
  publish_at: SCHEDULED_PUBLISH_AT,
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
  await renderWithRole(element, 'workspace-admin');
}

async function renderWithRole(
  element: ReactElement,
  role: 'member' | 'workspace-admin' | 'provider-admin',
): Promise<void> {
  await act(async () => {
    // 詳細/編集画面は SessionRoleProvider (layout.tsx が resolveShellIdentity() で解決する) から
    // role を読み、docs.write_tenant を満たさない role では編集導線を隠す。
    root.render(
      <UiProvider>
        <SessionRoleProvider role={role}>{element}</SessionRoleProvider>
      </UiProvider>,
    );
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

async function findButtonByText(text: string): Promise<HTMLButtonElement> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent === text);
    if (button !== undefined) return button;
    // next/dynamic の module 解決は microtask だけでは完了しない場合があるため、
    // 実装の遅延境界を保ったままテスト側で描画完了を待つ。
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  }
  throw new Error(`${text} ボタンがありません`);
}

/** ラベル文言から FormField が結線した input/textarea を見つける (FormField の htmlFor/id 配線に依存)。 */
function fieldByLabel<T extends HTMLInputElement | HTMLTextAreaElement>(scope: HTMLElement, labelText: string): T {
  const label = [...scope.querySelectorAll('label')].find((candidate) => candidate.textContent?.startsWith(labelText));
  if (label === undefined) throw new Error(`${labelText} のラベルがありません`);
  const forId = label.getAttribute('for');
  if (forId === null) throw new Error(`${labelText} のラベルに for がありません`);
  const control = document.getElementById(forId);
  if (control === null) throw new Error(`${labelText} の入力欄がありません`);
  return control as T;
}

async function fillField(input: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (valueSetter === undefined) throw new Error('value setter がありません');
  await act(async () => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** dynamic() import の解決を待つ (next/dynamic の module 解決は microtask だけでは終わらないため)。 */
async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  }
  if (!predicate()) throw new Error('条件が満たされないまま待機がタイムアウトしました');
}

function inputByLabel(text: string): HTMLInputElement {
  const label = [...container.querySelectorAll('label')].find((candidate) => candidate.textContent?.includes(text));
  const input = label?.htmlFor === '' ? label.querySelector('input') : document.getElementById(label?.htmlFor ?? '');
  if (!(input instanceof HTMLInputElement)) throw new Error(`${text} 入力欄がありません`);
  return input;
}

async function setInput(input: HTMLInputElement, value: string): Promise<void> {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (valueSetter === undefined) throw new Error('input value setter がありません');
  await act(async () => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // 絞り込み条件は useRememberedFilters が sessionStorage へ覚える (詳細画面へ行って戻っても
  // 入れ直させないため)。テスト間で jsdom の sessionStorage が共有され前のテストの絞り込みが
  // 漏れてしまうため、各テストの前に必ず消す。
  window.sessionStorage.clear();
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

  it('DOCS-UI-014: draftかつ未来のpublish_atだけを予約公開として表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async () =>
          jsonResponse({ ...LIST_RESPONSE, items: [{ ...LIST_RESPONSE.items[0], publish_at: SCHEDULED_PUBLISH_AT }] }),
        ),
    );
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" />);

    expect(container.textContent).toContain('予約公開');
    expect(container.textContent).toContain('予約公開:');
  });

  it('DOCS-UI-015: roleに応じて一覧内の編集導線を出し分ける', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => jsonResponse(LIST_RESPONSE)),
    );
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" sessionRole="member" />);
    expect(container.textContent).not.toContain('分類・要約を編集');

    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" sessionRole="workspace-admin" />);
    expect(container.textContent).toContain('分類・要約を編集');
  });

  it('DOCS-UI-025: 状態・カテゴリ・タグ・検索の絞り込み欄が submit 時に query へ渡る', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(LIST_RESPONSE));
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" />);

    // 状態は選択欄から状態タブへ移した (feat-card-list-shell)。タブは押した時点で即適用される。
    const statusTabs = container.querySelector('fieldset[aria-label="状態で絞り込み"]');
    if (statusTabs === null) throw new Error('状態タブがありません');
    // 「非公開」と取り違えないよう前方一致で選ぶ (件数が付くとラベルは「公開3」になる)。
    const publishedTab = [...statusTabs.querySelectorAll('button')].find((button) =>
      (button.textContent ?? '').startsWith('公開'),
    );
    if (publishedTab === undefined) throw new Error('公開タブがありません');
    await act(async () => {
      publishedTab.click();
    });

    const categoryInput = fieldByLabel(container, 'カテゴリ');
    await fillField(categoryInput, '運用');
    const tagInput = fieldByLabel(container, 'タグ');
    await fillField(tagInput, 'セットアップ');
    const queryInput = fieldByLabel(container, '検索');
    await fillField(queryInput, '導入');

    const form = container.querySelector('form');
    if (form === null) throw new Error('絞り込み form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    const lastCallUrl = fetchMock.mock.calls.at(-1)?.[0] as string;
    expect(lastCallUrl).toContain('status=published');
    expect(lastCallUrl).toContain('category=');
    expect(lastCallUrl).toContain('tag=');
    expect(lastCallUrl).toContain('q=');
  });

  it('DOCS-UI-026: 取得失敗後に「再試行する」を押すと再取得する', async () => {
    // 初回描画では restore 済みフラグの反映で load() が複数回走ることがあるため、
    // 呼び出し回数ではなく「再試行を押すまでは失敗・押した後は成功」というフェーズで切り替える。
    let succeeded = false;
    const fetchMock = vi
      .fn()
      .mockImplementation(async () =>
        succeeded ? jsonResponse(LIST_RESPONSE) : jsonResponse({}, { ok: false, status: 500 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" />);

    expect(container.textContent).toContain('読み込みエラー');
    const retryButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '再試行する');
    if (retryButton === undefined) throw new Error('再試行する ボタンがありません');
    succeeded = true;
    await act(async () => retryButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();

    expect(container.textContent).not.toContain('読み込みエラー');
    expect(container.textContent).toContain('導入ガイド');
  });

  it('DOCS-UI-030: 作成可能者の真の 0 件には最初のドキュメントを作る導線を出す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => jsonResponse({ items: [], next_cursor: null })),
    );
    await render(
      <DocumentList tenantId="tenant-a" workspaceId="ws-1" sessionRole="workspace-admin" canCreateDocument />,
    );

    const createLink = [...container.querySelectorAll<HTMLAnchorElement>('a')].find(
      (link) => link.textContent === '最初のドキュメントを作成',
    );
    expect(createLink?.getAttribute('href')).toBe('/docs/new?tenant=tenant-a&workspace=ws-1');
    expect(container.textContent).not.toContain('workspace-admin');
  });

  it('DOCS-UI-031: 作成不可者の真の 0 件には必要な workspace-admin 権限を説明する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => jsonResponse({ items: [], next_cursor: null })),
    );
    await render(
      <DocumentList tenantId="tenant-a" workspaceId="ws-1" sessionRole="member" canCreateDocument={false} />,
    );

    expect(container.querySelector('a[href^="/docs/new"]')).toBeNull();
    expect(container.textContent).toContain('workspace-admin（ワークスペース管理者）以上の権限が必要です');
  });

  it('DOCS-UI-032: 絞込結果 0 件では作成導線より絞り込み解除を優先する', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ items: [], next_cursor: null }));
    vi.stubGlobal('fetch', fetchMock);
    await render(
      <DocumentList
        tenantId="tenant-a"
        workspaceId="ws-1"
        initialQuery="見つからない語"
        sessionRole="workspace-admin"
        canCreateDocument
      />,
    );

    expect(container.querySelector('a[href^="/docs/new"]')).toBeNull();
    const clearButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === '絞り込みを解除',
    );
    if (clearButton === undefined) throw new Error('絞り込みを解除 ボタンがありません');
    await act(async () => clearButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();

    const docsRequests = fetchMock.mock.calls
      .map((call) => call[0] as string)
      .filter((url) => url.startsWith('/api/v1/docs?'));
    expect(docsRequests.at(-1)).not.toContain('q=');
    expect(container.querySelector('a[href^="/docs/new"]')?.textContent).toBe('最初のドキュメントを作成');
  });
});

/**
 * タイトルは wire 契約上も必須 (createDocumentRequestSchema の title min 1)。
 * フォーム側も空タイトルの直接送信をここで弾くようになった (原因不明な「作成できませんでした」の対策) ため、
 * 送信系のテストは実際の利用者操作に合わせてタイトル入力を経由させる。
 */
async function fillTitle(container: HTMLDivElement, value: string): Promise<void> {
  const input = container.querySelector<HTMLInputElement>('input');
  if (input === null) throw new Error('タイトル input がありません');
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (valueSetter === undefined) throw new Error('input value setter がありません');
  await act(async () => {
    valueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('DOCS-UI: DocumentCreateForm の作成', () => {
  it('DOCS-UI-004: 作成成功で作成先ドキュメントへ遷移する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(DOC, { status: 201 })));
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={false} />);
    await fillTitle(container, '導入ガイド');

    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(assign).toHaveBeenCalledWith(expect.stringContaining(`/docs/${DOC.id}`));
  });

  it('DOCS-UI-004b: 空タイトルのまま送信すると API を呼ばずに入力を促す', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DOC, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={false} />);

    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('タイトルを入力してください。');
  });

  it('CARD-MUTATION-UI-DOCS-001: フォーム開始時のUUID v4を通信失敗後の再送で保持する', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({}, { ok: false, status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={false} />);
    await fillTitle(container, '再送するガイド');

    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    const postCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(postCalls).toHaveLength(2);
    const keys = postCalls.map(([, init]) => new Headers(init?.headers).get('idempotency-key'));
    expect(keys[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(keys[1]).toBe(keys[0]);
  });

  it('DOCS-UI-029: docs.write_common を持つ role では「共通」スコープを選べ、選択すると作成リクエストへ含まれる', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DOC, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={true} />);
    await fillTitle(container, '共通ガイド');

    const scopeSelect = container.querySelector('select') as HTMLSelectElement | null;
    if (scopeSelect === null) throw new Error('スコープの select がありません');
    const selectValueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (selectValueSetter === undefined) throw new Error('select value setter がありません');
    await act(async () => {
      selectValueSetter.call(scopeSelect, 'common');
      scopeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<string, unknown>;
    expect(body.scope).toBe('common');
  });

  it('DOCS-UI-005: 作成失敗はエラーバナーに API の理由を表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            title: '入力内容を確認してください',
            detail: 'タイトルは1文字以上で入力してください',
          },
          { ok: false, status: 400 },
        ),
      ),
    );
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={false} />);
    await fillTitle(container, '導入ガイド');

    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(container.textContent).toContain('入力内容を確認してください');
    expect(container.textContent).toContain('タイトルは1文字以上で入力してください');
  });

  it('DOCS-UI-016: ブログ項目と予約日時を統一契約で送る', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SCHEDULED_DOC, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={false} />);
    await fillTitle(container, '予約記事');

    await setInput(inputByLabel('カテゴリ'), '運用');
    await setInput(inputByLabel('タグ'), '設計, API');
    await setInput(inputByLabel('サムネイル画像 URL'), 'https://example.test/thumbnail.png');
    await setInput(inputByLabel('要約'), '予約記事の要約');
    await setInput(inputByLabel('予約公開日時'), '2099-04-05T12:34');
    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    const request = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      category: '運用',
      tags: ['設計', 'API'],
      thumbnail_url: 'https://example.test/thumbnail.png',
      excerpt: '予約記事の要約',
      publish_at: SCHEDULED_PUBLISH_AT,
    });
  });

  it('DOCS-UI-017: 過去の予約日時は送信せずフォーム内で理由を示す', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={false} />);
    await fillTitle(container, '予約記事');

    await setInput(inputByLabel('予約公開日時'), '2020-01-01T00:00');
    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('現在より後の日時を指定してください');
  });

  it('DOCS-UI-012: カテゴリ・タグ・サムネイル・要約を入力すると作成リクエストへ含まれる', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DOC, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentCreateForm tenantId="tenant-a" workspaceId="ws-1" canWriteCommon={false} />);
    await fillTitle(container, '導入ガイド');

    await fillField(fieldByLabel(container, 'カテゴリ'), '運用');
    await fillField(fieldByLabel(container, 'タグ'), 'セットアップ, 手順書');
    await fillField(fieldByLabel(container, 'サムネイル画像 URL'), 'https://example.com/thumb.png');
    await fillField(fieldByLabel(container, '要約'), '導入手順の要約です。');

    const form = container.querySelector('form');
    if (form === null) throw new Error('作成 form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as Record<string, unknown>;
    expect(body.category).toBe('運用');
    expect(body.tags).toEqual(['セットアップ', '手順書']);
    expect(body.thumbnail_url).toBe('https://example.com/thumb.png');
    expect(body.excerpt).toBe('導入手順の要約です。');
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

  it('DOCS-UI-018: 詳細で予約badgeと日時を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(SCHEDULED_DOC)));
    await render(
      <DocumentDetailPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );

    expect(container.textContent).toContain('予約公開');
    expect(container.textContent).toContain('日次の予約公開処理で公開されます');
  });

  it('DOCS-UI-027: 見出しがあると目次が出て、開閉と見出しクリックでスクロール先へ移動する', async () => {
    const scrollIntoView = vi.fn();
    // jsdom は scrollIntoView を実装しないため、目次クリック側の呼び出しだけを検証できるように stub する。
    Element.prototype.scrollIntoView = scrollIntoView;
    const docWithHeadings = { ...DOC, body_markdown: '# 導入ガイド\n\n## 手順\n\n本文。\n\n## まとめ\n\nおわり。' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(docWithHeadings)));
    await render(
      <DocumentDetailPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );
    await waitUntil(() => container.querySelector('nav[aria-label="目次"]') !== null);

    // Markdown 本文側の見出し id 生成 (packages/ui) はこのテストの対象外なので、
    // 目次が当てにするスクロール先だけを最小構成で用意する (slugify の規則は content-analysis.ts に準拠)。
    const anchor = document.createElement('div');
    anchor.id = '手順';
    container.appendChild(anchor);

    // 狭い画面用の折りたたみ (data-hh-toc-mobile) を開閉する。開いた形跡は「目次を閉じる」表記で見える。
    const toggleButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === '目次を開く',
    );
    if (toggleButton === undefined) throw new Error('目次を開く ボタンがありません');
    await act(async () => toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('目次を閉じる');

    const headingLink = [...container.querySelectorAll('nav[aria-label="目次"] a')].find(
      (link) => link.textContent === '手順',
    );
    if (headingLink === undefined) throw new Error('見出しリンクがありません');
    await act(async () => headingLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
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

    const saveButton = await findButtonByText('保存する');
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

    await setInput(inputByLabel('タイトル'), '保存に失敗する変更');
    const saveButton = await findButtonByText('保存する');
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

  it('DOCS-UI-020: カテゴリ・タグ・サムネイル・要約を編集すると保存リクエストへ含まれる', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v1/me/notion-integration') return jsonResponse(null);
      return jsonResponse(DOC);
    });
    vi.stubGlobal('fetch', fetchMock);
    await render(
      <DocumentEditPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );
    expect(container.textContent).toContain(DOC.title);

    await fillField(fieldByLabel(container, 'カテゴリ'), '運用');
    await fillField(fieldByLabel(container, 'タグ'), 'セットアップ, 手順書');
    await fillField(fieldByLabel(container, 'サムネイル画像 URL'), 'https://example.com/thumb.png');
    await fillField(fieldByLabel(container, '要約'), '導入手順の要約です。');

    const saveButton = await findButtonByText('保存する');
    await act(async () => saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();

    const patchCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]) === `/api/v1/docs/${DOC.id}` && (call[1] as RequestInit | undefined)?.method === 'PATCH',
    );
    if (patchCall === undefined) throw new Error('PATCH リクエストが送信されていません');
    const body = JSON.parse(String((patchCall[1] as RequestInit).body)) as Record<string, unknown>;
    expect(new Headers((patchCall[1] as RequestInit).headers).get('if-match')).toBe('"docs-1"');
    expect(body.category).toBe('運用');
    expect(body.tags).toEqual(['セットアップ', '手順書']);
    expect(body.thumbnail_url).toBe('https://example.com/thumb.png');
    expect(body.excerpt).toBe('導入手順の要約です。');
  });

  it('CARD-MUTATION-UI-DOCS-002: 412で未保存入力を保ち、current revisionで明示的に再試行する', async () => {
    const current = { ...DOC, revision: 2, title: '他の利用者の更新' };
    const succeeded = { ...DOC, revision: 3, title: '自分の未保存タイトル' };
    let patchCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/v1/me/notion-integration') return jsonResponse(null);
      if (String(input) === `/api/v1/docs/${DOC.id}` && init?.method === 'PATCH') {
        patchCount += 1;
        return patchCount === 1
          ? jsonResponse({ error: 'revision_conflict', message: '競合しました', current }, { ok: false, status: 412 })
          : jsonResponse(succeeded);
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

    const titleInput = inputByLabel('タイトル');
    await setInput(titleInput, '自分の未保存タイトル');
    await act(async () => (await findButtonByText('保存する')).click());
    await flush();

    expect(titleInput.value).toBe('自分の未保存タイトル');
    expect(container.textContent).toContain('他の利用者の更新');
    expect(container.textContent).toContain('未保存の入力は保持');

    await act(async () => (await findButtonByText('現在の内容に対して再試行')).click());
    await flush();
    const patchCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(new Headers(patchCalls[0]?.[1]?.headers).get('if-match')).toBe('"docs-1"');
    expect(new Headers(patchCalls[1]?.[1]?.headers).get('if-match')).toBe('"docs-2"');
    expect(JSON.parse(String(patchCalls[1]?.[1]?.body))).toMatchObject({ title: '自分の未保存タイトル' });
  });

  it('DOCS-UI-028: 状態と予約日時の相互解除 (公開にすると予約日時をクリア/予約日時を入れると下書きに戻す)', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/v1/me/notion-integration') return jsonResponse(null);
      return jsonResponse(DOC);
    });
    vi.stubGlobal('fetch', fetchMock);
    await render(
      <DocumentEditPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );
    expect(container.textContent).toContain(DOC.title);

    // 予約日時を先に入れておき、状態を「公開済み」に切り替えると予約日時欄が空に戻る
    // (公開済みと予約が同時に成立しない契約)。
    const publishAtInput = fieldByLabel<HTMLInputElement>(container, '予約公開日時');
    await setInput(publishAtInput, '2099-01-01T00:00');
    expect(publishAtInput.value).toBe('2099-01-01T00:00');

    const statusLabel = [...container.querySelectorAll('label')].find((candidate) =>
      candidate.textContent?.startsWith('状態'),
    );
    if (statusLabel === undefined) throw new Error('状態 のラベルがありません');
    const statusForId = statusLabel.getAttribute('for');
    if (statusForId === null) throw new Error('状態 のラベルに for がありません');
    const statusSelect = document.getElementById(statusForId) as HTMLSelectElement | null;
    if (statusSelect === null) throw new Error('状態 の入力欄がありません');
    const selectValueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (selectValueSetter === undefined) throw new Error('select value setter がありません');
    await act(async () => {
      selectValueSetter.call(statusSelect, 'published');
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(publishAtInput.value).toBe('');

    // 逆に予約日時を入れ直すと状態が「下書き」へ戻る (公開したまま予約が残らないようにする)。
    await setInput(publishAtInput, '2099-02-02T00:00');
    expect((statusSelect as unknown as { value: string }).value).toBe('draft');
  });

  it('DOCS-UI-012: docs.write_tenant を満たさない role では編集画面を出さない (元不具合の権限不足経路)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(DOC)));
    await renderWithRole(
      <DocumentEditPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
      'member',
    );

    expect(container.textContent).toContain('編集できません');
    expect(container.querySelector('button')).toBeNull();
  });

  it('DOCS-UI-013: 403 (problem+json) は権限不足の文言をそのまま出す', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/v1/me/notion-integration') return jsonResponse(null);
      if (url === `/api/v1/docs/${DOC.id}` && init?.method === 'PATCH') {
        return jsonResponse(
          { title: '権限がありません', detail: 'workspace-admin 以上が必要です。', status: 403 },
          { ok: false, status: 403 },
        );
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

    await setInput(inputByLabel('タイトル'), '権限が必要な変更');
    const saveButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '保存する');
    if (saveButton === undefined) throw new Error('保存ボタンがありません');
    await act(async () => saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();

    // problem+json の title/detail をそのまま表示する (固定文言へ潰さない)。
    expect(container.textContent).toContain('権限がありません');
    expect(container.textContent).toContain('workspace-admin 以上が必要です。');
  });

  it('DOCS-UI-019: 未変更の予約日時/statusを再送せず実title変更の解除契約を保つ', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === `/api/v1/docs/${DOC.id}` && init?.method === 'PATCH') {
        return jsonResponse({ ...SCHEDULED_DOC, title: '変更後', publish_at: null });
      }
      return jsonResponse(SCHEDULED_DOC);
    });
    vi.stubGlobal('fetch', fetchMock);
    await render(
      <DocumentEditPage
        params={resolved({ id: 'doc-1' })}
        searchParams={resolved({ tenant: 'tenant-a', workspace: 'ws-1' })}
      />,
    );

    await setInput(inputByLabel('タイトル'), '変更後');
    const saveButton = await findButtonByText('保存する');
    await act(async () => saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await flush();

    const request = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({ title: '変更後' });
  });
});

describe('DOCS-UI: DocumentDetailContent のタグ・カテゴリ表示', () => {
  it('DOCS-UI-021: カテゴリ・タグ・要約があるとバッジと本文が描画される', async () => {
    await render(
      <DocumentDetailContent
        detail={{
          ...DOC,
          body_markdown: '# 見出し\n\n本文。',
          category: '運用',
          tags: ['セットアップ', '手順書'],
          excerpt: '導入手順の要約です。',
        }}
        scheduled={false}
      />,
    );
    await waitUntil(() => container.textContent?.includes('運用') === true);

    expect(container.textContent).toContain('運用');
    expect(container.textContent).toContain('セットアップ');
    expect(container.textContent).toContain('手順書');
    expect(container.textContent).toContain('導入手順の要約です。');
  });

  it('DOCS-UI-022: カテゴリ・タグが無いとバッジ領域を出さない', async () => {
    await render(<DocumentDetailContent detail={{ ...DOC, body_markdown: '本文。' }} scheduled={false} />);
    await waitUntil(() => container.querySelector('[data-hh-doc-layout]') !== null);

    expect(container.querySelector('[data-hh-tag-row]')).toBeNull();
  });
});

describe('DOCS-UI: DocumentEditPanel (一覧からの分類編集)', () => {
  it('DOCS-UI-023: 一覧からパネルを開いてカテゴリ・タグを編集すると PATCH される', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === `/api/v1/docs/${LIST_RESPONSE.items[0]?.id}` && init?.method === 'PATCH') {
        return jsonResponse({ ...LIST_RESPONSE.items[0], category: '運用強化' });
      }
      return jsonResponse(LIST_RESPONSE);
    });
    vi.stubGlobal('fetch', fetchMock);
    // 一覧の編集導線は sessionRole (docs.write_tenant 相当) が無いと表示されない (DOCS-UI-015 と同じ契約)。
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" sessionRole="workspace-admin" />);

    const openButton = await findButtonByText('分類・要約を編集');
    await act(async () => openButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await waitUntil(() => container.querySelector('[data-hh-doc-edit-panel]') !== null);

    // 一覧の絞り込みバーにも同名の「カテゴリ」欄があるため、container 全体ではなく
    // 開いた編集パネルの中だけを探す (でないと絞り込みバー側の欄を誤って掴んでしまう)。
    const panel = container.querySelector('[data-hh-doc-edit-panel]');
    if (panel === null) throw new Error('編集パネルが見つかりません');
    const categoryInput = fieldByLabel(panel as HTMLElement, 'カテゴリ');
    await fillField(categoryInput, '運用強化');
    // React はネイティブの blur (非 bubbling) ではなく focusout を拾って onBlur へ変換するため、
    // 実際の利用者操作 (フォーカスを外す) と同じ経路を dispatch する。
    await act(async () => categoryInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    await flush();

    const patchCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]) === `/api/v1/docs/${LIST_RESPONSE.items[0]?.id}` &&
        (call[1] as RequestInit | undefined)?.method === 'PATCH',
    );
    if (patchCall === undefined) throw new Error('PATCH リクエストが送信されていません');
    const body = JSON.parse(String((patchCall[1] as RequestInit).body)) as Record<string, unknown>;
    expect(new Headers((patchCall[1] as RequestInit).headers).get('if-match')).toBe('"docs-1"');
    expect(body.category).toBe('運用強化');

    const closeButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '閉じる');
    if (closeButton === undefined) throw new Error('閉じるボタンがありません');
    await act(async () => closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  });

  it('DOCS-UI-024: タグ・サムネイル・要約の変更もそれぞれ blur で PATCH される', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === `/api/v1/docs/${LIST_RESPONSE.items[0]?.id}` && init?.method === 'PATCH') {
        return jsonResponse(LIST_RESPONSE.items[0]);
      }
      return jsonResponse(LIST_RESPONSE);
    });
    vi.stubGlobal('fetch', fetchMock);
    await render(<DocumentList tenantId="tenant-a" workspaceId="ws-1" sessionRole="workspace-admin" />);

    const openButton = await findButtonByText('分類・要約を編集');
    await act(async () => openButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await waitUntil(() => container.querySelector('[data-hh-doc-edit-panel]') !== null);
    const panel = container.querySelector('[data-hh-doc-edit-panel]');
    if (panel === null) throw new Error('編集パネルが見つかりません');

    const tagsInput = fieldByLabel(panel as HTMLElement, 'タグ');
    await fillField(tagsInput, 'セットアップ, 応用');
    await act(async () => tagsInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    await flush();

    const thumbnailInput = fieldByLabel(panel as HTMLElement, 'サムネイル画像 URL');
    await fillField(thumbnailInput, 'https://example.com/new-thumb.png');
    await act(async () => thumbnailInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    await flush();

    const excerptInput = fieldByLabel(panel as HTMLElement, '要約');
    await fillField(excerptInput, '更新した要約です。');
    await act(async () => excerptInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    await flush();

    const patchCalls = fetchMock.mock.calls.filter(
      (call) =>
        String(call[0]) === `/api/v1/docs/${LIST_RESPONSE.items[0]?.id}` &&
        (call[1] as RequestInit | undefined)?.method === 'PATCH',
    );
    expect(patchCalls.length).toBe(3);
    const bodies = patchCalls.map(
      (call) => JSON.parse(String((call[1] as RequestInit).body)) as Record<string, unknown>,
    );
    expect(bodies[0]?.tags).toEqual(['セットアップ', '応用']);
    expect(bodies[1]?.thumbnail_url).toBe('https://example.com/new-thumb.png');
    expect(bodies[2]?.excerpt).toBe('更新した要約です。');
  });
});
