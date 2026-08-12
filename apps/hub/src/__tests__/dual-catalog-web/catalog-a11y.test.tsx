// @vitest-environment jsdom
/**
 * DC-A11Y-01..07 / DC-RESP-01: WCAG 2.2 AA と axe 違反 0 (qa-018 / acceptance 1)。
 *
 * 検査対象は「layout でラップした実画面」。既存 `tests/a11y/hub-screens.spec.ts` と同じ形にしてある。
 * ただし catalog 画面は client component が effect で取得した後に本体が現れるため、
 * SSR HTML を document へ載せたうえで**実際に mount して effect を流し切ってから**検査する。
 * loading 状態だけを検査すると「中身が無いから違反 0 件」で緑になる (DC-A11Y-05 の Goodhart 回避)。
 */
import type {
  CatalogDetail as CatalogDetailView,
  CatalogEntry,
  PublishRequestView,
  ReleaseView,
} from '@harness-hub/schemas';
import { isoDateTimeSchema } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import axe from 'axe-core';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CatalogDetailPage from '../../app/(workspace)/catalog/[projectId]/page.js';
import CatalogListPage from '../../app/(workspace)/catalog/page.js';
import CatalogReleasesPage from '../../app/(workspace)/catalog/releases/page.js';
import RootLayout from '../../app/layout.js';

// next/font はビルド時にフォントを取得する仕組みで、テストプロセスでは動かない。
// 骨格の検査が目的なので、CSS 変数名だけを返す薄い偽物へ差し替える。
vi.mock('next/font/google', () => ({
  Noto_Sans_JP: () => ({ variable: 'hh-test-font', className: 'hh-test-font-class' }),
}));

/** catalog は (workspace) 配下。本番と同じく業務シェルが main ランドマークを持つ。 */
const { HubShell } = await import('../../components/shell/hub-shell.js');

// server page は `resolveDashboardScope` 経由で `cookies()` を無条件に呼ぶ (呼び出し元 page の静的化を防ぐため。
// 理由は src/lib/routing/dashboard-scope.ts のコメント参照)。ここは request scope の外で SSR するので空 cookie を差す。
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const SCOPE_QUERY = { tenant: 'tenant-a', workspace: 'workspace-a1' };

/** 日時は brand 型。schema を通して作り、契約に載る形だけを fixture に使う。 */
const AT = isoDateTimeSchema.parse('2026-08-01T00:00:00.000Z');

const ENTRY: CatalogEntry = {
  project_id: 'proj-invoice',
  name: '請求書ドラフト作成',
  summary: '前月の実績から請求書の下書きを作ります。',
  target: 'skill',
  visibility: 'workspace',
  stable_version: 'v3',
  release_status: 'available',
  download_count: 12,
  updated_at: AT,
};

const DETAIL: CatalogDetailView = {
  project_id: ENTRY.project_id,
  name: ENTRY.name,
  summary: ENTRY.summary,
  target: 'skill',
  visibility: 'workspace',
  stable_version: 'v3',
  stable_release_id: 'rel-3',
  release_status: 'available',
  download_count: 12,
  updated_at: AT,
  launch_url: null,
};

const RELEASE: ReleaseView = {
  id: 'rel-3',
  project_id: ENTRY.project_id,
  channel_id: 'ch-1',
  version: 'v3',
  package_hash: 'sha256-0123456789abcdef',
  status: 'available',
  created_by: 'user-1',
  created_at: AT,
};

/** 終端状態を返す。ポーリングが 1 往復で止まり、テストにタイマーが残らない。 */
const PUBLISH_REQUEST: PublishRequestView = {
  id: 'pub-1',
  project_id: ENTRY.project_id,
  channel_id: 'ch-1',
  status: 'published',
  verdict: 'green',
  findings: [],
  release_id: RELEASE.id,
  content_hash: 'sha256-abc',
  requested_by: 'user-1',
  created_at: AT,
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

/** 実 API (feat-publish-pipeline 所有) の代わりに、契約どおりの応答を返す。 */
function stubCatalogApi(status: number | null = null): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown) => {
      if (status !== null) return new Response('{}', { status });
      const url = String(input);
      if (url.includes('/releases')) return jsonResponse({ items: [RELEASE], next_cursor: null });
      if (url.includes('/publish/')) return jsonResponse(PUBLISH_REQUEST);
      if (/\/harnesses\/[^/?]+$/.test(url)) return jsonResponse(DETAIL);
      if (url.includes('/harnesses')) return jsonResponse({ items: [ENTRY], next_cursor: null });
      throw new Error(`テストが想定していない要求: ${url}`);
    }),
  );
}

let activeRoot: Root | null = null;

/** SSR HTML を document へ載せ替える (layout の <html lang> ごと検査対象にする)。 */
function mountDocument(html: string, title: string): void {
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');
  const titleElement = parsed.createElement('title');
  titleElement.textContent = title;
  parsed.head.appendChild(titleElement);
  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

/**
 * 実画面を layout ごと描画し、effect の取得が終わった状態にする。
 *
 * SSR HTML を土台にするのは `<html lang>`・skip link・ランドマークを本番と同じにするため。
 * その `<main>` の中身だけを client として mount し直し、取得後の DOM を検査対象にする。
 */
async function renderScreen(screen: ReactElement, title: string): Promise<Root> {
  // root layout は骨格を持たない (公開画面と業務画面で骨格が違うため)。
  // 業務画面の main / nav / footer は HubShell が持つので、本番と同じ入れ子で描画する。
  mountDocument(
    renderToStaticMarkup(
      createElement(
        RootLayout,
        null,
        // HubShellProps は children を必須で要求するため、createElement の可変長引数ではなく
        // JSX の入れ子で渡す (createElement 経路だと props 側に children が無いと型が合わない)
        <HubShell
          accountName="user-1"
          accountRole="member"
          scope={{ tenantId: SCOPE_QUERY.tenant, workspaceId: SCOPE_QUERY.workspace }}
        >
          {screen}
        </HubShell>,
      ),
    ),
    title,
  );

  const main = document.querySelector('main');
  if (main === null) throw new Error('main ランドマークが描画されていません');
  main.replaceChildren();

  const root = createRoot(main);
  activeRoot = root;
  await act(async () => {
    root.render(createElement(UiProvider, null, screen));
  });
  // /catalog・/sheets は next/dynamic (ssr:false) で本体を遅延読み込みする。
  // ここで解決を待ち切らないと、後続の検査がすべて loading fallback を見てしまう。
  await flushAsync();
  return root;
}

/**
 * 保留中の非同期処理 (next/dynamic の import 解決・ポーリング 1 往復) を流し切る。
 * マイクロタスク 1 回では動的読み込みの loading fallback が残り、中身が空のまま検査してしまう。
 */
async function flushAsync(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  }
}

/**
 * 詳細画面の公開状態タブを開き、中身が現れるまで待つ。
 * `Tabs` は非選択パネルも要素としては残す (hidden) ため、選択中のパネルを明示的に取り出す。
 */
async function openPublishTab(): Promise<{ tab: HTMLElement; panel: HTMLElement }> {
  const publishTab = [...document.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent === '公開状態');
  if (publishTab === undefined) throw new Error('公開状態タブがありません');
  await act(async () => {
    (publishTab as HTMLElement).click();
  });
  await flushAsync();

  const panel = document.querySelector('[role="tabpanel"]:not([hidden])');
  if (panel === null) throw new Error('表示中の tabpanel がありません');
  return { tab: publishTab as HTMLElement, panel: panel as HTMLElement };
}

async function expectNoAxeViolations(): Promise<void> {
  // 検査中に遅れて届いた更新も act の管理下に置く (検査対象 DOM が途中で変わらないようにする)。
  // act は戻り値を渡さない型なので、結果は box 経由で受け取る
  const box: { value: axe.AxeResults | null } = { value: null };
  await act(async () => {
    box.value = await axe.run(document);
  });
  const results = box.value;
  if (results === null) throw new Error('axe の結果が得られませんでした');

  const formatted = results.violations
    .map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`)
    .join('\n');
  expect(formatted).toBe('');
  expect(results.violations).toHaveLength(0);
}

async function listScreen(): Promise<ReactElement> {
  return CatalogListPage({ searchParams: Promise.resolve(SCOPE_QUERY) });
}

async function detailScreen(publish?: string): Promise<ReactElement> {
  return CatalogDetailPage({
    params: Promise.resolve({ projectId: ENTRY.project_id }),
    searchParams: Promise.resolve(publish === undefined ? SCOPE_QUERY : { ...SCOPE_QUERY, publish }),
  });
}

async function releasesScreen(): Promise<ReactElement> {
  return CatalogReleasesPage({ searchParams: Promise.resolve({ ...SCOPE_QUERY, project: ENTRY.project_id }) });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  stubCatalogApi();
});

afterEach(async () => {
  const root = activeRoot;
  activeRoot = null;
  if (root !== null) await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('DC-A11Y / catalog 画面の a11y', () => {
  it('DC-A11Y-01: S01 一覧に axe 違反が無い', async () => {
    await renderScreen(await listScreen(), '業務ツール一覧 | Harness Hub');
    await expectNoAxeViolations();
  });

  it('DC-A11Y-02: S02 詳細に axe 違反が無い', async () => {
    await renderScreen(await detailScreen(), '業務ツール詳細 | Harness Hub');
    await expectNoAxeViolations();
  });

  it('DC-A11Y-03: S03 公開状態タブに axe 違反が無く role/aria-selected を持つ', async () => {
    await renderScreen(await detailScreen('pub-1'), '業務ツール詳細 | Harness Hub');

    const tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual(['概要', '公開状態', 'リリース履歴']);
    // 選択状態は見た目ではなく aria-selected で伝える。全タブが値を持つこと (未設定は「不明」になる)
    for (const tab of tabs) expect(['true', 'false']).toContain(tab.getAttribute('aria-selected'));
    expect(tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1);

    const { tab: publishTab, panel } = await openPublishTab();

    expect(publishTab.getAttribute('aria-selected')).toBe('true');
    // 動的読み込みの loading 表示のまま検査しない (中身が無ければ違反も出ない)
    expect(panel.textContent ?? '').toContain('公開状態');
    await expectNoAxeViolations();
  });

  it('DC-A11Y-04: S04 Release 履歴に axe 違反が無い', async () => {
    await renderScreen(await releasesScreen(), 'リリース履歴 | Harness Hub');
    await expectNoAxeViolations();
  });
});

describe('DC-A11Y / 検査対象が実在すること', () => {
  it('DC-A11Y-05: 見出し・ランドマーク・行データが実際に描画されている', async () => {
    await renderScreen(await listScreen(), '業務ツール一覧 | Harness Hub');

    // 「何も無いページなら違反 0 件」で通ってしまう Goodhart 化を防ぐ
    expect(document.documentElement.getAttribute('lang')).toBe('ja');
    expect(document.title).not.toBe('');
    expect(document.querySelector('main')).not.toBeNull();
    expect(document.querySelectorAll('h1, h2').length).toBeGreaterThan(0);
    expect(document.querySelector('a[href="#main"]')).not.toBeNull();

    // 行データ: loading スケルトンではなく取得結果が出ていること
    const rows = document.querySelectorAll('main table tbody tr');
    expect(rows).toHaveLength(1);
    expect(document.querySelector('main table')?.getAttribute('aria-busy')).toBeNull();
    expect(rows[0]?.textContent ?? '').toContain(ENTRY.name);
    expect(document.querySelector('main table caption')?.textContent).toBe('業務ツール一覧');
  });

  it('DC-A11Y-05: 詳細と履歴も取得結果を描画している', async () => {
    await renderScreen(await detailScreen(), '業務ツール詳細 | Harness Hub');
    expect(document.querySelector('main h1')?.textContent).toBe(DETAIL.name);
    expect(document.querySelector('main')?.textContent ?? '').toContain(DETAIL.summary);

    const detailRoot = activeRoot;
    activeRoot = null;
    if (detailRoot !== null) await act(async () => detailRoot.unmount());

    await renderScreen(await releasesScreen(), 'リリース履歴 | Harness Hub');
    const rows = document.querySelectorAll('main table tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.textContent ?? '').toContain(RELEASE.version);
  });
});

describe('DC-NAV / 遷移での scope 保持', () => {
  it('DC-NAV-01: 一覧から詳細へのリンクが tenant/workspace を落とさない', async () => {
    await renderScreen(await listScreen(), '業務ツール一覧 | Harness Hub');

    const link = document.querySelector<HTMLAnchorElement>(`main table tbody a[href*="${ENTRY.project_id}"]`);
    expect(link, '詳細への遷移リンクが無い').not.toBeNull();

    // 詳細画面は scope を URL から読む。落とすと遷移した先が毎回
    // 「Workspace が特定できません」になり、一覧からの導線が全滅する (2026-08-01 実測の退行)
    const url = new URL(link?.getAttribute('href') ?? '', 'https://hub.example');
    expect(url.pathname).toBe(`/catalog/${ENTRY.project_id}`);
    expect(url.searchParams.get('tenant')).toBe(SCOPE_QUERY.tenant);
    expect(url.searchParams.get('workspace')).toBe(SCOPE_QUERY.workspace);
  });
});

describe('DC-A11Y / 更新と縮退の告知', () => {
  it('DC-A11Y-06: ポーリング更新箇所は aria-live="polite" で assertive を使わない', async () => {
    await renderScreen(await detailScreen('pub-1'), '業務ツール詳細 | Harness Hub');
    const { panel } = await openPublishTab();

    expect(panel.querySelector('[aria-live="polite"]')).not.toBeNull();
    // assertive は読み上げを中断する。状況更新の通知で使うと操作の邪魔になる (qa-018)
    expect(panel.querySelector('[aria-live="assertive"]')).toBeNull();
    expect(panel.querySelector('[role="alert"]')).toBeNull();
  });

  it('DC-A11Y-07: 縮退バナーが読み上げ可能で、閲覧を妨げない', async () => {
    stubCatalogApi(503);
    await renderScreen(await listScreen(), '業務ツール一覧 | Harness Hub');

    const banner = document.querySelector('main [role="status"]');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('aria-live')).toBe('polite');
    expect(banner?.textContent ?? '').toContain('導入済みのツールはそのまま使えます');
    // 縮退は「壊れた」ではない。role="alert" で割り込むと平常運転が障害に見える
    expect(document.querySelector('main [role="alert"]')).toBeNull();
    await expectNoAxeViolations();
  });
});

describe('DC-RESP / レスポンシブ', () => {
  it('DC-RESP-01: 1280×800 と 390×844 で DOM 出力が同一 (切替は CSS のみ)', async () => {
    const screen = await listScreen();
    const root = await renderScreen(screen, '業務ツール一覧 | Harness Hub');
    const main = document.querySelector('main');
    if (main === null) throw new Error('main ランドマークが描画されていません');

    /** 同一 root で描き直す。root を作り直すと useId の採番が変わり、比較が幅以外の理由で崩れる。 */
    const renderAt = async (width: number, height: number): Promise<string> => {
      vi.stubGlobal('innerWidth', width);
      vi.stubGlobal('innerHeight', height);
      await act(async () => {
        root.render(createElement(UiProvider, null, screen));
      });
      return main.innerHTML;
    };

    expect(await renderAt(390, 844)).toBe(await renderAt(1280, 800));
  });

  it('DC-RESP-01: viewport を JS で読んで出し分けていない', async () => {
    const { readdir, readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const dir = path.resolve(import.meta.dirname, '../../components/catalog');
    const files = (await readdir(dir)).filter((file) => file.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(0);

    // ADR §4.2: 切替は CSS のみ。JS で分岐させると SSR と client で DOM が変わり、
    // 「片方の viewport でしか出ない要素」が a11y 検査をすり抜ける
    for (const file of files) {
      const source = await readFile(path.join(dir, file), 'utf8');
      for (const token of ['matchMedia', 'innerWidth', 'useMediaQuery', 'window.screen']) {
        expect(source, `${file} が viewport を JS で読んでいる (${token})`).not.toContain(token);
      }
    }
  });
});
