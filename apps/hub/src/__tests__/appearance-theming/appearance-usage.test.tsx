// @vitest-environment jsdom

/**
 * 「配色の利用状況」画面の検証。
 *
 * 集計値の意味 (現在の採用人数・構成比・計測率) が画面の文言と食い違うと、
 * 次のアプリ開発で参照する数字を読み違える。ここでは表示の丸めと、
 * 権限が無い場合の伝え方を固定する。
 */

import { UiProvider } from '@harness-hub/ui';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppearanceUsagePanel } from '../../app/(dashboard)/settings/system/appearance-usage.js';

const USAGE = {
  total_users: 40,
  measured_users: 25,
  measurement_rate: 0.625,
  by_palette: [
    { palette: 'blue', users: 15, share: 0.6 },
    { palette: 'gray', users: 10, share: 0.4 },
  ],
  by_palette_theme: [{ palette: 'blue', theme: 'dark', users: 15, share: 0.6 }],
  by_resolved_theme: [{ resolved_theme: 'dark', users: 15, share: 0.6 }],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubUsage(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(status === 200 ? JSON.stringify(body) : null, {
        status,
        ...(status === 200 ? { headers: { 'content-type': 'application/json' } } : {}),
      }),
    ),
  );
}

function renderUsage(): void {
  render(
    <UiProvider>
      <AppearanceUsagePanel tenantId="tenant-a" />
    </UiProvider>,
  );
}

describe('AppearanceUsagePanel', () => {
  it('人数・構成比・計測率を 0.1% 刻みで出す', async () => {
    stubUsage(USAGE);
    renderUsage();

    expect(await screen.findByText('40 人')).toBeTruthy();
    expect(screen.getByText('25 人')).toBeTruthy();
    expect(screen.getByText('62.5%')).toBeTruthy();
    expect(screen.getAllByText('60.0%').length).toBeGreaterThan(0);
  });

  it('token 名 (blue など) ではなく表示名で並べる', async () => {
    stubUsage(USAGE);
    renderUsage();

    expect(await screen.findByText('ブルー')).toBeTruthy();
    // 「配色 × 明るさ」は狭幅でカード表示にも切り替わるため、同じ文言が複数回出る
    expect(screen.getAllByText('ブルー × Dark').length).toBeGreaterThan(0);
    expect(screen.queryByText('blue')).toBeNull();
  });

  it('未知の配色は「—」に潰さず生の値のまま出す', async () => {
    // 配色を増やした直後、画面側の対応表より API の値が先に増えることがある。
    // そのとき行が空欄になると「誰も使っていない」と読めてしまう。
    stubUsage({ ...USAGE, by_palette: [{ palette: 'sunset', users: 3, share: 0.12 }] });
    renderUsage();

    expect(await screen.findByText('sunset')).toBeTruthy();
  });

  it('計測の分母が「保存した人だけ」であることを画面に明示する', async () => {
    stubUsage(USAGE);
    renderUsage();

    expect(await screen.findByText(/外観を一度でも保存した利用者だけが分母/)).toBeTruthy();
  });

  it('403 は HTTP の言葉ではなく権限が無いことを伝える', async () => {
    stubUsage(null, 403);
    renderUsage();

    expect(await screen.findByText('この画面を表示する権限がありません。')).toBeTruthy();
  });

  it('その他の失敗は取得できなかったことだけを伝える', async () => {
    stubUsage(null, 500);
    renderUsage();

    expect(await screen.findByText('配色の利用状況を取得できませんでした。')).toBeTruthy();
  });
});
