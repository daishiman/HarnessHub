// @vitest-environment jsdom

/**
 * アカウントメニューの外観切替が「サーバの正本 (`user_settings`) へ何を送るか」の検証。
 *
 * 集計 (配色の利用状況) はこの PATCH が作る 1 行だけを数えるので、
 * 送信内容がズレると画面の見た目は正しいのに集計だけが間違う、という気付きにくい壊れ方をする。
 */

import { UiProvider } from '@harness-hub/ui';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppearanceControl } from '../../components/appearance/appearance-control.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(response: Response | Promise<Response>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockReturnValue(Promise.resolve(response));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderControl(): void {
  render(
    <UiProvider>
      <AppearanceControl tenantId="tenant-a" />
    </UiProvider>,
  );
}

function lastBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const init = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('AppearanceControl の保存', () => {
  it('配色を選ぶとテナントヘッダー付きで PATCH する', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    renderControl();

    await userEvent.click(screen.getByRole('radio', { name: /^グリーン/ }));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/me/display-settings');
    expect(init.method).toBe('PATCH');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers).toMatchObject({ 'x-harness-tenant-id': 'tenant-a' });
    expect(lastBody(fetchMock)).toEqual({ theme: 'system', resolved_theme: 'light', palette: 'green' });
  });

  it('theme と resolved_theme を必ず対で送る (API は矛盾を 400 で拒否する)', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    renderControl();

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(lastBody(fetchMock)).toEqual({ theme: 'dark', resolved_theme: 'dark', palette: 'gray' });
  });

  it('UI の auto を API の system へ言い換える', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    renderControl();

    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    await userEvent.click(screen.getByRole('radio', { name: '自動' }));

    expect(lastBody(fetchMock)).toMatchObject({ theme: 'system' });
  });

  it('保存に失敗しても選択は巻き戻さず、保存できなかったことだけを知らせる', async () => {
    stubFetch(new Response(null, { status: 500 }));
    const { container } = render(
      <UiProvider>
        <AppearanceControl tenantId="tenant-a" />
      </UiProvider>,
    );

    await userEvent.click(screen.getByRole('radio', { name: /^ネイビー/ }));

    expect(container.querySelector('div')?.getAttribute('data-palette')).toBe('navy');
    expect(await screen.findByText(/設定を保存できませんでした/)).toBeTruthy();
  });

  it('通信そのものが失敗した場合も画面を落とさない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderControl();

    await userEvent.click(screen.getByRole('radio', { name: /^ベージュ/ }));

    expect(await screen.findByText(/設定を保存できませんでした/)).toBeTruthy();
  });

  it('保存できたときは成功メッセージを出さない (切り替わった画面が結果そのもの)', async () => {
    stubFetch(new Response(null, { status: 204 }));
    renderControl();

    await userEvent.click(screen.getByRole('radio', { name: /^ブルー/ }));

    expect(screen.getByRole('status').textContent).toBe('');
  });
});
