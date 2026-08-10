// @vitest-environment jsdom
/**
 * BPB-A11Y-* / BPB-PAGE-*: S13 工程ボード画面の axe 違反 0 件 (WCAG 2.2 AA) と
 * server page の構成 (SYS-BUILD-PIPELINE-BOARD-P05 / docs/frontend-spec.md S13 / qa-021 / qa-022)。
 *
 * feedback-loop の `tests/feedback-loop/a11y-screens.test.tsx` と同じ構造
 * (jsdom + renderToStaticMarkup + axe-core) を S13 へ適用する。
 * `BuildBoard` は 'use client' でデータ取得を useEffect 内に持つため、SSR では初期状態
 * (「読み込み中です…」) が描画される — これはブラウザが最初に受け取る HTML と同じ状態であり、
 * 工程ボードの a11y はここと、fetch 解決後の両方を見る必要がある。
 */
import { BUILD_STAGE_ORDER } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { BuildBoard } from '../../app/(dashboard)/builds/build-board.js';
import BuildsPage from '../../app/(dashboard)/builds/page.js';

// server page は `resolveDashboardScope` 経由で `cookies()` を無条件に呼ぶ (静的化を防ぐため)。
// ここは request scope の外で SSR するので空 cookie を差す。
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const TENANT_ID = 'tenant-a';
const WORKSPACE_ID = 'ws-a1';

/** SSR 済み HTML を jsdom の document へ載せる。landmark 込みで検査するため main で包む。 */
function mountScreen(node: ReactNode): void {
  const html = renderToStaticMarkup(
    <html lang="ja">
      <body>
        <main>
          <UiProvider>{node}</UiProvider>
        </main>
      </body>
    </html>,
  );
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');

  const title = parsed.createElement('title');
  title.textContent = '構築パイプライン';
  parsed.head.appendChild(title);

  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

async function violationsOf(): Promise<readonly string[]> {
  const results = await axe.run(document, { resultTypes: ['violations'] });
  return results.violations.map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`);
}

describe('BPB-A11Y: S13 工程ボードの axe 違反 0 件', () => {
  it('BPB-A11Y-001: 初期表示 (読み込み中) に axe 違反が無い', async () => {
    mountScreen(<BuildBoard tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} stageOrder={BUILD_STAGE_ORDER} />);

    expect(await violationsOf()).toEqual([]);
  });

  it('BPB-A11Y-002: server page 全体 (見出し + ボード) に axe 違反が無い', async () => {
    mountScreen(await BuildsPage({ searchParams: Promise.resolve({ tenant: TENANT_ID, workspace: WORKSPACE_ID }) }));

    expect(await violationsOf()).toEqual([]);
  });
});

describe('BPB-PAGE: S13 server page の構成', () => {
  it('BPB-PAGE-001: 見出しと工程移動の権限説明を描画する', async () => {
    const html = renderToStaticMarkup(
      <UiProvider>
        {await BuildsPage({ searchParams: Promise.resolve({ tenant: TENANT_ID, workspace: WORKSPACE_ID }) })}
      </UiProvider>,
    );

    expect(html).toContain('構築パイプライン');
    expect(html).toContain('工程の移動は管理者のみ行えます');
  });

  it('BPB-PAGE-002: tenant/workspace 未指定でも描画できる (scope 未解決でも画面は落とさない)', async () => {
    const html = renderToStaticMarkup(
      <UiProvider>{await BuildsPage({ searchParams: Promise.resolve({}) })}</UiProvider>,
    );

    expect(html).toContain('構築パイプライン');
  });
});
