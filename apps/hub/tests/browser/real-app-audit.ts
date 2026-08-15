/**
 * 実 Next アプリの UI 完全性監査。
 *
 * route/state をここで書き直さない。DB seed と共有する COVERAGE_MATRIX を
 * 唯一の正本とし、実 route・到達 URL・state cell を導出する。
 */
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

import {
  COVERAGE_MATRIX,
  ROUTE_STATES,
  type RouteCoverage,
  type RouteState,
} from '../../../../packages/db/scripts/demo-coverage/coverage-matrix.js';

export const REAL_APP_AUDIT_WIDTHS = [360, 768, 1280] as const;
export const REAL_APP_AUDIT_THEMES = ['light', 'dark'] as const;

export type RealAppAuditWidth = (typeof REAL_APP_AUDIT_WIDTHS)[number];
export type RealAppAuditTheme = (typeof REAL_APP_AUDIT_THEMES)[number];

export interface RealAppRouteCase {
  readonly screenCode: string;
  /** Next の canonical route。動的 segment は `[id]` のまま。 */
  readonly route: string;
  /** seed の決定論 ID まで解決した実際に開く URL。 */
  readonly url: string;
}

export interface RealAppStateCell extends RealAppRouteCase {
  readonly state: RouteState;
}

export interface RealAppAuditKey extends RealAppRouteCase {
  readonly width: RealAppAuditWidth;
  readonly theme: RealAppAuditTheme;
}

export interface RealAppAuditPlan {
  readonly routes: readonly RealAppRouteCase[];
  readonly keys: readonly RealAppAuditKey[];
  /** applicable で、seed と到達手順を持つ state cell。 */
  readonly stateCells: readonly RealAppStateCell[];
  /** notApplicable も含む route × state の全 cell。 */
  readonly totalStateCells: number;
}

export interface UiIntegrityViolation {
  readonly key: string;
  readonly code: 'horizontal-overflow' | 'tap-target-under-44' | 'meaning-segment-word-break';
  readonly element: string;
  readonly detail: string;
}

export interface UnreachableAuditKey {
  readonly key: string;
  readonly status: number | null;
  readonly reason: string;
}

export interface RealAppAuditReport {
  readonly status: 'pass' | 'fail' | 'blocked';
  readonly requestedKeyCount: number;
  readonly executedKeyCount: number;
  readonly unreachable: readonly UnreachableAuditKey[];
  readonly violations: readonly UiIntegrityViolation[];
}

export interface AuditRealAppKeysOptions {
  readonly origin: string;
  readonly keys: readonly RealAppAuditKey[];
  /** 認証済み preview の場合に、値をログへ出さず Cookie を渡す。 */
  readonly cookieHeader?: string | undefined;
  readonly extraHTTPHeaders?: Readonly<Record<string, string>> | undefined;
}

/**
 * COVERAGE_MATRIX から実走計画を作る。一覧を引数に受けるのは、
 * 0 route や重複 route の fail-closed 性を、正本を改変せずテストするため。
 */
export function buildRealAppAuditPlan(matrix: readonly RouteCoverage[] = COVERAGE_MATRIX): RealAppAuditPlan {
  if (matrix.length === 0) {
    throw new Error('UI 監査の route 母数が 0 です。0 件を PASS にはできません');
  }

  const routes = matrix.map(toRouteCase);
  assertUnique(
    routes.map((route) => route.route),
    'route',
  );
  assertUnique(
    routes.map((route) => route.screenCode),
    'screenCode',
  );

  const keys = routes.flatMap((route) =>
    REAL_APP_AUDIT_WIDTHS.flatMap((width) => REAL_APP_AUDIT_THEMES.map((theme) => ({ ...route, width, theme }))),
  );

  const stateCells = matrix.flatMap((coverage) => {
    const route = toRouteCase(coverage);
    return ROUTE_STATES.flatMap((state) => (coverage.states[state].kind === 'applicable' ? [{ ...route, state }] : []));
  });

  return {
    routes,
    keys,
    stateCells,
    totalStateCells: matrix.length * ROUTE_STATES.length,
  };
}

function toRouteCase(coverage: RouteCoverage): RealAppRouteCase {
  const urls = new Set<string>();
  for (const state of ROUTE_STATES) {
    const applicability = coverage.states[state];
    if (applicability.kind !== 'applicable') continue;
    for (const step of applicability.reach) urls.add(step.url);
  }
  if (urls.size !== 1) {
    throw new Error(`${coverage.screenCode} (${coverage.route}) の到達 URL は 1 件必須です: ${[...urls].join(', ')}`);
  }
  const [url] = urls;
  if (url === undefined || !url.startsWith('/')) {
    throw new Error(`${coverage.screenCode} (${coverage.route}) の到達 URL が不正です`);
  }
  return { screenCode: coverage.screenCode, route: coverage.route, url };
}

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size > 0) {
    throw new Error(`${label} が重複しています: ${[...duplicates].join(', ')}`);
  }
}

/** app directory の page.tsx から Next の canonical route 集合を導出する。 */
export function discoverNextPageRoutes(appRoot: string): string[] {
  const pageFiles: string[] = [];
  collectPageFiles(appRoot, pageFiles);
  const routes = pageFiles.map((pageFile) => {
    const directory = relative(appRoot, join(pageFile, '..'));
    const segments = directory
      .split(sep)
      .filter((segment) => segment !== '' && !isRouteGroup(segment) && !segment.startsWith('@'));
    return segments.length === 0 ? '/' : `/${segments.join('/')}`;
  });
  assertUnique(routes, 'Next page route');
  return routes.sort();
}

function collectPageFiles(directory: string, output: string[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectPageFiles(path, output);
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      output.push(path);
    }
  }
}

function isRouteGroup(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')');
}

export function formatAuditKey(key: RealAppAuditKey): string {
  return `${key.route}|${key.width}|${key.theme}`;
}

/**
 * preview や本番相当の origin を開いて監査する。
 * HTTP 拒否・認証不足・seed 不足は「違反 0」ではなく unreachable とし、
 * 1 キーでも未実行なら status=blocked にする。
 */
export async function auditRealAppKeys(options: AuditRealAppKeysOptions): Promise<RealAppAuditReport> {
  if (options.keys.length === 0) {
    throw new Error('実アプリ UI 監査の実走キーが 0 です');
  }
  const origin = parseOrigin(options.origin);
  assertUnique(options.keys.map(formatAuditKey), '実走キー');

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  const unreachable: UnreachableAuditKey[] = [];
  const violations: UiIntegrityViolation[] = [];
  let executedKeyCount = 0;

  try {
    browser = await chromium.launch();
    context = await browser.newContext({
      reducedMotion: 'reduce',
      extraHTTPHeaders: { ...options.extraHTTPHeaders },
    });
    if (options.cookieHeader !== undefined && options.cookieHeader.trim() !== '') {
      await context.addCookies(parseCookies(options.cookieHeader, origin));
    }
    const page = await context.newPage();

    for (const key of options.keys) {
      const result = await openAuditKey(page, origin, key);
      if (result.reachable === false) {
        unreachable.push({ key: formatAuditKey(key), status: result.status, reason: result.reason });
        continue;
      }
      executedKeyCount += 1;
      violations.push(...(await collectUiIntegrityViolations(page, key)));
    }
  } finally {
    await context?.close();
    await browser?.close();
  }

  const status = violations.length > 0 ? 'fail' : executedKeyCount === options.keys.length ? 'pass' : 'blocked';
  return {
    status,
    requestedKeyCount: options.keys.length,
    executedKeyCount,
    unreachable,
    violations,
  };
}

function parseOrigin(value: string): URL {
  const origin = new URL(value);
  if (origin.protocol !== 'http:' && origin.protocol !== 'https:') {
    throw new Error(`UI 監査 origin は http(s) 必須です: ${origin.protocol}`);
  }
  if (origin.pathname !== '/' || origin.search !== '' || origin.hash !== '') {
    throw new Error(`UI 監査 origin に path/query/hash は指定できません: ${value}`);
  }
  return origin;
}

function parseCookies(cookieHeader: string, origin: URL): Parameters<BrowserContext['addCookies']>[0] {
  return cookieHeader.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) return [];
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    return name === '' ? [] : [{ name, value, url: origin.origin }];
  });
}

async function openAuditKey(
  page: Page,
  origin: URL,
  key: RealAppAuditKey,
): Promise<
  { readonly reachable: true } | { readonly reachable: false; readonly status: number | null; readonly reason: string }
> {
  try {
    await page.setViewportSize({ width: key.width, height: key.width === 768 ? 1024 : 800 });
    await page.emulateMedia({ colorScheme: key.theme, reducedMotion: 'reduce' });
    const response = await page.goto(new URL(key.url, origin).toString(), { waitUntil: 'load' });
    if (response === null) {
      return { reachable: false, status: null, reason: 'navigation response がありません' };
    }
    if (!response.ok()) {
      return { reachable: false, status: response.status(), reason: `HTTP ${response.status()}` };
    }

    // 実アプリは DB の表示設定で theme を解決する。監査の軸だけは明示値を優先し、
    // token 正本の data-theme 切替を実 DOM に対して行う。
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme;
      for (const element of document.querySelectorAll<HTMLElement>('[data-theme]')) {
        element.dataset.theme = theme;
      }
    }, key.theme);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    return { reachable: true };
  } catch (cause) {
    return {
      reachable: false,
      status: null,
      reason: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

interface BrowserViolation {
  readonly code: UiIntegrityViolation['code'];
  readonly element: string;
  readonly detail: string;
}

async function collectUiIntegrityViolations(page: Page, key: RealAppAuditKey): Promise<UiIntegrityViolation[]> {
  // `tsx` の keepNames 変換は evaluate callback 内のヘルパーに Node 側の
  // `__name` を注入する。実 preview 上でも自己完結するよう検出器を文字列で渡す。
  const browserViolations = await page.evaluate<BrowserViolation[]>(String.raw`(() => {
    const found = [];
    const viewportWidth = document.documentElement.clientWidth;
    const describe = (element) => {
      const tag = element.tagName.toLowerCase();
      const id = element.id === '' ? '' : '#' + element.id;
      const marker = [...element.attributes].find((attribute) => attribute.name.startsWith('data-hh-'));
      return tag + id + (marker === undefined ? '' : '[' + marker.name + ']');
    };
    const isVisible = (element, rect, computed) =>
      rect.width > 0 &&
      rect.height > 0 &&
      computed.display !== 'none' &&
      computed.visibility !== 'hidden' &&
      computed.opacity !== '0' &&
      !element.closest('[aria-hidden="true"]');

    if (document.documentElement.scrollWidth - viewportWidth > 1) {
      const offenders = [...document.querySelectorAll('body *')].filter((element) => {
        const rect = element.getBoundingClientRect();
        const contentOverflows =
          element.scrollWidth - element.clientWidth > 1 && window.getComputedStyle(element).overflowX === 'visible';
        return rect.right - viewportWidth > 1 || contentOverflows;
      });
      const named = offenders.slice(0, 8).map(describe);
      found.push({
        code: 'horizontal-overflow',
        element: named.join(', ') || 'html',
        detail: 'scrollWidth=' + document.documentElement.scrollWidth + ', clientWidth=' + viewportWidth,
      });
    }

    const targetSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([type="hidden"]):not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'summary',
      '[role="button"]',
      '[role="link"]',
    ].join(',');
    for (const element of document.querySelectorAll(targetSelector)) {
      const rect = element.getBoundingClientRect();
      const computed = window.getComputedStyle(element);
      if (!isVisible(element, rect, computed)) continue;
      if (rect.width + 0.01 < 44 || rect.height + 0.01 < 44) {
        found.push({
          code: 'tap-target-under-44',
          element: describe(element),
          detail:
            Math.round(rect.width * 100) / 100 + 'x' + Math.round(rect.height * 100) / 100 + 'px',
        });
      }
    }

    for (const segment of document.querySelectorAll('[data-hh-meaning-segment]')) {
      const lineTops = new Set();
      const walker = document.createTreeWalker(segment, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode !== null) {
        const text = textNode.textContent ?? '';
        for (let index = 0; index < text.length; index += 1) {
          if (/\s/u.test(text[index] ?? '')) continue;
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + 1);
          for (const rect of range.getClientRects()) lineTops.add(Math.round(rect.top));
          range.detach();
        }
        textNode = walker.nextNode();
      }
      if (lineTops.size > 1) {
        found.push({
          code: 'meaning-segment-word-break',
          element: describe(segment),
          detail: lineTops.size + ' 行に分断: ' + (segment.textContent ?? '').trim(),
        });
      }
    }
    return found;
  })()`);

  const formattedKey = formatAuditKey(key);
  return browserViolations.map((violation) => ({ key: formattedKey, ...violation }));
}
