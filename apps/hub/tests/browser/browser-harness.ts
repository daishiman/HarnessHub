/**
 * 実ブラウザ (Chromium) 検証ハーネス。
 *
 * jsdom はレイアウト計算を持たないため、`getBoundingClientRect()` は常に 0、
 * `getComputedStyle()` も CSS カスタムプロパティを解決しない。つまり
 * 「横スクロールが出ている」「タップ域が 44px 未満」「文字が枠から溢れた」は
 * 既存のテスト経路では原理的に検出できない。ここはその欠けた計測手段を与える層。
 *
 * 方針:
 * - hub の画面は React の静的レンダリング結果を HTML 文書として組み立て、
 *   ローカル HTTP サーバで配って `http://` の URL として開く。`setContent()` を
 *   使わないのは、相対 URL や `:visited` などの挙動が実ブラウザと食い違うため。
 * - ブラウザ実体はローカルキャッシュを再利用する。無い場合は暗黙 skip せず失敗させる
 *   (skip にすると「検査していない」を「違反 0 件」と読み違える)。
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { buildTokenCssArtifact } from '@harness-hub/ui';
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** 検証したい 3 幅。実機の下限 (iPhone SE 相当)・タブレット・デスクトップ。 */
export const viewportPresets = {
  mobile: { width: 360, height: 800 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;
export type ViewportName = keyof typeof viewportPresets;

export interface Viewport {
  width: number;
  height: number;
}

export interface BrowserRoute {
  /** 先頭 `/` 付きのパス。 */
  path: string;
  /** ページの中身。`<body>` 直下へ入る。 */
  body: ReactNode;
  /** `<title>`。 */
  title?: string | undefined;
  /** テーマ。`dark` を渡すと `data-theme="dark"` を付ける。 */
  theme?: 'light' | 'dark' | undefined;
  /** 表示密度。`compact` を渡すと `data-density="compact"` を付ける。 */
  density?: 'comfortable' | 'compact' | undefined;
}

export interface ElementMetrics {
  /** マッチした要素の出現順の添字。 */
  index: number;
  /** ビューポート座標系の矩形。 */
  box: { x: number; y: number; width: number; height: number };
  /** `styleProps` で要求した computed style の値。 */
  styles: Record<string, string>;
  /** 可視テキスト (前後空白を除去済み)。 */
  text: string;
}

export interface DocumentMetrics {
  scrollWidth: number;
  clientWidth: number;
  /** 横スクロールが発生しているか。1px の丸め差は許容する。 */
  overflowsHorizontally: boolean;
}

export interface ScrollMetrics {
  index: number;
  scrollWidth: number;
  clientWidth: number;
  /** その要素の内側で横スクロールが起きているか。 */
  overflowsHorizontally: boolean;
}

/** 画面幅を超えている要素の説明。どこが原因かを名指しするために使う。 */
export interface OverflowingElement {
  /** `main > div.foo` のような、目視で追える程度の識別子。 */
  description: string;
  /** 要素の右端 (ビューポート座標)。 */
  right: number;
  width: number;
  /** 矩形は収まっているが中身 (長い語など) が外へ出ているか。 */
  contentOverflows: boolean;
}

/**
 * 文書を組み立てる。RootLayout と同じ順序で theme -> base の 2 枚を差し込むのは、
 * ハーネス上の見え方が実アプリと食い違うと計測結果が無意味になるため。
 */
export function renderDocument(route: BrowserRoute): string {
  const attrs = [
    'lang="ja"',
    route.theme === 'dark' ? `data-theme="dark"` : '',
    route.density === 'compact' ? `data-density="compact"` : '',
  ]
    .filter((value) => value !== '')
    .join(' ');

  return [
    '<!doctype html>',
    `<html ${attrs}>`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(route.title ?? 'Harness Hub')}</title>`,
    // 本番 (RootLayout) が読む tokens.css と**同一の全文**を差し込む。
    // theme/base を個別に連結すると、出荷される CSS と視覚回帰が測る CSS が別物になりうる
    `<style>${buildTokenCssArtifact()}</style>`,
    '</head>',
    '<body>',
    renderToStaticMarkup(route.body),
    '</body>',
    '</html>',
  ].join('\n');
}

/** `<title>` へ埋める文字列の最小エスケープ。 */
function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export interface BrowserSession {
  /** 登録済みの path を開く。開けなければ例外。 */
  goto(path: string, viewport?: Viewport): Promise<void>;
  /** viewport だけ変える (再読込せずレイアウトの追従を見る)。 */
  setViewport(viewport: Viewport): Promise<void>;
  /** セレクタに一致する全要素の矩形と computed style を取る。 */
  measure(selector: string, styleProps?: readonly string[]): Promise<ElementMetrics[]>;
  /** 文書全体の横方向オーバーフローを測る。 */
  documentMetrics(): Promise<DocumentMetrics>;
  /** セレクタに一致する要素「の内側」の横スクロールを測る (表を入れた箱が実際に効いているか)。 */
  scrollMetrics(selector: string): Promise<ScrollMetrics[]>;
  /** 画面幅を超えている要素を列挙する。オーバーフロー検出時の原因特定に使う。 */
  overflowingElements(): Promise<OverflowingElement[]>;
  /** PNG スクリーンショット (VRT 用)。 */
  screenshot(options?: { fullPage?: boolean }): Promise<Buffer>;
  /** 生の Playwright Page。上の API で足りない場合の逃げ道。 */
  page: Page;
}

export interface BrowserSessionOptions {
  routes: readonly BrowserRoute[];
  /** 既定の viewport。 */
  viewport?: Viewport | undefined;
}

/**
 * ブラウザとローカルサーバを起こし、`run` へセッションを渡して必ず後始末する。
 *
 * 起動コストが高い (数百 ms) ため、テスト側は 1 回の呼び出しで複数 path・複数 viewport を
 * 回すことを想定している。ここで `try/finally` を握るのは、失敗時にブラウザプロセスと
 * ポートが残ると後続のテスト実行がハングするため。
 */
export async function withBrowserSession<T>(
  options: BrowserSessionOptions,
  run: (session: BrowserSession) => Promise<T>,
): Promise<T> {
  const documents = new Map<string, string>();
  for (const route of options.routes) {
    if (!route.path.startsWith('/')) {
      throw new Error(`route.path は先頭 '/' が必要: ${route.path}`);
    }
    documents.set(route.path, renderDocument(route));
  }

  const server = await startServer(documents);
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  try {
    browser = await chromium.launch();
    context = await browser.newContext({
      viewport: options.viewport ?? viewportPresets.desktop,
      // 動きの抑制は既定にしておく。アニメーション途中の値を測ると計測が不安定になる。
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const origin = serverOrigin(server);

    const session: BrowserSession = {
      page,
      async goto(path, viewport) {
        if (!documents.has(path)) {
          throw new Error(`未登録の path: ${path} (登録済み: ${[...documents.keys()].join(', ')})`);
        }
        if (viewport !== undefined) {
          await page.setViewportSize(viewport);
        }
        const response = await page.goto(`${origin}${path}`, { waitUntil: 'load' });
        if (response === null || !response.ok()) {
          throw new Error(`${path} の取得に失敗: status=${response?.status() ?? 'none'}`);
        }
      },
      async setViewport(viewport) {
        await page.setViewportSize(viewport);
      },
      async measure(selector, styleProps = []) {
        return page.evaluate(
          ({ selector: sel, props }) =>
            [...document.querySelectorAll(sel)].map((element, index) => {
              const rect = element.getBoundingClientRect();
              const computed = window.getComputedStyle(element);
              const styles: Record<string, string> = {};
              for (const prop of props) {
                styles[prop] = computed.getPropertyValue(prop).trim();
              }
              return {
                index,
                box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                styles,
                text: (element.textContent ?? '').trim(),
              };
            }),
          { selector, props: [...styleProps] },
        );
      },
      async documentMetrics() {
        return page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = document.documentElement.clientWidth;
          return {
            scrollWidth,
            clientWidth,
            // 1px はブラウザの丸めで日常的に出るため、それ以下は overflow としない。
            overflowsHorizontally: scrollWidth - clientWidth > 1,
          };
        });
      },
      async scrollMetrics(selector) {
        return page.evaluate(
          (sel) =>
            [...document.querySelectorAll(sel)].map((element, index) => ({
              index,
              scrollWidth: element.scrollWidth,
              clientWidth: element.clientWidth,
              overflowsHorizontally: element.scrollWidth - element.clientWidth > 1,
            })),
          selector,
        );
      },
      async overflowingElements() {
        return page.evaluate(() => {
          const limit = document.documentElement.clientWidth;
          const describe = (element: Element): string => {
            const tag = element.tagName.toLowerCase();
            const id = element.id === '' ? '' : `#${element.id}`;
            // data-hh-* は design system 側の部品名にあたるので、原因の特定に最も効く
            const marker = [...element.attributes].find((attribute) => attribute.name.startsWith('data-hh-'));
            return `${tag}${id}${marker === undefined ? '' : `[${marker.name}]`}`;
          };
          return [...document.querySelectorAll('body *')]
            .map((element) => {
              const rect = element.getBoundingClientRect();
              // 矩形が画面幅に収まっていても、折り返せない長い語のように「中身だけが外へ出る」
              // 場合がある。この形は right では捕まらず document の scrollWidth にだけ現れるため、
              // 内側の溢れ (overflow-x が visible のまま scrollWidth を超えている) も原因として拾う。
              const contentOverflows =
                element.scrollWidth - element.clientWidth > 1 &&
                window.getComputedStyle(element).overflowX === 'visible';
              return {
                description: describe(element),
                right: rect.right,
                width: rect.width,
                contentOverflows,
              };
            })
            .filter((entry) => entry.right - limit > 1 || entry.contentOverflows);
        });
      },
      async screenshot(screenshotOptions) {
        return page.screenshot({ fullPage: screenshotOptions?.fullPage ?? true, type: 'png' });
      },
    };

    return await run(session);
  } finally {
    await context?.close();
    await browser?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/** 登録済み文書だけを返す最小サーバ。未登録 path は 404 にして「静かに空ページ」を防ぐ。 */
async function startServer(documents: ReadonlyMap<string, string>): Promise<Server> {
  const server = createServer((request, response) => {
    const path = (request.url ?? '/').split('?')[0] ?? '/';
    const html = documents.get(path);
    if (html === undefined) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(`unknown path: ${path}`);
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(html);
  });
  await new Promise<void>((resolve) => {
    // 127.0.0.1 に固定してポート 0 (OS 任せ) で開く。並列実行時のポート衝突を避けるため。
    server.listen(0, '127.0.0.1', () => resolve());
  });
  return server;
}

function serverOrigin(server: Server): string {
  const address = server.address() as AddressInfo | null;
  if (address === null) {
    throw new Error('サーバの待受アドレスを取得できない');
  }
  return `http://127.0.0.1:${address.port}`;
}
