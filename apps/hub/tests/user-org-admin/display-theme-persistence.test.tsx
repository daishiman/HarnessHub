// @vitest-environment jsdom

import { UiProvider } from '@harness-hub/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountSettings } from '../../src/app/(dashboard)/settings/account/account-settings.js';
import { HubShell } from '../../src/components/shell/hub-shell.js';
import { UiPreferencesHydrator } from '../../src/components/shell/ui-preferences-hydrator.js';

const TENANT_ID = 'tenant-a';

function renderSignedInAccountSettings() {
  return render(
    <UiProvider>
      <HubShell
        scope={{ tenantId: TENANT_ID, workspaceId: 'workspace-a' }}
        accountName="山田太郎"
        accountNameIsIdentifier={false}
        accountRole="member"
        workspaceIds={['workspace-a']}
        workspaceNames={{ 'workspace-a': '開発部' }}
        currentHref={`/settings/account?tenant=${TENANT_ID}`}
      >
        <AccountSettings tenantId={TENANT_ID} />
      </HubShell>
    </UiProvider>,
  );
}

describe('表示設定のリロード耐性', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ログイン済み利用者が dark を保存すると、ページを再描画しても dark のままになる', async () => {
    let persistedTheme: 'system' | 'dark' = 'system';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url === '/api/v1/me') {
        return Response.json({
          id: 'user-a',
          email: 'yamada@example.com',
          name: '山田太郎',
          department: '開発',
          role: 'member',
        });
      }
      if (url === '/api/v1/me/notification-settings') {
        return Response.json({
          notify_generation: true,
          notify_review: true,
          notify_weekly: true,
          notify_feedback: true,
          email_enabled: true,
        });
      }
      if (url === '/api/v1/me/display-settings' && init?.method === 'PATCH') {
        const patch = JSON.parse(String(init.body)) as { readonly theme?: 'system' | 'dark' };
        persistedTheme = patch.theme ?? persistedTheme;
        return Response.json({ theme: persistedTheme, density: 'comfortable', language: 'ja' });
      }
      if (url === '/api/v1/me/display-settings') {
        return Response.json({ theme: persistedTheme, density: 'comfortable', language: 'ja' });
      }
      throw new Error(`未定義の fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const firstPage = renderSignedInAccountSettings();
    const themeSelect = await screen.findByRole('combobox', { name: 'テーマ' });
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    await screen.findByText('表示設定を更新しました。');
    await waitFor(() =>
      expect(firstPage.container.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('dark'),
    );

    // ブラウザの reload と同じく Provider の client state を捨てて、保存済み設定から画面を作り直す。
    firstPage.unmount();
    const reloadedPage = renderSignedInAccountSettings();

    await waitFor(() =>
      expect(reloadedPage.container.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('dark'),
    );
  });

  it('ログイン済み共通シェルは same-origin cookie と tenant scope 付きで本人設定を読む', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        theme: 'dark',
        density: 'comfortable',
        language: 'ja',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <UiProvider>
        <UiPreferencesHydrator tenantId={TENANT_ID} />
      </UiProvider>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/me/display-settings',
      expect.objectContaining({
        credentials: 'same-origin',
        headers: { 'x-harness-tenant-id': TENANT_ID },
      }),
    );
  });
});
