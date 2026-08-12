// @vitest-environment jsdom

import { UiProvider } from '@harness-hub/ui';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotionSettings } from '../../app/(dashboard)/settings/notion/notion-settings.js';

const INTEGRATION = {
  workspace_id: 'workspace-a',
  mode: 'api_key' as const,
  page_url: 'https://www.notion.so/page-a',
  api_key_masked: '****1234',
  api_key_status: 'stored_unverified' as const,
  updated_at: 1,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubLoad(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(INTEGRATION), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
}

function renderSettings(canManage: boolean): ReturnType<typeof render> {
  return render(
    <UiProvider>
      <NotionSettings tenantId="tenant-a" workspaceId="workspace-a" canManage={canManage} />
    </UiProvider>,
  );
}

describe('NotionSettings role boundary', () => {
  it('member は登録内容を読めるが保存・解除操作は DOM に持たない', async () => {
    stubLoad();
    renderSettings(false);

    expect(await screen.findByText('****1234')).toBeTruthy();
    expect(screen.getByText('保存済み（接続未確認）')).toBeTruthy();
    expect(screen.getByText(/APIへの接続確認・ページ取得・同期は行いません/)).toBeTruthy();
    expect(screen.getByText(/ワークスペース管理者に依頼/)).toBeTruthy();
    expect(screen.queryByRole('form', { name: 'Notion連携の登録・変更' })).toBeNull();
    expect(screen.queryByRole('button', { name: '保存する' })).toBeNull();
    expect(screen.queryByRole('button', { name: '登録を削除する' })).toBeNull();
  });

  it('workspace-admin は保存・解除操作に到達できる', async () => {
    stubLoad();
    renderSettings(true);

    expect(await screen.findByRole('form', { name: 'Notion連携の登録・変更' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '登録を削除する' })).toBeTruthy();
    expect(screen.getByText(/APIへの接続確認・ページ取得・同期は行いません/)).toBeTruthy();
  });

  it('内容のある管理者画面で axe 違反が 0 件', async () => {
    stubLoad();
    const { container } = renderSettings(true);
    await screen.findByRole('form', { name: 'Notion連携の登録・変更' });

    const results = await axe.run(container, { resultTypes: ['violations'] });
    expect(results.violations.map((violation) => violation.id)).toStrictEqual([]);
  });
});
