// @vitest-environment jsdom
/**
 * MT-UI-*: S09 ダッシュボードと S16 使用状況画面の実インタラクション。
 *
 * 「API が返した確定値がそのまま画面に出る」ことがこの 2 画面の受入条件なので、
 * fetch を stub して実際に描画し、KPI・表・グラフに出た文字列を突き合わせる。
 * 併せて、期間変更・ハーネス切替が再取得を起こすこと、失敗時にエラーが出ることを確かめる。
 *
 * 描画は feedback-loop の screen-interactions.test.tsx と同じ createRoot + act パターン。
 */
import {
  type MetricsRollupsResponse,
  type MetricsSummaryResponse,
  metricsRollupsResponseSchema,
} from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MetricsDashboard } from '../../app/(dashboard)/dashboard/metrics-dashboard.js';
import { UsageSavingsReport } from '../../app/(dashboard)/tracking/usage-savings-report.js';

const TENANT_ID = 'tenant-a';
const WORKSPACE_ID = 'ws-a1';
const RANGE = { from: '2026-07-01', to: '2026-07-10' };

const SUMMARY: MetricsSummaryResponse = {
  period: RANGE,
  kpi: { totalRunCount: 1234, savedHours: 7.5, savedAmountJpy: 45_000, harnessCount: 2 },
  trend: [
    { periodStart: '2026-07-06', runCount: 20, savedHours: 5, savedAmountJpy: 30_000 },
    { periodStart: '2026-07-07', runCount: 10, savedHours: 2.5, savedAmountJpy: 15_000 },
  ],
  ranking: [
    { harnessId: 'harness-alpha', harnessName: 'Alpha 見積', runCount: 20, savedHours: 5, savedAmountJpy: 30_000 },
    { harnessId: 'harness-beta', harnessName: 'Beta 与信', runCount: 10, savedHours: 2.5, savedAmountJpy: 15_000 },
  ],
  rankingTotals: { total: 2, active: 2 },
  departments: [
    { departmentId: 'dept-sales', departmentName: '営業部', runCount: 30, savedHours: 7.5, savedAmountJpy: 45_000 },
  ],
};

/** 現行 DB のように名称解決が無く、互換フィールドに ID が入る応答。 */
const UNRESOLVED_SUMMARY: MetricsSummaryResponse = {
  ...SUMMARY,
  ranking: SUMMARY.ranking.map((entry) => ({ ...entry, harnessName: entry.harnessId })),
  departments: SUMMARY.departments.map((entry) => ({
    ...entry,
    departmentName: entry.departmentId ?? '部門未設定',
  })),
};

const PROJECTS = {
  items: [
    { id: 'harness-alpha', name: 'Alpha 見積', description: '', can_publish: false },
    { id: 'harness-beta', name: 'Beta 与信', description: '', can_publish: false },
  ],
};

/** `computedAt` は brand 型なので、素の文字列ではなく契約の parse を通して組み立てる。 */
const ROLLUPS: MetricsRollupsResponse = metricsRollupsResponseSchema.parse({
  items: [
    {
      period: 'weekly',
      periodStart: '2026-07-06',
      dim: 'harness',
      dimKey: 'harness-alpha',
      runCount: 20,
      savedMinutes: 300,
      savedAmountJpy: 30_000,
      computedAt: '2026-07-13T00:00:00Z',
    },
  ],
});

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

function jsonResponse(body: unknown, init: { readonly ok?: boolean } = {}): Response {
  const ok = init.ok ?? true;
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
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

describe('MT-UI: S09 効果測定ダッシュボード', () => {
  it('MT-UI-001: KPI・ランキング・部門内訳が API の値どおりに描画される', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url === '/api/v1/projects' ? jsonResponse(PROJECTS) : jsonResponse(SUMMARY),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<MetricsDashboard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} initialRange={RANGE} />);

    // KPI は整形だけして素通し。1234 → 1,234 / 45000 → 45,000
    expect(container.textContent).toContain('1,234');
    expect(container.textContent).toContain('7.5');
    expect(container.textContent).toContain('45,000');
    expect(container.textContent).toContain('Alpha 見積');
    expect(container.textContent).toContain('営業部');
    // 活用率: 実行実績のある 2 件 / 2 件 = 100%
    expect(container.textContent).toContain('100');
  });

  it('MT-UI-002: scope ヘッダと期間クエリを付けて summary を取得する', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url === '/api/v1/projects' ? jsonResponse(PROJECTS) : jsonResponse(SUMMARY),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<MetricsDashboard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} initialRange={RANGE} />);

    const summaryCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/metrics/summary'));
    if (summaryCall === undefined) throw new Error('summary を取得していません');
    const [url, init] = summaryCall;
    if (init === undefined) throw new Error('summary の request init がありません');
    expect(url).toBe('/api/v1/metrics/summary?from=2026-07-01&to=2026-07-10');
    expect((init.headers as Record<string, string>)['x-harness-tenant-id']).toBe(TENANT_ID);
    expect((init.headers as Record<string, string>)['x-harness-workspace-id']).toBe(WORKSPACE_ID);
  });

  it('MT-UI-003: 期間を変えて適用すると新しい期間で再取得する', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === '/api/v1/projects' ? jsonResponse(PROJECTS) : jsonResponse(SUMMARY),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<MetricsDashboard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} initialRange={RANGE} />);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/metrics/summary'))).toHaveLength(1);

    const inputs = container.querySelectorAll<HTMLInputElement>('form[aria-label="集計期間の指定"] input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter === undefined || inputs[0] === undefined) throw new Error('期間入力がありません');
    await act(async () => {
      setter.call(inputs[0], '2026-07-05');
      inputs[0]?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const form = container.querySelector('form[aria-label="集計期間の指定"]');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await flush();

    const summaryCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/metrics/summary'));
    expect(summaryCalls).toHaveLength(2);
    expect(summaryCalls[1]?.[0]).toContain('from=2026-07-05');
  });

  it('MT-UI-004: 取得失敗はエラーとして表示し、数値を空欄で見せない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { ok: false })));

    await render(<MetricsDashboard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} initialRange={RANGE} />);

    expect(container.textContent).toContain('集計を取得できませんでした');
  });

  it('MT-UI-005: 名称未解決の project / department key を業務名と偽らず ID と明示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/v1/projects' ? jsonResponse({}, { ok: false }) : jsonResponse(UNRESOLVED_SUMMARY),
      ),
    );

    await render(<MetricsDashboard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} initialRange={RANGE} />);

    expect(container.textContent).toContain('業務ツール ID: harness-alpha');
    expect(container.textContent).toContain('部門 ID: dept-sales');
    expect(container.textContent).toContain('集計値は取得済みです');
  });

  it('MT-UI-006: project 一覧で名称解決できればランキングとチャートに名称を出す', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      url === '/api/v1/projects' ? jsonResponse(PROJECTS) : jsonResponse(UNRESOLVED_SUMMARY),
    );
    vi.stubGlobal('fetch', fetchMock);

    await render(<MetricsDashboard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} initialRange={RANGE} />);

    expect(container.textContent).toContain('Alpha 見積');
    expect(container.querySelector('[data-hh-id-badge] summary[aria-label="業務ツール ID: harness-alpha"]')).toBeNull();
    const projectCall = fetchMock.mock.calls.find(([url]) => url === '/api/v1/projects');
    if (projectCall?.[1] === undefined) throw new Error('project 名称取得の request init がありません');
    expect((projectCall[1].headers as Record<string, string>)['x-harness-tenant-id']).toBe(TENANT_ID);
    expect((projectCall[1].headers as Record<string, string>)['x-harness-workspace-id']).toBe(WORKSPACE_ID);
  });
});

describe('MT-UI: S16 使用状況・削減効果', () => {
  function stubBoth(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/v1/projects') return jsonResponse(PROJECTS);
      return url.includes('/rollups') ? jsonResponse(ROLLUPS) : jsonResponse(SUMMARY);
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('MT-UI-007: 週次 rollup の行が確定値どおりに描画される', async () => {
    stubBoth();

    await render(<UsageSavingsReport tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} range={RANGE} />);

    expect(container.textContent).toContain('2026-07-06');
    expect(container.textContent).toContain('Alpha 見積');
    // rollup は分で持つ。300 分 → 5.0 時間として表示する
    expect(container.textContent).toContain('5.0');
    expect(container.textContent).toContain('30,000');
  });

  it('MT-UI-008: rollups は period=weekly / dim=harness の読取だけを要求する', async () => {
    const fetchMock = stubBoth();

    await render(<UsageSavingsReport tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} range={RANGE} />);

    const rollupCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/rollups'));
    if (rollupCall === undefined) throw new Error('rollups を取得していません');
    expect(String(rollupCall[0])).toContain('period=weekly');
    expect(String(rollupCall[0])).toContain('dim=harness');
    // 書込 method を使っていないこと (rollup は cron だけが確定させる)
    expect((rollupCall[1] as RequestInit | undefined)?.method).toBeUndefined();
  });

  // 絞り込みの確定は全画面で「絞り込む」ボタンに統一した (docs/frontend-ui-foundation-spec.md §5-5)。
  // 選んだ瞬間の再取得はしないため、選択 → 確定の 2 手で検査する。
  it('MT-UI-009: ハーネスを選んで絞り込むと harnessId 付きで再取得する', async () => {
    const fetchMock = stubBoth();

    await render(<UsageSavingsReport tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} range={RANGE} />);
    const callsBefore = fetchMock.mock.calls.length;

    const select = container.querySelector<HTMLSelectElement>('select');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (select === null || setter === undefined) throw new Error('ハーネス select がありません');
    await act(async () => {
      setter.call(select, 'harness-alpha');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();

    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit === null) throw new Error('「絞り込む」ボタンがありません');
    await act(async () => {
      submit.click();
    });
    await flush();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('harnessId=harness-alpha'))).toBe(true);
  });

  it('MT-UI-010: 片方でも取得に失敗したらエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/v1/projects') return jsonResponse(PROJECTS);
        return url.includes('/rollups') ? jsonResponse({}, { ok: false }) : jsonResponse(SUMMARY);
      }),
    );

    await render(<UsageSavingsReport tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} range={RANGE} />);

    expect(container.textContent).toContain('使用状況を取得できませんでした');
  });

  it('MT-UI-011: rollup の dim_key も名称未解決なら ID として表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/v1/projects') return jsonResponse({}, { ok: false });
        return url.includes('/rollups') ? jsonResponse(ROLLUPS) : jsonResponse(UNRESOLVED_SUMMARY);
      }),
    );

    await render(<UsageSavingsReport tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} range={RANGE} />);

    expect(
      container.querySelector('[data-hh-id-badge] summary[aria-label="業務ツール ID: harness-alpha"]'),
    ).not.toBeNull();
    expect(container.querySelector('option[value="harness-alpha"]')?.textContent).toBe('業務ツール ID: harness-alpha');
    expect(container.textContent).toContain('使用状況と削減効果は取得済みです');
  });
});
