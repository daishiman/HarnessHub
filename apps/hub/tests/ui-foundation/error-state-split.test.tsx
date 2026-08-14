/** @vitest-environment jsdom */
/**
 * ERRSPLIT-01〜04: 取得の失敗と操作の失敗を分けて出す (HarnessHub-oanz)。
 *
 * この 2 つを 1 つの state で持つと、保存を 1 回失敗しただけで画面の中身まで
 * 消えたように見える。逆に、取得に失敗しているのに「0 件」と出すと、
 * 無いのか読めていないのかが利用者から区別できない。どちらも「操作の結果が
 * 正しく出ているか」を目視で確かめにくく、実装を戻しても画面は一見動くため、
 * ここで「操作に失敗しても中身が残る」ことを画面ごとに固定する。
 *
 * 利用者一覧 (user-list) は先にこの分け方を採っており、ここで扱う 4 画面が
 * それに揃ったことを確認する。
 */
import { UiProvider } from '@harness-hub/ui';
import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountSettings } from '../../src/app/(dashboard)/settings/account/account-settings.js';
import { OidcConnectionAdmin } from '../../src/app/(dashboard)/settings/auth/oidc-connection-admin.js';
import { CoefficientsSettings } from '../../src/app/(dashboard)/settings/coefficients/coefficients-settings.js';
import { UserDashboard } from '../../src/app/(dashboard)/users/[id]/user-dashboard.js';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** 本番と同じく root layout の UiProvider 配下で描画する (@harness-hub/ui は Context 必須)。 */
async function mount(node: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  await act(async () => {
    createRoot(container).render(createElement(UiProvider, null, node));
  });
  // `next/dynamic` の遅延読込は、束ね済みでも最低 1 マイクロタスク遅れて解決する。
  // render の act 1 ラウンドだけでは placeholder のまま残ることがあり、
  // 実行環境の速さで結果が割れる (手元は緑・CI は ERRSPLIT-03 が赤になった)。
  // ここで確実に解決まで進めてから検証する。
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return container;
}

/** GET は成功、状態を変える操作だけ失敗させる。取得は生きているのに操作だけ落ちた状況を作る。 */
function stubApi(get: (url: string) => Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method !== undefined && init.method !== 'GET') return new Response(null, { status: 500 });
      return get(url);
    }),
  );
}

async function submitForm(container: HTMLElement, label: string): Promise<void> {
  const form = container.querySelector<HTMLFormElement>(`form[aria-label="${label}"]`);
  if (form === null) throw new Error(`form[aria-label="${label}"] not rendered`);
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

async function clickButton(container: HTMLElement, text: string): Promise<void> {
  const button = [...container.querySelectorAll('button')].find((node) => node.textContent?.includes(text));
  if (button === undefined) throw new Error(`button "${text}" not rendered`);
  await act(async () => {
    button.click();
  });
}

describe('ERRSPLIT: 取得の失敗と操作の失敗を分けて出す', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('ERRSPLIT-01: 見積係数設定 — 保存に失敗しても入力欄と現在値が残る', async () => {
    stubApi(() =>
      Response.json({ annual_hours: 1800, minutes_per_run: 30, sheet_reduction_rate: 0.5, updated_by: 'admin' }),
    );
    const container = await mount(createElement(CoefficientsSettings, { tenantId: 'tenant-a' }));

    // 変更してから保存する (差分が無いと PATCH 自体が飛ばない)
    const input = container.querySelector<HTMLInputElement>('input[name="annualHours"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (input === null || setter === undefined) throw new Error('annualHours input not rendered');
    await act(async () => {
      setter.call(input, '2000');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await submitForm(container, '見積係数の編集');

    expect(container.textContent).toContain('見積係数の更新に失敗しました。');
    // 失敗しても入力中の値と現在値の表示は消えない
    expect(container.querySelector<HTMLInputElement>('input[name="annualHours"]')?.value).toBe('2000');
    expect(container.textContent).toContain('1800 時間');
    // 取得の失敗と読み違えられる文言を出さない
    expect(container.textContent).not.toContain('見積係数を取得できませんでした。');
  });

  it('ERRSPLIT-02: アカウント設定 — 表示名の保存に失敗しても 3 つの面が残る', async () => {
    stubApi((url) => {
      if (url.endsWith('/notification-settings')) {
        return Response.json({
          notify_generation: true,
          notify_review: true,
          notify_weekly: false,
          notify_feedback: false,
          email_enabled: true,
        });
      }
      if (url.endsWith('/display-settings')) {
        return Response.json({ theme: 'light', density: 'comfortable', language: 'ja' });
      }
      return Response.json({ email: 'user@example.com', name: '山田 太郎', department: '営業', role: 'member' });
    });
    const container = await mount(createElement(AccountSettings, { tenantId: 'tenant-a' }));

    await submitForm(container, 'プロフィールの編集');

    expect(container.textContent).toContain('プロフィールの更新に失敗しました。');
    // 3 つの面はどれも消えない (保存の失敗は画面全体の話ではない)
    expect(container.querySelector('#profile-heading')).not.toBeNull();
    expect(container.querySelector('#notification-settings-heading')).not.toBeNull();
    expect(container.querySelector('#display-settings-heading')).not.toBeNull();
    expect(container.textContent).toContain('メンバー');
    expect(container.textContent).not.toContain('member');
    expect(container.textContent).not.toContain('設定を取得できませんでした。');
  });

  it('ERRSPLIT-03: 認証の接続設定 — 登録に失敗しても接続一覧が残る', async () => {
    stubApi(() =>
      Response.json({
        setup: {
          customer_callback_url: 'https://example.com/callback',
          shared_callback_url: 'https://hub.example.com/callback',
          required_google_scopes: ['openid', 'email'],
        },
        items: [
          {
            id: 'conn-1',
            client_id: 'client-1.apps.googleusercontent.com',
            client_secret_last4: 'abcd',
            credential_status: 'tested',
            resolvable: false,
            last_tested_at: null,
            updated_at: '2026-08-01T00:00:00.000Z',
            rotation: {
              staged: false,
              pending_client_id: null,
              pending_client_secret_last4: null,
              pending_tested_at: null,
            },
          },
        ],
      }),
    );
    const container = await mount(createElement(OidcConnectionAdmin, { tenantId: 'tenant-a' }));

    await submitForm(container, 'Google OAuth client の登録');

    expect(container.textContent).toContain('操作に失敗しました。');
    // 登録に失敗しても、既に登録済みの接続は見えたままにする
    expect(container.querySelector('[aria-label="接続 client-1.apps.googleusercontent.com"]')).not.toBeNull();
    expect(container.textContent).not.toContain('接続一覧を取得できませんでした。');
    expect(container.textContent).not.toContain('登録済みの接続はまだありません');
  });

  it('ERRSPLIT-04: 利用者詳細 — 在籍の切り替えに失敗しても利用者の情報が残る', async () => {
    stubApi((url) => {
      if (url.endsWith('/api/v1/me')) return Response.json({ role: 'workspace-admin' });
      return Response.json({
        id: 'user-1',
        name: '山田 太郎',
        department: '営業',
        role: 'member',
        status: 'active',
        salary: 5_000_000,
      });
    });
    const container = await mount(createElement(UserDashboard, { userId: 'user-1', tenantId: 'tenant-a' }));

    await clickButton(container, '退職済みにする');
    await clickButton(container, '実行する');

    expect(container.textContent).toContain('更新に失敗しました。');
    // 失敗しても利用者の情報は消えない
    expect(container.textContent).toContain('山田 太郎');
    expect(container.textContent).toContain('メンバー');
    expect(container.textContent).not.toContain('member');
    expect(container.textContent).not.toContain('ユーザーが見つかりませんでした。');
  });
});
