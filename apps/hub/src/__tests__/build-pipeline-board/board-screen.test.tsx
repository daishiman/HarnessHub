// @vitest-environment jsdom
/**
 * BPB-UI-*: S13 パイプラインボード画面の実インタラクション
 * (SYS-BUILD-PIPELINE-BOARD-P05 / qa-021 / qa-022)。
 *
 * 検証したいのは「共有部品 `StageBoard` を消費している」ことと、その上での取得・操作の配線である。
 * 画面が独自のボード UI を持っていないことは、`StageBoard` が出す構造 (7 列の見出し・
 * 各カードの「次へ / 戻る」ボタンの算出名) がそのまま DOM に現れることで確認する。
 *
 * feedback-loop の screen-interactions.test.tsx と同じ createRoot + act パターンで、
 * global fetch を stub して実際に動かす。
 */
import { BUILD_STAGE_ORDER, type BuildListResponse, type BuildStageTransitionResponse } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BuildBoard } from '../../app/(dashboard)/builds/build-board.js';

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
  return { ok, status, json: async () => body } as Response;
}

const LIST_ITEM: BuildListResponse['items'][number] = {
  id: 'build-01',
  workspace_id: WORKSPACE_ID,
  type: 'improvement',
  stage: 'design',
  sheet_id: null,
  feedback_id: 'fb-1',
  publish_request_id: null,
  title: '請求書チェックハーネス',
  risk: 'warn',
  title_override: null,
  risk_override: null,
  assignee_user_id: null,
  note: null,
  created_at: 1_700_000_000_000,
  updated_at: 1_700_000_000_000,
};

const LIST: BuildListResponse = { items: [LIST_ITEM], next_cursor: null, can_manage: true };

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.replaceChildren(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('BPB-UI: S13 パイプラインボード', () => {
  it('BPB-UI-001: 共有部品 StageBoard を消費し、7 工程すべてを列として描画する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(LIST)),
    );

    await render(
      createElement(BuildBoard, { tenantId: TENANT_ID, workspaceId: WORKSPACE_ID, stageOrder: BUILD_STAGE_ORDER }),
    );

    const board = container.querySelector('section[aria-label="ハーネス構築の工程ボード"]');
    expect(board).not.toBeNull();
    // 空の工程も列として残る (列位置が workspace ごとにずれないこと)
    expect(board?.querySelectorAll('h3')).toHaveLength(BUILD_STAGE_ORDER.length);
    expect(container.textContent).toContain('請求書チェックハーネス');
    // リスクは色だけでなくラベルでも示される (StageBoard 側の a11y 契約)
    expect(container.textContent).toContain('注意');
  });

  it('BPB-UI-002: 一覧取得はテナント/Workspace ヘッダーを付けて /api/v1/builds を叩く', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(LIST));
    vi.stubGlobal('fetch', fetchMock);

    await render(
      createElement(BuildBoard, { tenantId: TENANT_ID, workspaceId: WORKSPACE_ID, stageOrder: BUILD_STAGE_ORDER }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/builds?limit='),
      expect.objectContaining({
        headers: { 'x-harness-tenant-id': TENANT_ID, 'x-harness-workspace-id': WORKSPACE_ID },
      }),
    );
  });

  it('BPB-UI-003: next_cursor がある間は追加取得し、100 件超も黙って欠落させない', async () => {
    const secondItem = { ...LIST_ITEM, id: 'build-00', title: '契約書チェックハーネス', stage: 'test' as const };
    const firstPage: BuildListResponse = { items: [LIST_ITEM], next_cursor: 'build-01', can_manage: true };
    const secondPage: BuildListResponse = { items: [secondItem], next_cursor: null, can_manage: true };
    const fetchMock = vi.fn(async (input: string) =>
      input.includes('cursor=build-01') ? jsonResponse(secondPage) : jsonResponse(firstPage),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(
      createElement(BuildBoard, { tenantId: TENANT_ID, workspaceId: WORKSPACE_ID, stageOrder: BUILD_STAGE_ORDER }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('cursor=build-01'),
      expect.objectContaining({
        headers: { 'x-harness-tenant-id': TENANT_ID, 'x-harness-workspace-id': WORKSPACE_ID },
      }),
    );
    expect(container.textContent).toContain('請求書チェックハーネス');
    expect(container.textContent).toContain('契約書チェックハーネス');
    expect(container.textContent).toContain('2 件の構築案件を表示中');
  });

  it('BPB-UI-004: 「次へ」は隣接工程を expected_stage 付きで POST し、応答でカードを差し替える', async () => {
    const moved: BuildStageTransitionResponse = {
      build: { ...LIST_ITEM, stage: 'build', risk: 'none' },
      event: {
        id: 'ev-1',
        build_id: 'build-01',
        from_stage: 'design',
        to_stage: 'build',
        actor_user_id: 'user-admin',
        reason: null,
        occurred_at: 1_700_000_100_000,
      },
    };
    const fetchMock = vi.fn(async (input: string) =>
      input.includes('/stage') ? jsonResponse(moved) : jsonResponse(LIST),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(
      createElement(BuildBoard, { tenantId: TENANT_ID, workspaceId: WORKSPACE_ID, stageOrder: BUILD_STAGE_ORDER }),
    );

    const nextButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.getAttribute('aria-label')?.startsWith('次へ'),
    );
    expect(nextButton).toBeDefined();
    await act(async () => {
      nextButton?.click();
    });
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/builds/build-01/stage',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ to_stage: 'build', expected_stage: 'design' }),
      }),
    );
    expect(container.textContent).toContain('請求書チェックハーネスの工程を更新しました。');
    expect(container.textContent).not.toContain('次の工程へ移しました');
  });

  it('BPB-UI-005: 「戻る」の成功通知も「次の工程」と誤表示しない', async () => {
    const movedBack: BuildStageTransitionResponse = {
      build: { ...LIST_ITEM, stage: 'requirements', risk: 'none' },
      event: {
        id: 'ev-back',
        build_id: 'build-01',
        from_stage: 'design',
        to_stage: 'requirements',
        actor_user_id: 'user-admin',
        reason: null,
        occurred_at: 1_700_000_100_000,
      },
    };
    const fetchMock = vi.fn(async (input: string) =>
      input.includes('/stage') ? jsonResponse(movedBack) : jsonResponse(LIST),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(
      createElement(BuildBoard, { tenantId: TENANT_ID, workspaceId: WORKSPACE_ID, stageOrder: BUILD_STAGE_ORDER }),
    );
    const previousButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.getAttribute('aria-label')?.startsWith('戻る'),
    );
    expect(previousButton).toBeDefined();
    await act(async () => {
      previousButton?.click();
    });
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/builds/build-01/stage',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ to_stage: 'requirements', expected_stage: 'design' }),
      }),
    );
    expect(container.textContent).toContain('請求書チェックハーネスの工程を更新しました。');
    expect(container.textContent).not.toContain('次の工程へ移しました');
  });

  it('BPB-UI-006: can_manage=false の member には工程操作を DOM へ出さない', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ...LIST, can_manage: false }));
    vi.stubGlobal('fetch', fetchMock);

    await render(
      createElement(BuildBoard, { tenantId: TENANT_ID, workspaceId: WORKSPACE_ID, stageOrder: BUILD_STAGE_ORDER }),
    );
    expect(
      Array.from(container.querySelectorAll('button')).some((button) =>
        button.getAttribute('aria-label')?.startsWith('次へ'),
      ),
    ).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('BPB-UI-007: 409 (競合・公開前提未達) は problem+json の detail をそのまま案内する', async () => {
    const fetchMock = vi.fn(async (input: string) =>
      input.includes('/stage')
        ? jsonResponse(
            { title: '公開工程の前提が満たされていません', detail: 'PublishRequest が未接続です' },
            { ok: false, status: 409 },
          )
        : jsonResponse(LIST),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(
      createElement(BuildBoard, { tenantId: TENANT_ID, workspaceId: WORKSPACE_ID, stageOrder: BUILD_STAGE_ORDER }),
    );
    const nextButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.getAttribute('aria-label')?.startsWith('次へ'),
    );
    await act(async () => {
      nextButton?.click();
    });
    await flush();

    expect(container.textContent).toContain('PublishRequest が未接続です');
  });

  it('BPB-UI-008: 一覧取得に失敗したらエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({}, { ok: false, status: 500 })),
    );

    await render(
      createElement(BuildBoard, { tenantId: TENANT_ID, workspaceId: WORKSPACE_ID, stageOrder: BUILD_STAGE_ORDER }),
    );

    expect(container.textContent).toContain('工程ボードを取得できませんでした。');
  });
});
