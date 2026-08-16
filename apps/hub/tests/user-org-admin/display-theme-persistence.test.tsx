// @vitest-environment jsdom

import type { UiPreferences } from '@harness-hub/ui';
import { UiProvider } from '@harness-hub/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountSettings } from '../../src/app/(dashboard)/settings/account/account-settings.js';
import { HubShell } from '../../src/components/shell/hub-shell.js';

const TENANT_ID = 'tenant-a';
// 全suiteのCPU競合下でも、保存完了という同じ観測条件を待つ。Vitestの30秒上限より十分短く保つ。
const SAVE_CONFIRMATION_TIMEOUT_MS = 10_000;

/**
 * 保存済み設定は root layout がサーバで解決し `defaultPreferences` として渡す
 * (`src/lib/routing/display-preferences.ts`)。テストではその受け渡しを引数で再現する。
 */
function renderSignedInAccountSettings(preferences?: UiPreferences) {
  return render(
    <UiProvider defaultPreferences={preferences}>
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

    await screen.findByText('表示設定を更新しました。', {}, { timeout: SAVE_CONFIRMATION_TIMEOUT_MS });
    await waitFor(() =>
      expect(firstPage.container.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('dark'),
    );

    // ブラウザの reload と同じく Provider の client state を捨てて、保存済み設定から画面を作り直す。
    // 再描画時の初期値はサーバが持つ `persistedTheme` であり、client の残留 state ではない。
    firstPage.unmount();
    const reloadedPage = renderSignedInAccountSettings({
      theme: persistedTheme === 'system' ? 'auto' : persistedTheme,
      density: 'comfortable',
      locale: 'ja',
    });

    await waitFor(() =>
      expect(reloadedPage.container.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('dark'),
    );
  });

  /**
   * 共通シェルの描画で本人設定 API を叩かないことを固定する。
   *
   * client から後追い fetch する実装へ戻すと、上書き専用の client 部品が @harness-hub/ui を
   * 別 chunk へ割り、(dashboard)/(workspace) 配下の全 route の First Load JS が増える
   * (実測 2026-08-13: +3856 bytes / route で G13 予算ゲートが 4 route 超過)。
   * 「表示は正しいが bundle が太る」退行は見た目のテストでは捕まらないため、経路そのものを固定する。
   */
  it('共通シェルの描画では本人設定 API を fetch しない (サーバ解決の初期値だけを使う)', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url === '/api/v1/me/display-settings') {
        throw new Error('共通シェルから display-settings を fetch してはいけません');
      }
      throw new Error(`未定義の fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const page = render(
      <UiProvider defaultPreferences={{ theme: 'dark', density: 'comfortable', locale: 'ja' }}>
        <HubShell
          scope={{ tenantId: TENANT_ID, workspaceId: 'workspace-a' }}
          accountName="山田太郎"
          accountNameIsIdentifier={false}
          accountRole="member"
          workspaceIds={['workspace-a']}
          workspaceNames={{ 'workspace-a': '開発部' }}
          currentHref={`/dashboard?tenant=${TENANT_ID}`}
        >
          <p>本文</p>
        </HubShell>
      </UiProvider>,
    );

    // サーバ由来の初期値がそのまま適用され、fetch は 1 度も起きない。
    expect(page.container.querySelector('[data-theme]')?.getAttribute('data-theme')).toBe('dark');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('サーバ側の表示設定解決 (root layout の初期値)', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../../src/lib/routing/shell-identity.js');
    vi.doUnmock('../../src/features/user-org-admin/runtime.js');
  });

  /** `resolveShellIdentity` と runtime を差し替えたうえで、対象を読み直す。 */
  async function loadResolver(options: {
    readonly subject: string | null;
    readonly getDisplaySettings?: () => Promise<{ theme: string; density: string; language: string }>;
  }) {
    vi.resetModules();
    vi.doMock('../../src/lib/routing/shell-identity.js', () => ({
      resolveShellIdentity: async () => ({
        subject: options.subject,
        displayName: null,
        role: null,
        workspaceIds: [],
        workspaceNames: {},
      }),
    }));
    const getDisplaySettings = vi.fn(
      options.getDisplaySettings ?? (async () => ({ theme: 'dark', density: 'compact', language: 'en' })),
    );
    vi.doMock('../../src/features/user-org-admin/runtime.js', () => ({
      userOrgAdminRuntime: () => ({ service: { getDisplaySettings } }),
    }));
    const module = await import('../../src/lib/routing/display-preferences.js');
    return { resolveUiPreferences: module.resolveUiPreferences, getDisplaySettings };
  }

  it('サインイン済みなら保存値を UiProvider の語彙へ変換して返す', async () => {
    const { resolveUiPreferences, getDisplaySettings } = await loadResolver({ subject: 'user-a' });

    await expect(resolveUiPreferences()).resolves.toEqual({
      theme: 'dark',
      density: 'compact',
      locale: 'en',
    });
    expect(getDisplaySettings).toHaveBeenCalledWith('user-a');
  });

  it('サーバの system は UI の auto へ寄せる (語彙の差を 1 箇所に閉じる)', async () => {
    const { resolveUiPreferences } = await loadResolver({
      subject: 'user-a',
      getDisplaySettings: async () => ({ theme: 'system', density: 'comfortable', language: 'ja' }),
    });

    await expect(resolveUiPreferences()).resolves.toEqual({
      theme: 'auto',
      density: 'comfortable',
      locale: 'ja',
    });
  });

  it('未認証では設定を読みに行かず undefined を返す (公開画面で本人設定を引かない)', async () => {
    const { resolveUiPreferences, getDisplaySettings } = await loadResolver({ subject: null });

    await expect(resolveUiPreferences()).resolves.toBeUndefined();
    expect(getDisplaySettings).not.toHaveBeenCalled();
  });

  it('取得に失敗しても undefined を返し、画面全体は落とさない', async () => {
    const { resolveUiPreferences } = await loadResolver({
      subject: 'user-a',
      getDisplaySettings: async () => {
        throw new Error('db down');
      },
    });

    await expect(resolveUiPreferences()).resolves.toBeUndefined();
  });
});
