// @vitest-environment jsdom

import { UiProvider } from '@harness-hub/ui';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeDashboard } from '../../app/(dashboard)/dashboard/home-dashboard.js';
/**
 * HD-UI-*: home-dashboard.tsx のレンダリング・空データ・エラー状態・a11y。
 *
 * fetch は `notion-settings.test.tsx` と同じ方針でグローバル差し替えのみ行い、
 * API route・service は通さない (集約ロジック自体は `summary-service.test.ts` が担保する)。
 */
import type { HomeSummaryResponse } from '../../features/home-dashboard/dto.js';

const SUMMARY: HomeSummaryResponse = {
  sheets: {
    visible: true,
    actionable_count: 2,
    recent_items: [
      {
        id: 'hs-1',
        revision: 1,
        code: 'HS-0001',
        status: 'review',
        title: '見積作成の自動化',
        domain: '見積',
        department: '営業',
        people: 2,
        hours: 40,
        applicant: { id: 'user-2', name: '申請 太郎' },
        updated_at: 2_000,
      },
    ],
  },
  feedback: {
    visible: true,
    actionable_count: 0,
    recent_items: [
      {
        id: 'fb-1',
        code: 'FR-0001',
        project_id: 'proj-1',
        type: 'improvement',
        priority: 'high',
        source: 'harness',
        status: 'open',
        created_at: 900,
        updated_at: 1_500,
      },
    ],
  },
  builds: { visible: false, actionable_count: 0, recent_items: [] },
};

function stubFetch(body: HomeSummaryResponse | { title: string; status: number }, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
      ),
  );
}

function renderHome(): ReturnType<typeof render> {
  return render(
    <UiProvider>
      <HomeDashboard tenantId="tenant-a" workspaceId="workspace-a" />
    </UiProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HD-UI: home-dashboard の表示', () => {
  it('HD-UI-001: 要対応・次のアクション・最近の動きを表示し、KPIと非visibleのbuildsは出さない', async () => {
    stubFetch(SUMMARY);
    renderHome();

    expect(await screen.findByText(/ヒアリングシート: 2件が対応待ちです/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ヒアリングシートを新しく作成' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /HS-0001/ })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'キー数字' })).toBeNull();
    // builds は visible: false のため、どのセクションにも出ない
    expect(screen.queryByText(/構築案件/)).toBeNull();
  });

  it('HD-UI-002: 要対応が 0 件のときは落ち着いた完了表示にする(偽の緊急性を出さない)', async () => {
    stubFetch({
      sheets: { visible: true, actionable_count: 0, recent_items: [] },
      feedback: { visible: true, actionable_count: 0, recent_items: [] },
      builds: { visible: true, actionable_count: 0, recent_items: [] },
    });
    renderHome();

    expect(await screen.findByText('いま対応が必要なものはありません。順調です。')).toBeTruthy();
  });

  it('HD-UI-003: 取得失敗時は再試行導線を出し、要対応セクションは出さない', async () => {
    stubFetch({ title: 'サーバーエラーが発生しました。', status: 500 }, 500);
    renderHome();

    expect(await screen.findByRole('button', { name: '再試行する' })).toBeTruthy();
    expect(screen.queryByText(/対応待ちです/)).toBeNull();
  });

  it('HD-UI-004: 内容のある画面で axe 違反が 0 件', async () => {
    stubFetch(SUMMARY);
    const { container } = renderHome();
    await screen.findByText(/ヒアリングシート: 2件が対応待ちです/);

    const results = await axe.run(container, { resultTypes: ['violations'] });
    expect(results.violations.map((violation) => violation.id)).toStrictEqual([]);
  });

  it('HD-UI-005: visible=false の項目は不正なwireが来ても最近の動きへ混ぜない', async () => {
    stubFetch({
      ...SUMMARY,
      builds: {
        visible: false,
        actionable_count: 0,
        recent_items: [
          {
            id: 'leaked-build',
            workspace_id: 'workspace-a',
            type: 'bug',
            stage: 'build',
            sheet_id: null,
            feedback_id: null,
            publish_request_id: null,
            title: '表示してはいけない案件',
            risk: 'none',
            created_at: 3_000,
            updated_at: 3_000,
          },
        ],
      },
    } as unknown as HomeSummaryResponse);
    renderHome();
    await screen.findByText(/ヒアリングシート: 2件が対応待ちです/);
    expect(screen.queryByText('表示してはいけない案件')).toBeNull();
  });
});
