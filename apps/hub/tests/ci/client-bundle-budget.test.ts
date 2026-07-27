// HarnessHub-aqi: route ごとの client JS (First Load JS) が予算内であること、およびゲート自体が超過を検出できること。
//
// Worker 予算 (bundle-budget.test.ts) とは検査対象が異なる。あちらは Cloudflare へ上げるサーバー側実行コード、
// こちらはブラウザへ配る JS で、TBT/INP を悪化させるのは後者である。
// 実測 (2026-07-25): / の First Load JS が 155.0 KiB (barrel 経由で markdown パーサ一式を巻き込んだ状態) のとき
// Worker 予算ゲートは 0.96MiB / 3MiB で緑のままだった。両者が独立に必要な根拠。
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(APP_ROOT, 'scripts/check-client-bundle.mjs');

/** check-client-bundle.mjs の DEFAULT_BUDGET_BYTES と同値。ここがズレたら片方の変更漏れとして落とす */
const BUDGET_BYTES = 120 * 1024;

const workDirs: string[] = [];

type Fixture = {
  buildRoot: string;
  reportPath: string;
  layoutChunk: string;
  dynamicPageChunk: string;
};

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeChunk(buildRoot: string, relativePath: string, content: string): void {
  const filePath = path.join(buildRoot, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

/**
 * Next.js 15 の build 出力を最小構成で再現する。
 * app-build-manifest では /layout と /page が別 entry だが、ブラウザは両方を読む点が今回の重要な回帰条件。
 *
 * 動的 route (/[tenant_slug]/signin) も含める。client reference manifest はブラウザが読む URL を持つため
 * 同じ chunk が app-build-manifest 側と別表記 ([tenant_slug] / %5Btenant_slug%5D) で現れ、
 * 正規化を忘れると実ファイルを引けない。実 build で 2026-07-26 に顕在化した条件をここで固定する。
 */
function makeFixture(options: { largeLayout?: boolean; largeHandler?: boolean } = {}): Fixture {
  const buildRoot = mkdtempSync(path.join(tmpdir(), 'hub-client-build-'));
  workDirs.push(buildRoot);

  const commonChunk = 'static/chunks/common.js';
  const layoutChunk = 'static/chunks/app/layout.js';
  const pageChunk = 'static/chunks/app/page.js';
  const handlerChunk = 'static/chunks/app/health/route.js';
  /** ファイルシステム上の実体名。動的セグメントは [ ] のリテラル */
  const dynamicPageChunk = 'static/chunks/app/[tenant_slug]/signin/page.js';
  /** 同一ファイルを指す URL 表記。client reference manifest 側はこちらで記録される */
  const dynamicPageChunkAsUrl = 'static/chunks/app/%5Btenant_slug%5D/signin/page.js';

  writeJson(path.join(buildRoot, 'app-build-manifest.json'), {
    pages: {
      '/layout': [commonChunk, layoutChunk],
      '/page': [commonChunk, pageChunk],
      '/health/route': [commonChunk, handlerChunk],
      '/[tenant_slug]/signin/page': [commonChunk, dynamicPageChunk],
    },
  });
  writeJson(path.join(buildRoot, 'app-path-routes-manifest.json'), {
    '/page': '/',
    '/health/route': '/health',
    '/[tenant_slug]/signin/page': '/[tenant_slug]/signin',
  });
  writeJson(path.join(buildRoot, 'build-manifest.json'), { polyfillFiles: [] });
  writeJson(path.join(buildRoot, 'server/app-paths-manifest.json'), {
    '/page': 'app/page.js',
    '/health/route': 'app/health/route.js',
    '/[tenant_slug]/signin/page': 'app/[tenant_slug]/signin/page.js',
  });

  const clientReferenceManifest = {
    clientModules: {
      '/workspace/packages/ui/src/theme/UiProvider.tsx': {
        id: 1,
        name: '*',
        chunks: ['101', layoutChunk],
        async: false,
      },
      '/workspace/packages/ui/src/components/Alert.tsx': {
        id: 2,
        name: '*',
        chunks: ['102', pageChunk],
        async: false,
      },
    },
  };
  const clientManifestPath = path.join(buildRoot, 'server/app/page_client-reference-manifest.js');
  mkdirSync(path.dirname(clientManifestPath), { recursive: true });
  writeFileSync(
    clientManifestPath,
    `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/page"]=${JSON.stringify(clientReferenceManifest)}`,
    'utf8',
  );

  // 動的 route 側。dynamicPageChunk は app-build-manifest にもあるので、正規化できないと二重計上になる
  const dynamicClientReferenceManifest = {
    clientModules: {
      '/workspace/packages/ui/src/theme/UiProvider.tsx': {
        id: 3,
        name: '*',
        chunks: ['101', layoutChunk],
        async: false,
      },
      '/workspace/apps/hub/src/app/[tenant_slug]/signin/SignInForm.tsx': {
        id: 4,
        name: '*',
        chunks: ['103', dynamicPageChunkAsUrl],
        async: false,
      },
    },
  };
  const dynamicClientManifestPath = path.join(
    buildRoot,
    'server/app/[tenant_slug]/signin/page_client-reference-manifest.js',
  );
  mkdirSync(path.dirname(dynamicClientManifestPath), { recursive: true });
  writeFileSync(
    dynamicClientManifestPath,
    `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/[tenant_slug]/signin/page"]=${JSON.stringify(dynamicClientReferenceManifest)}`,
    'utf8',
  );

  writeChunk(buildRoot, commonChunk, 'export const common = true;\n');
  writeChunk(buildRoot, dynamicPageChunk, 'export const signin = true;\n');
  writeChunk(
    buildRoot,
    layoutChunk,
    options.largeLayout
      ? Array.from({ length: 16_384 }, (_, index) => String.fromCharCode(33 + (index % 90))).join('')
      : 'export const layout = true;\n',
  );
  writeChunk(buildRoot, pageChunk, 'export const page = true;\n');
  writeChunk(
    buildRoot,
    handlerChunk,
    options.largeHandler
      ? Array.from({ length: 16_384 }, (_, index) => String.fromCharCode(33 + ((index * 17) % 90))).join('')
      : 'export const health = true;\n',
  );

  return {
    buildRoot,
    reportPath: path.join(buildRoot, 'reports/client-bundle.json'),
    layoutChunk,
    dynamicPageChunk,
  };
}

function runCheck(buildRoot: string, args: readonly string[] = []): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd: APP_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HUB_CLIENT_BUILD_DIR: buildRoot,
        HUB_CLIENT_BUNDLE_BUDGET_BYTES: '',
      },
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe('client JS 予算ゲート', () => {
  it('page route は root layout と page の chunk を重複なく合計する', () => {
    const fixture = makeFixture();
    const result = runCheck(fixture.buildRoot, ['--report', fixture.reportPath]);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);

    const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
    expect(report.withinBudget).toBe(true);
    expect(report.budgetBytes).toBe(BUDGET_BYTES);

    const root = report.routes.find((route: { route: string }) => route.route === '/');
    expect(root.kind).toBe('page');
    expect(root.chunkCount).toBe(3);
    expect(root.largestChunks.map((chunk: { path: string }) => chunk.path)).toContain(fixture.layoutChunk);
  });

  it('layout だけが肥大化した場合も route の予算超過として検出する', () => {
    const fixture = makeFixture({ largeLayout: true });
    const result = runCheck(fixture.buildRoot, ['--budget', '128', '--report', fixture.reportPath]);

    expect(result.status).not.toBe(0);
    const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
    expect(report.withinBudget).toBe(false);
    expect(report.violations.map((violation: { route: string }) => violation.route)).toContain('/');
  });

  it('route handler はブラウザが chunk を読まないため予算判定の対象にしない', () => {
    const fixture = makeFixture({ largeHandler: true });
    const result = runCheck(fixture.buildRoot, ['--budget', '128', '--report', fixture.reportPath]);

    const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
    const handler = report.routes.find((route: { kind: string }) => route.kind === 'route-handler');
    expect(handler.route).toBe('/health');
    expect(handler.firstLoadGzipBytes).toBeGreaterThan(128);
    expect(report.violations.some((violation: { route: string }) => violation.route === '/health')).toBe(false);
    expect(result.stdout).toContain('SKIP (route handler) /health');
  });

  it('動的 route の percent-encode された chunk 参照を実ファイルへ解決する', () => {
    const fixture = makeFixture();
    const result = runCheck(fixture.buildRoot, ['--report', fixture.reportPath]);

    // 正規化しないと「chunk が見つかりません: .../%5Btenant_slug%5D/...」で fail-closed 停止する
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);

    const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
    const signin = report.routes.find((route: { route: string }) => route.route === '/[tenant_slug]/signin');
    expect(signin.kind).toBe('page');
    expect(signin.largestChunks.map((chunk: { path: string }) => chunk.path)).toContain(fixture.dynamicPageChunk);
  });

  it('同一 chunk が manifest 間で別表記でも二重計上しない', () => {
    const fixture = makeFixture();
    runCheck(fixture.buildRoot, ['--report', fixture.reportPath]);

    const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
    const signin = report.routes.find((route: { route: string }) => route.route === '/[tenant_slug]/signin');
    // common + layout + signin page の 3 つ。表記違いを取りこぼすと page 分が 2 重になり 4 になる
    expect(signin.chunkCount).toBe(3);
    expect(signin.largestChunks.filter((chunk: { path: string }) => chunk.path.includes('signin'))).toHaveLength(1);
  });

  it('計測対象が無いときは pass せず非ゼロ終了する', () => {
    const emptyRoot = mkdtempSync(path.join(tmpdir(), 'hub-client-empty-'));
    workDirs.push(emptyRoot);
    const result = runCheck(emptyRoot);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('計測対象が見つかりません');
  });

  it('manifest が参照する chunk が無いときは fail-closed で停止する', () => {
    const fixture = makeFixture();
    unlinkSync(path.join(fixture.buildRoot, fixture.layoutChunk));
    const result = runCheck(fixture.buildRoot, ['--report', fixture.reportPath]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('chunk が見つかりません');
  });
});
