// @vitest-environment jsdom
/**
 * FL-UI-*: S14 (feedback-list / feedback-detail / feedback-form) の実インタラクション。
 *
 * a11y-screens.test.tsx は SSR 初期状態 (useEffect が走らない状態) しか検証しないため、
 * 「fetch が成功して一覧が描画される」「絞り込みフォームが再取得を起こす」「詳細の
 * 管理者操作が PATCH を呼ぶ」「フォーム送信が受付完了画面へ遷移する」という実際の画面遷移は
 * 未実行のまま P05→P06 に持ち越されていた。ここでは dual-catalog-web の
 * authorization-cache-boundary.test.tsx と同じ createRoot + act パターンで、
 * global fetch を stub してそれぞれの画面を実際に動かす。
 */
import type {
  CreateFeedbackResponse,
  FeedbackDetail as FeedbackDetailDto,
  FeedbackListResponse,
} from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackDetail } from '../../app/(dashboard)/feedback/[id]/feedback-detail.js';
import { FeedbackList } from '../../app/(dashboard)/feedback/feedback-list.js';
import { FeedbackForm } from '../../app/(dashboard)/feedback/new/feedback-form.js';
import { parseProjectDirectory } from '../../app/(dashboard)/feedback/project-directory.js';

const TENANT_ID = 'tenant-a';
const WORKSPACE_ID = 'ws-a1';

let container: HTMLDivElement;
let root: Root;

async function render(element: ReactElement): Promise<void> {
  await act(async () => {
    root.render(createElement(UiProvider, null, element));
  });
  await flush();
}

async function flush(): Promise<void> {
  for (let index = 0; index < 4; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function jsonResponse(body: unknown, init: { readonly ok?: boolean; readonly status?: number } = {}): Response {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

const PROJECTS_RESPONSE = {
  items: [{ id: 'proj-1', name: '勤怠管理', description: '勤務状況を管理する', can_publish: false }],
};

function projectAwareFetch(
  feedbackHandler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/v1/projects') return jsonResponse(PROJECTS_RESPONSE);
    return feedbackHandler(url, init);
  });
}

function feedbackCalls(fetchMock: ReturnType<typeof vi.fn>): readonly [string, RequestInit | undefined][] {
  return fetchMock.mock.calls.filter(([input]) => String(input).startsWith('/api/v1/feedback')) as [
    string,
    RequestInit | undefined,
  ][];
}

async function fillFeedbackForm(body: string): Promise<void> {
  const project = container.querySelector<HTMLSelectElement>('form[aria-label="改善要望フォーム"] select');
  const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
  if (project === null || textarea === null) throw new Error('project/body の入力欄がありません');
  const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (selectSetter === undefined || textareaSetter === undefined) throw new Error('value setter がありません');

  await act(async () => {
    selectSetter.call(project, 'proj-1');
    project.dispatchEvent(new Event('change', { bubbles: true }));
    textareaSetter.call(textarea, body);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.replaceChildren(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('FL-UI: Project 表示ディレクトリ', () => {
  it('FL-UI-000: 共有一覧 envelope から id/name だけを取り出し、公開可否を Feedback に持ち込まない', () => {
    expect(parseProjectDirectory(PROJECTS_RESPONSE)).toEqual([{ id: 'proj-1', name: '勤怠管理' }]);
    expect(parseProjectDirectory([{ id: 'proj-1', name: '配列形式' }])).toEqual([]);
  });
});

describe('FL-UI: FeedbackList の取得・絞り込み・ページ送り', () => {
  const ITEM = {
    id: 'fb-1',
    code: 'FR-0001',
    project_id: 'proj-1',
    type: 'improvement' as const,
    priority: 'medium' as const,
    source: 'manual' as const,
    status: 'open' as const,
    created_at: 0,
    updated_at: 0,
  };

  it('FL-UI-001: 取得成功で一覧行が描画され、tenant/workspace ヘッダーを付けて fetch する', async () => {
    const fetchMock = projectAwareFetch(() =>
      jsonResponse({ items: [ITEM], next_cursor: null } satisfies FeedbackListResponse),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<FeedbackList tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(container.textContent).toContain('FR-0001');
    expect(container.textContent).toContain('勤怠管理');
    const [url, init] = feedbackCalls(fetchMock)[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/feedback?limit=25');
    expect((init.headers as Record<string, string>)['x-harness-tenant-id']).toBe(TENANT_ID);
    expect((init.headers as Record<string, string>)['x-harness-workspace-id']).toBe(WORKSPACE_ID);
  });

  it('FL-UI-002: 取得失敗 (response.ok=false) はエラーメッセージを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));

    await render(<FeedbackList tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(container.textContent).toContain('一覧を取得できませんでした');
  });

  it('FL-UI-003: 状態フィルタを変更して絞り込むと status クエリ付きで再取得する', async () => {
    const fetchMock = projectAwareFetch(() =>
      jsonResponse({ items: [], next_cursor: null } satisfies FeedbackListResponse),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<FeedbackList tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    expect(feedbackCalls(fetchMock)).toHaveLength(1);

    const select = container.querySelector<HTMLSelectElement>('form[aria-label="フィードバックの絞り込み"] select');
    if (select === null) throw new Error('状態 select がありません');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (setter === undefined) throw new Error('select value setter がありません');
    await act(async () => {
      setter.call(select, 'open');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form[aria-label="フィードバックの絞り込み"]');
    if (form === null) throw new Error('絞り込み form がありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(feedbackCalls(fetchMock)).toHaveLength(2);
    const secondUrl = feedbackCalls(fetchMock).at(1)?.[0];
    if (secondUrl === undefined) throw new Error('2 回目の Feedback 取得がありません');
    expect(secondUrl).toContain('status=open');
  });

  it('FL-UI-004: 次ページがある場合は「次へ」で cursor 付き再取得、「前へ」で戻る', async () => {
    const feedbackResponses = [
      jsonResponse({ items: [ITEM], next_cursor: 'cursor-2' } satisfies FeedbackListResponse),
      jsonResponse({ items: [], next_cursor: null } satisfies FeedbackListResponse),
      jsonResponse({ items: [ITEM], next_cursor: 'cursor-2' } satisfies FeedbackListResponse),
    ];
    const fetchMock = projectAwareFetch(() => feedbackResponses.shift() ?? feedbackResponses[2] ?? jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await render(<FeedbackList tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    const nav = container.querySelector('nav[aria-label="フィードバック一覧のページ送り"]');
    if (nav === null) throw new Error('ページ送り nav がありません');
    const [prevButton, nextButton] = Array.from(nav.querySelectorAll('button')) as HTMLButtonElement[];
    expect(prevButton?.disabled).toBe(true);
    expect(nextButton?.disabled).toBe(false);

    await act(async () => nextButton?.click());
    await flush();
    expect(feedbackCalls(fetchMock)).toHaveLength(2);
    expect(feedbackCalls(fetchMock).at(1)?.[0]).toContain('cursor=cursor-2');

    const navAfterNext = container.querySelector('nav[aria-label="フィードバック一覧のページ送り"]');
    const prevAfterNext = navAfterNext?.querySelector('button') as HTMLButtonElement | undefined;
    expect(prevAfterNext?.disabled).toBe(false);

    await act(async () => prevAfterNext?.click());
    await flush();
    expect(feedbackCalls(fetchMock)).toHaveLength(3);
  });
});

describe('FL-UI: FeedbackDetail の取得・管理者操作', () => {
  const DETAIL: FeedbackDetailDto = {
    id: 'fb-1',
    code: 'FR-0001',
    project_id: 'proj-1',
    type: 'improvement',
    priority: 'medium',
    source: 'manual',
    status: 'open',
    created_at: 0,
    updated_at: 0,
    body: '一覧の読み込みが遅い',
    ai_response: null,
    ai_job_id: null,
    created_by: 'user-1',
    can_manage: true,
  };

  it('FL-UI-101: 取得成功で本文・AI 応答未着手表示・管理者操作 select が描画される', async () => {
    vi.stubGlobal(
      'fetch',
      projectAwareFetch(() => jsonResponse(DETAIL)),
    );

    await render(<FeedbackDetail id="fb-1" tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(container.textContent).toContain('FR-0001');
    expect(container.textContent).toContain('まだ応答はありません');
    expect(container.textContent).toContain('勤怠管理');
    expect(container.querySelector('[data-hh-id-badge] summary')?.getAttribute('aria-label')).toBe(
      'プロジェクト ID: proj-1',
    );
    expect(container.querySelector('aside[aria-label="管理者操作"]')).not.toBeNull();
  });

  it('FL-UI-102: can_manage=false では管理者操作 aside を描画しない', async () => {
    vi.stubGlobal(
      'fetch',
      projectAwareFetch(() => jsonResponse({ ...DETAIL, can_manage: false })),
    );

    await render(<FeedbackDetail id="fb-1" tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(container.querySelector('aside[aria-label="管理者操作"]')).toBeNull();
  });

  it('FL-UI-103: AI 応答が有る場合は本文と一緒に描画される', async () => {
    vi.stubGlobal(
      'fetch',
      projectAwareFetch(() => jsonResponse({ ...DETAIL, ai_response: 'AI からの回答本文' })),
    );

    await render(<FeedbackDetail id="fb-1" tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(container.textContent).toContain('AI からの回答本文');
  });

  it('FL-UI-104: 取得失敗でも画面見出しを残し、本文の代わりに読み込みエラーを描画する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 404 })));

    await render(<FeedbackDetail id="fb-1" tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(container.textContent).toContain('フィードバックを取得できませんでした');
    expect(container.querySelector('article')).not.toBeNull();
    expect(container.querySelector('h1')?.textContent).toContain('フィードバック詳細');
  });

  it('FL-UI-105: 管理者操作 select で次状態を選ぶと PATCH を送り、成功すると新しい状態が反映される', async () => {
    const fetchMock = projectAwareFetch((_url, init) =>
      init?.method === 'PATCH' ? jsonResponse({ ...DETAIL, status: 'in_progress' }) : jsonResponse(DETAIL),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<FeedbackDetail id="fb-1" tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    const select = container.querySelector<HTMLSelectElement>('aside[aria-label="管理者操作"] select');
    if (select === null) throw new Error('管理者操作 select がありません');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (setter === undefined) throw new Error('select value setter がありません');

    await act(async () => {
      setter.call(select, 'in_progress');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();

    expect(feedbackCalls(fetchMock)).toHaveLength(2);
    const [, patchCall] = feedbackCalls(fetchMock);
    const [patchUrl, patchInit] = patchCall as [string, RequestInit];
    expect(patchUrl).toContain('/api/v1/feedback/fb-1');
    expect(patchInit.method).toBe('PATCH');
    expect(JSON.parse(patchInit.body as string)).toEqual({ status: 'in_progress' });
    expect(container.textContent).toContain('対応中');
  });

  it('FL-UI-106: PATCH 失敗は操作エラーを表示するが直前の詳細は残す', async () => {
    const fetchMock = projectAwareFetch((_url, init) =>
      init?.method === 'PATCH' ? jsonResponse({}, { ok: false, status: 422 }) : jsonResponse(DETAIL),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<FeedbackDetail id="fb-1" tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    const select = container.querySelector<HTMLSelectElement>('aside[aria-label="管理者操作"] select');
    if (select === null) throw new Error('管理者操作 select がありません');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (setter === undefined) throw new Error('select value setter がありません');

    await act(async () => {
      setter.call(select, 'in_progress');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();

    expect(container.textContent).toContain('状態を変更できませんでした');
    expect(container.textContent).toContain('FR-0001');
  });

  it('FL-UI-107: Project 一覧の取得失敗は ID に縮退し、詳細本文を消さない', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      String(input) === '/api/v1/projects' ? jsonResponse({}, { ok: false, status: 500 }) : jsonResponse(DETAIL),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<FeedbackDetail id="fb-1" tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(container.textContent).toContain('プロジェクト名を読み込めませんでした');
    expect(container.textContent).toContain('一覧の読み込みが遅い');
    expect(container.querySelector('[data-hh-id-badge] summary')?.getAttribute('aria-label')).toBe(
      'プロジェクト ID: proj-1',
    );
  });
});

describe('FL-UI: FeedbackForm の入力・送信', () => {
  it('FL-UI-201: project_id/body を入力すると送信可能になり、成功すると受付完了画面へ遷移する', async () => {
    const created: CreateFeedbackResponse = { id: 'fb-1', code: 'FR-0001', status: 'open' };
    const fetchMock = projectAwareFetch(() => jsonResponse(created, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await render(<FeedbackForm tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(container.textContent).toContain('勤怠管理');
    expect(container.querySelector('input')).toBeNull();
    await fillFeedbackForm('検索結果の並び順を変えてほしい');

    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.disabled).toBe(false);

    const form = container.querySelector('form[aria-label="改善要望フォーム"]');
    if (form === null) throw new Error('フォームがありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(feedbackCalls(fetchMock)).toHaveLength(1);
    const [, init] = feedbackCalls(fetchMock)[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      project_id: 'proj-1',
      body: '検索結果の並び順を変えてほしい',
    });
    expect(container.textContent).toContain('受付が完了しました');
    expect(container.textContent).toContain('FR-0001');
  });

  it('FL-UI-202: 送信失敗はエラーメッセージを表示し、フォームのまま維持する', async () => {
    vi.stubGlobal(
      'fetch',
      projectAwareFetch(() => jsonResponse({}, { ok: false, status: 500 })),
    );

    await render(<FeedbackForm tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    await fillFeedbackForm('本文');
    const form = container.querySelector('form[aria-label="改善要望フォーム"]');
    if (form === null) throw new Error('フォームがありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    expect(container.textContent).toContain('送信できませんでした');
    expect(container.querySelector('form[aria-label="改善要望フォーム"]')).not.toBeNull();
  });

  it('FL-UI-203: 受付完了画面の「続けて報告」でフォームへ戻れる', async () => {
    const created: CreateFeedbackResponse = { id: 'fb-1', code: 'FR-0001', status: 'open' };
    vi.stubGlobal(
      'fetch',
      projectAwareFetch(() => jsonResponse(created, { status: 201 })),
    );

    await render(<FeedbackForm tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);
    await fillFeedbackForm('本文');
    const form = container.querySelector('form[aria-label="改善要望フォーム"]');
    if (form === null) throw new Error('フォームがありません');
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await flush();

    const retryButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === '続けてもう 1 件報告する',
    );
    if (retryButton === undefined) throw new Error('続けて報告するボタンがありません');
    await act(async () => retryButton.click());
    await flush();

    expect(container.querySelector('form[aria-label="改善要望フォーム"]')).not.toBeNull();
  });
});
