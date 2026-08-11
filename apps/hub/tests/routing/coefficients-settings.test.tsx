/** @vitest-environment jsdom */
/**
 * TID-COEF-01〜09: 見積係数フォーム (AD-4) の取得・検証・部分更新の契約。
 *
 * `updateTenantCoefficientsRequestSchema` は 3 項目とも optional の部分更新契約であり、
 * 「変更された項目だけを PATCH body に載せる」ことが画面側の責務になっている。
 * 全項目を常に送っても API は 200 を返してしまうため、この差分抽出が壊れても
 * 画面上は正常に見える。ここで PATCH body そのものを固定して回帰を止める。
 *
 * 入力検証も同様に、通してしまうと「不正な係数で見積りが出る」形でしか気付けないので、
 * 3 項目それぞれの拒否条件を個別に押さえる。
 */
import { UiProvider } from '@harness-hub/ui';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CoefficientsSettings } from '../../src/app/(dashboard)/settings/coefficients/coefficients-settings.js';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CURRENT = {
  annual_hours: 1800,
  minutes_per_run: 30,
  sheet_reduction_rate: 0.5,
  updated_by: 'user-admin-1',
  updated_by_name: 'admin@example.com',
} as const;

/** GET は現在値、PATCH は差分反映後の値を返す既定の API スタブ。 */
function stubApi(overrides: { readonly get?: () => Response; readonly patch?: () => Response } = {}) {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      if (overrides.patch !== undefined) return overrides.patch();
      const patch = JSON.parse(String(init.body)) as Record<string, number>;
      return Response.json({ ...CURRENT, ...patch });
    }
    return overrides.get === undefined ? Response.json(CURRENT) : overrides.get();
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

/** 本番と同じく root layout の UiProvider 配下で描画する (@harness-hub/ui は Context 必須)。 */
async function mount(): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  await act(async () => {
    createRoot(container).render(
      createElement(UiProvider, null, createElement(CoefficientsSettings, { tenantId: 'tenant-a' })),
    );
  });
  return container;
}

/**
 * React の controlled input は代入を native setter 経由で行わないと変更を検知しない。
 * `input.value = x` だけでは onChange が発火せず、テストが黙って素通りする。
 */
async function typeInto(container: HTMLElement, name: string, value: string): Promise<void> {
  const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (input === null) throw new Error(`input[name="${name}"] not rendered`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter === undefined) throw new Error('value setter unavailable');
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit(container: HTMLElement): Promise<void> {
  const form = container.querySelector('form');
  if (form === null) throw new Error('form not rendered');
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

/** PATCH 呼び出しの body だけを取り出す (GET と混ざらないように method で絞る)。 */
function patchBodies(fetcher: ReturnType<typeof stubApi>): readonly Record<string, number>[] {
  return fetcher.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH')
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, number>);
}

describe('TID-COEF: 見積係数フォーム', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('TID-COEF-01: 取得成功 -> 現在値をフォームへ載せ、最終更新者を示す', async () => {
    const fetcher = stubApi();
    const container = await mount();

    expect(container.querySelector<HTMLInputElement>('input[name="annualHours"]')?.value).toBe('1800');
    expect(container.querySelector<HTMLInputElement>('input[name="minutesPerRun"]')?.value).toBe('30');
    expect(container.querySelector<HTMLInputElement>('input[name="sheetReductionRate"]')?.value).toBe('0.5');
    expect(container.textContent).toContain('admin@example.com');
    expect(container.querySelector('[aria-label="利用者 ID: user-admin-1"]')).not.toBeNull();
    expect(container.textContent).toContain('user-admin-1');
    expect(fetcher).toHaveBeenCalledWith('/api/v1/tenant/coefficients', {
      credentials: 'same-origin',
      headers: { 'x-harness-tenant-id': 'tenant-a' },
    });
  });

  it('TID-COEF-02: 取得が 4xx/5xx -> フォームを出さずエラーを知らせる (空フォームで保存させない)', async () => {
    stubApi({ get: () => new Response(null, { status: 500 }) });
    const container = await mount();

    expect(container.querySelector('form')).toBeNull();
    expect(container.textContent).toContain('見積係数を取得できませんでした。');
  });

  it('TID-COEF-03: 変更なしで保存 -> PATCH を送らず「変更はありません」で止める', async () => {
    const fetcher = stubApi();
    const container = await mount();

    await submit(container);

    expect(patchBodies(fetcher)).toEqual([]);
    expect(container.textContent).toContain('変更はありません。');
  });

  it('TID-COEF-04: 変更した項目だけを PATCH body へ載せる (部分更新契約)', async () => {
    const fetcher = stubApi();
    const container = await mount();

    await typeInto(container, 'annualHours', '2000');
    await submit(container);

    expect(patchBodies(fetcher)).toEqual([{ annual_hours: 2000 }]);
    expect(container.textContent).toContain('見積係数を更新しました。');
  });

  it('TID-COEF-05: 複数項目を変えれば全て載せ、更新後の応答をフォームへ反映する', async () => {
    const fetcher = stubApi();
    const container = await mount();

    await typeInto(container, 'minutesPerRun', '45');
    await typeInto(container, 'sheetReductionRate', '0.25');
    await submit(container);

    expect(patchBodies(fetcher)).toEqual([{ minutes_per_run: 45, sheet_reduction_rate: 0.25 }]);
    expect(container.querySelector<HTMLInputElement>('input[name="minutesPerRun"]')?.value).toBe('45');
    expect(container.querySelector<HTMLInputElement>('input[name="sheetReductionRate"]')?.value).toBe('0.25');
  });

  it('TID-COEF-06: 年間稼働時間が正の整数でない -> 送信せず拒否する', async () => {
    const fetcher = stubApi();
    const container = await mount();

    await typeInto(container, 'annualHours', '0');
    await submit(container);

    expect(patchBodies(fetcher)).toEqual([]);
    expect(container.textContent).toContain('年間稼働時間は正の整数で入力してください。');
  });

  it('TID-COEF-07: 実行時間が数値でない -> 送信せず拒否する', async () => {
    const fetcher = stubApi();
    const container = await mount();

    await typeInto(container, 'minutesPerRun', 'あ');
    await submit(container);

    expect(patchBodies(fetcher)).toEqual([]);
    expect(container.textContent).toContain('1回あたりの実行時間は正の整数で入力してください。');
  });

  it('TID-COEF-08: シート削減率が 0〜1 の外 -> 送信せず拒否する', async () => {
    const fetcher = stubApi();
    const container = await mount();

    await typeInto(container, 'sheetReductionRate', '1.5');
    await submit(container);

    expect(patchBodies(fetcher)).toEqual([]);
    expect(container.textContent).toContain('シート削減率は 0 以上 1 以下の数値で入力してください。');
  });

  it('TID-COEF-09: 更新が拒否された (403 等) -> 成功と誤認させずエラーを出す', async () => {
    stubApi({ patch: () => new Response(null, { status: 403 }) });
    const container = await mount();

    await typeInto(container, 'annualHours', '2000');
    await submit(container);

    expect(container.textContent).toContain('見積係数の更新に失敗しました。');
    expect(container.textContent).not.toContain('見積係数を更新しました。');
  });
});
