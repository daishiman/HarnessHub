/** @vitest-environment jsdom */
import type { SheetDetail } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HearingSheetDetail } from '../../src/app/(dashboard)/sheets/[id]/hearing-sheet-detail.js';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DETAIL: SheetDetail = {
  id: 'sheet-1',
  code: 'HS-0001',
  status: 'review',
  title: '請求処理',
  applicant: { id: 'user-1', name: '山田 太郎' },
  department: '経理部',
  form_snapshot: {
    schemaVersion: 2,
    taskName: '請求処理',
    company: 'サンプル社',
    applicant: '山田 太郎',
    domain: '経理',
    issue: '転記が多い',
    tools: '表計算',
    hours: 40,
    people: 5,
    features: '自動転記',
    output: '一覧',
    priority: 'high',
    usagePurpose: 'app_development',
    expertise: 'novice',
    role: 'employee',
    context: 'business',
    motivation: 'efficiency',
    sharingIntent: 'small_group',
    constraintTags: [],
    shareTarget: 'チーム内',
    knowledgeAssets: ['経理マニュアル'],
    requestPatterns: [],
    integrationTools: [],
    existingDataSources: [],
    referenceUrls: [],
  },
  estimate_snapshot: { savedMinutesPerYear: 3_600, savedHoursPerYear: 60, savedAmountPerYear: 180_000 },
  generated_sections: null,
  created_at: 1_786_147_200_000,
  updated_at: 1_786_147_200_000,
  ai_job_status: 'completed',
  build_ref: 'build-1',
  publish_request_ref: null,
  can_manage: false,
};

let container: HTMLDivElement;
let root: Root;

async function flush(): Promise<void> {
  for (let index = 0; index < 4; index += 1) {
    await act(async () => Promise.resolve());
  }
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.replaceChildren(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('DETAILSTATE: 詳細画面の文脈と属性を状態遷移で失わない', () => {
  it('DETAILSTATE-01: S12 は申請・生成・関連 Build の情報をラベル付きで表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(DETAIL)));

    await act(async () => {
      root.render(
        createElement(
          UiProvider,
          null,
          createElement(HearingSheetDetail, { id: 'sheet-1', tenantId: 't', workspaceId: 'w' }),
        ),
      );
    });
    await flush();

    expect(container.querySelector('h1')?.textContent).toContain('HS-0001 請求処理');
    expect(container.textContent).toContain('申請と進行状況');
    expect(container.textContent).toContain('山田 太郎');
    expect(container.textContent).toContain('経理部');
    expect(container.textContent).toContain('生成完了');
    expect(container.querySelector('a[href="/builds?tenant=t&workspace=w"]')).not.toBeNull();
    expect(container.querySelector('[data-hh-id-badge] summary')?.getAttribute('aria-label')).toBe('Build ID: build-1');
  });

  it('DETAILSTATE-02: S12 の取得失敗でも画面見出しと一覧への導線を残す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await act(async () => {
      root.render(
        createElement(
          UiProvider,
          null,
          createElement(HearingSheetDetail, { id: 'sheet-1', tenantId: 't', workspaceId: 'w' }),
        ),
      );
    });
    await flush();

    expect(container.querySelector('h1')?.textContent).toContain('ヒアリングシート詳細');
    expect(container.querySelector('a[href="/sheets?tenant=t&workspace=w"]')).not.toBeNull();
    expect(container.textContent).toContain('シートを取得できませんでした');
  });
});
