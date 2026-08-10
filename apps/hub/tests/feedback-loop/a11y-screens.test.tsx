// @vitest-environment jsdom
// FL-A11Y-*: S14 (フィードバック一覧/詳細/新規フォーム) の axe 違反 0 件 (WCAG 2.2 AA)。
//
// hearing-intake の `tests/hearing-intake/a11y-screens.test.tsx` と同じ構造 (jsdom +
// renderToStaticMarkup + axe-core) を、既存の実コンポーネント (`src/app/(dashboard)/feedback/**`)
// 向けに適用する。P04 の静的検査 (rest-zod-authz-mw.test.ts 等) は route/schema の契約を守るが、
// 「実際に描画した DOM に違反が無いか」は検査していなかった (P05→P06 で実行テストへ昇格すべき欠落)。
//
// 各画面は 'use client' コンポーネントで、データ取得は useEffect 内 (SSR の
// renderToStaticMarkup では実行されない)。そのため一覧・フォームは初期状態、詳細は
// 「読み込み中です…」の初期状態を検査する — これは実際にブラウザが最初に配る HTML と同じ状態。

import { UiProvider } from '@harness-hub/ui';
import axe from 'axe-core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { FeedbackDetail } from '../../src/app/(dashboard)/feedback/[id]/feedback-detail.js';
import FeedbackDetailPage from '../../src/app/(dashboard)/feedback/[id]/page.js';
import { FeedbackList } from '../../src/app/(dashboard)/feedback/feedback-list.js';
import { FeedbackForm } from '../../src/app/(dashboard)/feedback/new/feedback-form.js';
import FeedbackNewPage from '../../src/app/(dashboard)/feedback/new/page.js';
import FeedbackPage from '../../src/app/(dashboard)/feedback/page.js';

// server page は `resolveDashboardScope` 経由で `cookies()` を無条件に呼ぶ (呼び出し元 page の静的化を防ぐため。
// 理由は src/lib/routing/dashboard-scope.ts のコメント参照)。ここは request scope の外で SSR するので空 cookie を差す。
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
  title.textContent = 'フィードバック';
  parsed.head.appendChild(title);

  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

async function violationsOf(): Promise<readonly string[]> {
  const results = await axe.run(document, { resultTypes: ['violations'] });
  return results.violations.map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`);
}

describe('FL-A11Y: S14 実コンポーネントの axe 違反 0 件', () => {
  it('FL-A11Y-001: 一覧画面 (FeedbackList) の初期表示に axe 違反が無く、絞り込みフォーム・テーブル・ページ送りが描画される', async () => {
    mountScreen(<FeedbackList tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(await violationsOf()).toEqual([]);
    expect(document.querySelector('form[aria-label="フィードバックの絞り込み"]')).not.toBeNull();
    expect(document.querySelector('table')).not.toBeNull();
    expect(document.querySelector('nav[aria-label="フィードバック一覧のページ送り"]')).not.toBeNull();
  });

  it('FL-A11Y-002: 詳細画面 (FeedbackDetail) の初期表示 (読み込み中) に axe 違反が無い', async () => {
    mountScreen(<FeedbackDetail id="fb-1" tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(await violationsOf()).toEqual([]);
    expect(document.body.textContent).toContain('読み込み中です');
  });

  it('FL-A11Y-003: 新規フォーム画面 (FeedbackForm) の初期表示に axe 違反が無く、必須 3 入力欄が描画される', async () => {
    mountScreen(<FeedbackForm tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    expect(await violationsOf()).toEqual([]);
    const form = document.querySelector('form[aria-label="改善要望フォーム"]');
    expect(form).not.toBeNull();
    // project_id (TextInput) / type・priority (Select) / body (Textarea) の 4 フィールドが揃っている
    expect(document.querySelectorAll('input, select, textarea')).toHaveLength(4);
    for (const field of document.querySelectorAll('input, textarea')) {
      expect(field.getAttribute('id')).not.toBeNull();
      expect(document.querySelector(`label[for="${field.getAttribute('id')}"]`)).not.toBeNull();
    }
  });

  it('FL-A11Y-004: 新規フォームの送信ボタンは初期状態で活性化していない (project_id/body が空)', () => {
    mountScreen(<FeedbackForm tenantId={TENANT_ID} workspaceId={WORKSPACE_ID} />);

    const submit = document.querySelector('button[type="submit"]');
    expect(submit).not.toBeNull();
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('FL-PAGE: dashboard の 3 画面を query/params から構成する', () => {
  it('FL-PAGE-001: 一覧 page は tenant/workspace を新規報告リンクと FeedbackList へ渡す', async () => {
    const list = renderToStaticMarkup(
      <UiProvider>
        {await FeedbackPage({ searchParams: Promise.resolve({ tenant: TENANT_ID, workspace: WORKSPACE_ID }) })}
      </UiProvider>,
    );
    expect(list).toContain(`/feedback/new?tenant=${TENANT_ID}&amp;workspace=${WORKSPACE_ID}`);
    expect(list).toContain('改善要望フィードバック');
  });

  it('FL-PAGE-002: 一覧 page は tenant/workspace 未指定でも空文字で構成できる', async () => {
    const list = renderToStaticMarkup(
      <UiProvider>{await FeedbackPage({ searchParams: Promise.resolve({}) })}</UiProvider>,
    );
    expect(list).toContain('/feedback/new?tenant=&amp;workspace=');
  });

  it('FL-PAGE-003: 詳細 page は params/searchParams から id/tenant/workspace を FeedbackDetail へ渡す', async () => {
    const detail = renderToStaticMarkup(
      <UiProvider>
        {
          await FeedbackDetailPage({
            params: Promise.resolve({ id: 'fb-1' }),
            searchParams: Promise.resolve({ tenant: TENANT_ID, workspace: WORKSPACE_ID }),
          })
        }
      </UiProvider>,
    );
    expect(detail).toContain('読み込み中です');
  });

  it('FL-PAGE-004: 新規報告 page は見出しと説明文を描画し FeedbackForm を構成する', async () => {
    const form = renderToStaticMarkup(
      <UiProvider>
        {await FeedbackNewPage({ searchParams: Promise.resolve({ tenant: TENANT_ID, workspace: WORKSPACE_ID }) })}
      </UiProvider>,
    );
    expect(form).toContain('改善要望を報告');
    expect(form).toContain('改善要望フォーム');
  });
});
