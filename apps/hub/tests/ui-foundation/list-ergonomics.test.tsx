/** @vitest-environment jsdom */
/**
 * LISTERG-01〜05: 一覧の使い勝手 (HarnessHub-2mu6)。
 *
 * ここで固定するのは、戻しても画面が一見動いてしまう 4 点。
 * 列の並び・左端の貼り付き・並べ替えの基準・絞り込み条件の記憶はどれも
 * 「無くても表は出る」ため、目視の確認では抜けに気づけない。
 */
import { UiProvider } from '@harness-hub/ui';
import { act, createElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentList } from '../../src/app/(dashboard)/docs/document-list.js';
import { HearingSheetList } from '../../src/app/(dashboard)/sheets/hearing-sheet-list.js';
import { UserList } from '../../src/app/(dashboard)/users/user-list.js';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(node: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  await act(async () => {
    createRoot(container).render(createElement(UiProvider, null, node));
  });
  return container;
}

function stubFetch(handler: (url: string) => unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => Response.json(handler(url) as Record<string, unknown>)),
  );
}

/** 見出しの文言。並べ替えボタンに付く「↕並び替え」の読み上げ用文言は落とす。 */
const headerTexts = (container: HTMLElement): string[] =>
  [...container.querySelectorAll('thead th')].map((cell) => (cell.textContent ?? '').replace(/↕.*$/, ''));

const columnTexts = (container: HTMLElement, index: number): string[] =>
  [...container.querySelectorAll('tbody tr')].map((row) => row.querySelectorAll('td')[index]?.textContent ?? '');

async function clickHeader(container: HTMLElement, header: string): Promise<void> {
  const target = [...container.querySelectorAll('thead th')].find((cell) => cell.textContent?.includes(header));
  const button = target?.querySelector('button');
  if (button === null || button === undefined) throw new Error(`並べ替えできる見出し "${header}" がありません`);
  await act(async () => {
    button.click();
  });
}

function sheet(id: string, code: string, status: string, updatedAt: string): Record<string, unknown> {
  return {
    id,
    code,
    title: `${code} の業務`,
    status,
    domain: '営業',
    department: '営業部',
    people: 3,
    hours: 12,
    applicant: { id: `u-${id}`, name: '山田 太郎' },
    updated_at: updatedAt,
  };
}

describe('LISTERG: 一覧の使い勝手', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
    document.body.replaceChildren();
  });

  it('LISTERG-01: 利用者一覧は 氏名 → 状態 → 部門 → ロール の順で、氏名列が左端に貼り付く', async () => {
    stubFetch(() => ({
      items: [{ id: 'u1', name: '山田 太郎', department: '営業', role: 'member', status: 'active' }],
    }));
    const container = await mount(createElement(UserList, { tenantId: 'tenant-a' }));

    // 在籍の状態は行の読み方そのものを変えるので、属性 2 列より前に出す
    expect(headerTexts(container)).toEqual(['氏名', '状態', '部門', 'ロール']);

    const nameHeader = container.querySelector('thead th')?.getAttribute('style') ?? '';
    expect(nameHeader).toContain('inset-inline-start: 0');
    const nameCell = container.querySelector('tbody td')?.getAttribute('style') ?? '';
    expect(nameCell).toContain('position: sticky');
  });

  it('LISTERG-02: ヒアリングシート一覧は行を名指しする列が先頭で、左端に貼り付く', async () => {
    stubFetch(() => ({ items: [sheet('s1', 'HS-001', 'received', '2026-08-01T00:00:00.000Z')], next_cursor: null }));
    const container = await mount(createElement(HearingSheetList, { tenantId: 't', workspaceId: 'w' }));

    expect(headerTexts(container)[0]).toContain('シート番号');
    expect(container.querySelector('tbody td')?.getAttribute('style') ?? '').toContain('position: sticky');
  });

  it('LISTERG-03: 状態の並べ替えは五十音ではなく受付→生成中→レビュー待ち→完了の順になる', async () => {
    stubFetch(() => ({
      items: [
        sheet('s1', 'HS-001', 'completed', '2026-08-01T00:00:00.000Z'),
        sheet('s2', 'HS-002', 'received', '2026-08-02T00:00:00.000Z'),
        sheet('s3', 'HS-003', 'review', '2026-08-03T00:00:00.000Z'),
      ],
      next_cursor: null,
    }));
    const container = await mount(createElement(HearingSheetList, { tenantId: 't', workspaceId: 'w' }));

    await clickHeader(container, '状態');

    // 先頭列 (シート番号) の並びで、状態の昇順が手順の順になっていることを見る
    expect(columnTexts(container, 0).map((text) => text.slice(0, 6))).toEqual(['HS-002', 'HS-003', 'HS-001']);
  });

  it('LISTERG-04: 絞り込み条件は覚えられ、開き直したときに復元される', async () => {
    const requested: string[] = [];
    stubFetch((url) => {
      requested.push(url);
      return { items: [], next_cursor: null };
    });

    const container = await mount(createElement(DocumentList, { tenantId: 't', workspaceId: 'w' }));
    const select = container.querySelector<HTMLSelectElement>('select');
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (select === null || setter === undefined) throw new Error('絞り込みの選択欄がありません');
    await act(async () => {
      setter.call(select, 'common');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const form = container.querySelector('form');
    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(container.querySelector('[data-hh-applied-filter-chip]')?.textContent).toContain('スコープ: 共通');

    // 開き直しても条件が残り、最初の問い合わせから条件付きで取りにいく
    requested.length = 0;
    document.body.replaceChildren();
    const reopened = await mount(createElement(DocumentList, { tenantId: 't', workspaceId: 'w' }));

    // DocumentList には Notion の付随導線もある。絞り込み契約は docs 一覧 API だけで判定し、
    // 別の関心事の GET を一覧クエリと誤認しない。
    const reopenedDocsRequests = requested.filter((url) => url.startsWith('/api/v1/docs?'));
    expect(reopenedDocsRequests.length).toBeGreaterThan(0);
    expect(reopenedDocsRequests.every((url) => url.includes('scope=common'))).toBe(true);
    expect(reopened.querySelector<HTMLSelectElement>('select')?.value).toBe('common');
    expect(reopened.querySelector('[data-hh-applied-filter-chip]')?.textContent).toContain('スコープ: 共通');
  });

  /**
   * ドキュメント一覧は「公開済みのものを更新順に見比べる」読み方をするので、広い画面では表にする。
   * 併せて、**タイトル列にだけ幅を指定しない**ことを固定する。ここに幅を入れると
   * 長い題名がその列の中だけで折り返し、行の高さが 1 行分ずれて見比べが崩れる。
   * 目視では「表は出ている」ので気づけない。
   */
  it('LISTERG-06: ドキュメント一覧は表で、タイトル列だけ幅を持たず余りを吸う', async () => {
    stubFetch(() => ({
      items: [
        {
          id: 'd1',
          title: '経費精算の手順',
          scope: 'tenant',
          status: 'published',
          updated_at: '2026-08-01T00:00:00.000Z',
        },
      ],
      next_cursor: null,
    }));
    const container = await mount(createElement(DocumentList, { tenantId: 't', workspaceId: 'w' }));

    expect(headerTexts(container)).toEqual(['タイトル', '適用範囲', '状態', '更新日時']);

    const widths = [...container.querySelectorAll('colgroup col')].map((col) => col.getAttribute('style') ?? '');
    expect(widths).toHaveLength(4);
    expect(widths[0]).not.toContain('width');
    for (const width of widths.slice(1)) expect(width).toContain('width');
  });

  it('LISTERG-05: ヘッダーの検索から開いたときは、覚えていた条件より検索語を優先する', async () => {
    window.sessionStorage.setItem(
      'harness-hub:filters:sheets',
      JSON.stringify({ status: 'completed', department: '経理部', query: '前回の語' }),
    );
    const requested: string[] = [];
    stubFetch((url) => {
      requested.push(url);
      return { items: [], next_cursor: null };
    });

    const container = await mount(
      createElement(HearingSheetList, { tenantId: 't', workspaceId: 'w', initialQuery: '請求' }),
    );

    expect(requested.every((url) => url.includes(`q=${encodeURIComponent('請求')}`))).toBe(true);
    expect(requested.some((url) => url.includes('status=completed'))).toBe(false);
    expect(container.querySelector('[data-hh-applied-filter-chip]')?.textContent).toContain('全文検索: 請求');
  });
});
