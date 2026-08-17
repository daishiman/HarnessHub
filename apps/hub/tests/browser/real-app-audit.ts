/**
 * 実 Next アプリの UI 完全性監査。
 *
 * route/state をここで書き直さない。DB seed と共有する COVERAGE_MATRIX を
 * 唯一の正本とし、実 route・到達 URL・state cell を導出する。
 */
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { COVERAGE_MATRIX, ROUTE_STATES, type RouteCoverage, type RouteState } from '@harness-hub/db';
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

export const REAL_APP_AUDIT_WIDTHS = [360, 768, 1280] as const;
export const REAL_APP_AUDIT_THEMES = ['light', 'dark'] as const;
const CLIENT_CONTENT_SETTLE_MS = 1_600;

export type RealAppAuditWidth = (typeof REAL_APP_AUDIT_WIDTHS)[number];
export type RealAppAuditTheme = (typeof REAL_APP_AUDIT_THEMES)[number];
export const REAL_APP_AUDIT_ACTORS = ['anonymous', 'member', 'workspace-admin', 'provider-admin'] as const;
export type RealAppAuditActor = (typeof REAL_APP_AUDIT_ACTORS)[number];
export type AuthenticatedRealAppAuditActor = Exclude<RealAppAuditActor, 'anonymous'>;

export interface RealAppRouteCase {
  readonly screenCode: string;
  /** Next の canonical route。動的 segment は `[id]` のまま。 */
  readonly route: string;
  /** seed の決定論 ID まで解決した実際に開く URL。 */
  readonly url: string;
  /** COVERAGE_MATRIX の到達手順が要求する認証主体。 */
  readonly actor: RealAppAuditActor;
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
  /** actor ごとに分離した Cookie。値は report へ一切含めない。 */
  readonly cookieHeaders?: Partial<Readonly<Record<AuthenticatedRealAppAuditActor, string>>> | undefined;
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
  const actors = new Set<string>();
  for (const state of ROUTE_STATES) {
    const applicability = coverage.states[state];
    if (applicability.kind !== 'applicable') continue;
    for (const step of applicability.reach) {
      urls.add(step.url);
      actors.add(step.actor);
    }
  }
  if (urls.size !== 1) {
    throw new Error(`${coverage.screenCode} (${coverage.route}) の到達 URL は 1 件必須です: ${[...urls].join(', ')}`);
  }
  const [url] = urls;
  if (url === undefined || !url.startsWith('/')) {
    throw new Error(`${coverage.screenCode} (${coverage.route}) の到達 URL が不正です`);
  }
  if (actors.size !== 1) {
    throw new Error(`${coverage.screenCode} (${coverage.route}) の actor は 1 件必須です: ${[...actors].join(', ')}`);
  }
  const [rawActor] = actors;
  if (rawActor === undefined || !REAL_APP_AUDIT_ACTORS.includes(rawActor as RealAppAuditActor)) {
    throw new Error(`${coverage.screenCode} (${coverage.route}) の actor が不正です: ${rawActor ?? ''}`);
  }
  return { screenCode: coverage.screenCode, route: coverage.route, url, actor: rawActor as RealAppAuditActor };
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
  const actorSessions = new Map<RealAppAuditActor, { readonly context: BrowserContext; readonly page: Page }>();
  const currentRouteByActor = new Map<RealAppAuditActor, string>();
  const unreachable: UnreachableAuditKey[] = [];
  const violations: UiIntegrityViolation[] = [];
  let executedKeyCount = 0;

  const runnableKeys = options.keys.filter((key) => {
    if (key.actor === 'anonymous') return true;
    const cookieHeader = options.cookieHeaders?.[key.actor];
    if (cookieHeader !== undefined && cookieHeader.trim() !== '') return true;
    unreachable.push({
      key: formatAuditKey(key),
      status: null,
      reason: `${key.actor} の認証 Cookie がありません`,
    });
    return false;
  });

  try {
    // 既定は Playwright 同梱の Chromium。CI はそれを使う。
    // 手元では同梱 Chromium を取得できない環境 (CDN 到達不可・arch 不一致) があるため、
    // `HUB_BROWSER_AUDIT_CHANNEL=chrome` のときだけ導入済みの Chrome へ切り替えられるようにする。
    // どちらも Blink なので、この監査が見る幾何 (はみ出し・重なり・折返し) の判定は変わらない。
    const channel = process.env.HUB_BROWSER_AUDIT_CHANNEL?.trim();
    if (runnableKeys.length > 0) {
      browser = await chromium.launch(channel !== undefined && channel !== '' ? { channel } : {});
    }

    for (const key of runnableKeys) {
      if (browser === undefined) throw new Error('実走対象があるのに browser が起動していません');
      let actorSession = actorSessions.get(key.actor);
      if (actorSession === undefined) {
        const context = await browser.newContext({
          reducedMotion: 'reduce',
          extraHTTPHeaders: { ...options.extraHTTPHeaders },
        });
        if (key.actor !== 'anonymous') {
          const cookieHeader = options.cookieHeaders?.[key.actor];
          if (cookieHeader === undefined || cookieHeader.trim() === '') {
            throw new Error(`${key.actor} の認証 Cookie が実走直前に失われました`);
          }
          await context.addCookies(parseCookies(cookieHeader, origin));
        }
        actorSession = { context, page: await context.newPage() };
        actorSessions.set(key.actor, actorSession);
      }
      const { page } = actorSession;
      const routeIdentity = `${key.route}\u0000${key.url}`;
      if (currentRouteByActor.get(key.actor) !== routeIdentity) {
        const result = await openAuditKey(page, origin, key);
        if (result.reachable === false) {
          unreachable.push({ key: formatAuditKey(key), status: result.status, reason: result.reason });
          continue;
        }
        currentRouteByActor.set(key.actor, routeIdentity);
      } else {
        try {
          await applyAuditAxis(page, key);
        } catch (cause) {
          unreachable.push({
            key: formatAuditKey(key),
            status: null,
            reason: cause instanceof Error ? cause.message : String(cause),
          });
          continue;
        }
      }
      // 検出中に画面が遷移すると評価 context ごと消える。1 キーの計測失敗で全 144 キーを
      // 落とすと「違反 0」と「測れなかった」の区別が付かなくなるため、未実行として記録し先へ進む。
      let keyViolations: UiIntegrityViolation[];
      try {
        keyViolations = await collectUiIntegrityViolations(page, key);
      } catch (cause) {
        unreachable.push({
          key: formatAuditKey(key),
          status: null,
          reason: cause instanceof Error ? cause.message : String(cause),
        });
        continue;
      }
      executedKeyCount += 1;
      violations.push(...keyViolations);
    }
  } finally {
    await Promise.all([...actorSessions.values()].map(({ context }) => context.close()));
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

/** Playwright が受け付ける cookie 1 件の型。分岐ごとに形が違うため明示して union 推論の崩れを防ぐ。 */
type AuditCookie = Parameters<BrowserContext['addCookies']>[0][number];

function parseCookies(cookieHeader: string, origin: URL): AuditCookie[] {
  return cookieHeader.split(';').flatMap<AuditCookie>((part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) return [];
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name === '') return [];
    // `__Host-` / `__Secure-` 接頭辞は cookie 名そのものが属性を約束する規約で、
    // ブラウザは secure を満たさない設定を拒否する (`__Host-` は加えて path=/ と domain 無指定)。
    // url だけを渡すと domain 付き・secure なしとして解釈されるため、Hub の
    // `__Host-harness-hub.session` を addCookies できない。接頭辞の約束をそのまま属性へ写す。
    if (name.startsWith('__Host-') || name.startsWith('__Secure-')) {
      return [{ name, value, domain: origin.hostname, path: '/', secure: true, sameSite: 'Lax' as const }];
    }
    return [{ name, value, url: origin.origin }];
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
    await prepareAuditAxis(page, key);
    const response = await page.goto(new URL(key.url, origin).toString(), { waitUntil: 'load' });
    if (response === null) {
      return { reachable: false, status: null, reason: 'navigation response がありません' };
    }
    if (!response.ok()) {
      return { reachable: false, status: response.status(), reason: `HTTP ${response.status()}` };
    }

    // 認証済み画面は load 後にクライアント側で遷移することがある (scope 解決後の replace など)。
    // 遷移途中の DOM を測ると実行 context が評価中に破棄されるため、通信が落ち着くまで待つ。
    // 落ち着かない画面 (polling を持つ画面) もあるので、待てなかったこと自体は失敗にしない。
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

    // Next の client component は load/networkidle の直後に hydrate され、その useEffect から
    // 実データを取得する。直後に測ると最初の theme だけ skeleton、次の theme は実内容という
    // 同一 route 内の取りこぼしが起きるため、初回 navigation だけ client 描画の収束を待つ。
    // 30秒 polling より十分短く、通常の初期fetchだけを含める境界として固定する。
    await page.waitForTimeout(CLIENT_CONTENT_SETTLE_MS);
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );

    await applyAuditAxis(page, key);
    return { reachable: true };
  } catch (cause) {
    return {
      reachable: false,
      status: null,
      reason: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

async function prepareAuditAxis(page: Page, key: RealAppAuditKey): Promise<void> {
  await page.setViewportSize({ width: key.width, height: key.width === 768 ? 1024 : 800 });
  await page.emulateMedia({ colorScheme: key.theme, reducedMotion: 'reduce' });
}

async function applyAuditAxis(page: Page, key: RealAppAuditKey): Promise<void> {
  await prepareAuditAxis(page, key);
  // 実アプリは DB の表示設定で theme を解決する。監査の軸だけは明示値を優先し、
  // token 正本の data-theme 切替を実 DOM に対して行う。
  await page.evaluate((theme) => {
    document.documentElement.dataset.theme = theme;
    for (const element of document.querySelectorAll<HTMLElement>('[data-theme]')) {
      element.dataset.theme = theme;
    }
  }, key.theme);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
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
      // radio / checkbox は小さな native glyph だけでなく、関連付けた label 全体が
      // クリック可能。表示された label がある場合は、実際の操作領域で判定する。
      const inputType = element instanceof HTMLInputElement ? element.type : '';
      const associatedLabel =
        (inputType === 'radio' || inputType === 'checkbox') && element instanceof HTMLInputElement
          ? [...(element.labels ?? [])].find((label) => {
              const candidateRect = label.getBoundingClientRect();
              return isVisible(label, candidateRect, window.getComputedStyle(label));
            })
          : undefined;
      const effectiveRect = associatedLabel?.getBoundingClientRect() ?? rect;
      if (effectiveRect.width + 0.01 < 44 || effectiveRect.height + 0.01 < 44) {
        found.push({
          code: 'tap-target-under-44',
          element: describe(element),
          detail:
            Math.round(effectiveRect.width * 100) / 100 +
            'x' +
            Math.round(effectiveRect.height * 100) / 100 +
            'px',
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
