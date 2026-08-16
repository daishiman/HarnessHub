// HarnessHub-aqi: route ごとの client JS (First Load JS) が予算内であること、およびゲート自体が超過を検出できること。
//
// Worker 予算 (bundle-budget.test.ts) とは検査対象が異なる。あちらは Cloudflare へ上げるサーバー側実行コード、
// こちらはブラウザへ配る JS で、TBT/INP を悪化させるのは後者である。
// 実測 (2026-07-25): / の First Load JS が 155.0 KiB (barrel 経由で markdown パーサ一式を巻き込んだ状態) のとき
// Worker 予算ゲートは 0.96MiB / 3MiB で緑のままだった。両者が独立に必要な根拠。
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(APP_ROOT, 'scripts/check-client-bundle.mjs');

/** check-client-bundle.mjs の DEFAULT_BUDGET_BYTES と同値。ここがズレたら片方の変更漏れとして落とす */
const BUDGET_BYTES = 126 * 1024;

const workDirs: string[] = [];

type Fixture = {
  buildRoot: string;
  reportPath: string;
  layoutChunk: string;
  dynamicPageChunk: string;
  rootErrorChunk: string;
  siblingPageChunk: string;
  foreignGroupErrorChunk: string;
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
  /** root の error 境界。祖先セグメント由来なのでブラウザは実際に読む (落としてはいけない) */
  const rootErrorChunk = 'static/chunks/app/error.js';
  /** 別 route の page 専用 chunk。共有 client 部品と同居しただけで manifest に現れる */
  const siblingPageChunk = 'static/chunks/app/sibling/page.js';
  /** 別 route group の境界 chunk。この route の鎖に入らない */
  const foreignGroupErrorChunk = 'static/chunks/app/(other)/error.js';

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
      '/workspace/apps/hub/src/app/error.tsx': {
        id: 5,
        name: '*',
        chunks: ['105', rootErrorChunk],
        async: false,
      },
      // 別 route の client 部品。webpack が同じ共有 chunk へ同居させると、その専用 chunk まで付いてくる
      '/workspace/apps/hub/src/components/SharedWidget.tsx': {
        id: 6,
        name: '*',
        chunks: ['102', siblingPageChunk],
        async: false,
      },
      '/workspace/apps/hub/src/app/(other)/error.tsx': {
        id: 7,
        name: '*',
        chunks: ['107', foreignGroupErrorChunk],
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
  writeChunk(buildRoot, rootErrorChunk, 'export const rootError = true;\n');
  // 実体を置く。置かないと「除外できた」のか「fail-closed で止まった」のか区別できない
  writeChunk(buildRoot, siblingPageChunk, 'export const sibling = true;\n');
  writeChunk(buildRoot, foreignGroupErrorChunk, 'export const foreignError = true;\n');
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
    rootErrorChunk,
    siblingPageChunk,
    foreignGroupErrorChunk,
  };
}

/**
 * spawnSync を使うのは、**成功時 (exit 0) の stderr** も取るため。
 * 警告帯 (HarnessHub-5vlq) は exit code を変えずに stderr へ出すので、
 * 例外経由でしか stderr を拾えない execFileSync だと「警告が出ているか」を検査できない。
 */
function runCheck(buildRoot: string, args: readonly string[] = []): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: APP_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      HUB_CLIENT_BUILD_DIR: buildRoot,
      HUB_CLIENT_BUNDLE_BUDGET_BYTES: '',
    },
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
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
    // common + page + layout + root error 境界
    expect(root.chunkCount).toBe(4);
    expect(root.largestChunks.map((chunk: { path: string }) => chunk.path)).toContain(fixture.layoutChunk);
  });

  /**
   * clientModules は「その module を含む chunk」を列挙するため、共有 chunk へ同居した別 route の部品を
   * 起点に、その route 専用の chunk まで芋づるで付いてくる。実測 (2026-08-08) では
   * /catalog/[projectId] が一覧専用 chunk と別 route group の error 境界を拾い、
   * Next 自身の First Load JS より 6KiB 大きい値を出して予算超過を誤検知した。
   * 過大計測は「厳しめ」ではなく単なる誤りなので、両方向 (落とす / 落とさない) を固定する。
   */
  it('別 route 専用 chunk と別 route group の境界を初期読み込みへ数えない', () => {
    const fixture = makeFixture();
    runCheck(fixture.buildRoot, ['--report', fixture.reportPath]);

    const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
    const root = report.routes.find((route: { route: string }) => route.route === '/');
    const paths = root.largestChunks.map((chunk: { path: string }) => chunk.path);

    expect(paths).not.toContain(fixture.siblingPageChunk);
    expect(paths).not.toContain(fixture.foreignGroupErrorChunk);
    // 祖先セグメントの境界は実際に読まれるので残す (絞りすぎて過小計測にしない)
    expect(paths).toContain(fixture.rootErrorChunk);
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

  /**
   * 警告帯 (HarnessHub-5vlq)。
   *
   * 超過ゲートだけだと「予算を使い切った route」と「余裕のある route」が同じ緑になり、
   * 次に import を足した PR が誤った原因を追うことになる。
   * fixture の実測値から予算を逆算して 95〜100% 帯へ入れ、警告が出ること・
   * exit code が 0 のままであること・余裕のある route を巻き込まないことを固定する。
   */
  describe('予算 95% の警告帯', () => {
    /** その route の First Load JS が予算の `ratio` を占めるような予算値 (bytes) を作る */
    function budgetForRatio(fixture: Fixture, route: string, ratio: number): number {
      runCheck(fixture.buildRoot, ['--report', fixture.reportPath]);
      const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
      const target = report.routes.find((r: { route: string }) => r.route === route);
      return Math.round(target.firstLoadGzipBytes / ratio);
    }

    it('予算の 95% 以上を消費した route を、超過前に警告として報告する', () => {
      const fixture = makeFixture();
      // 97% 消費 = 警告帯の内側かつ未超過
      const budget = budgetForRatio(fixture, '/', 0.97);
      const result = runCheck(fixture.buildRoot, ['--budget', String(budget), '--report', fixture.reportPath]);

      // 警告は exit code を変えない。ここが非ゼロだと「今日の緑が明日理由なく赤くなる」ゲートになる
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(result.stdout).toContain('WARN /');
      expect(result.stderr).toContain('予算残りわずか: /');

      const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
      expect(report.withinBudget).toBe(true);
      expect(report.warnRatio).toBe(0.95);
      const warning = report.warnings.find((w: { route: string }) => w.route === '/');
      expect(warning).toBeDefined();
      // 「あと何バイト足せるか」を出す。比率だけでは次の import が入るか判断できない
      expect(warning.remainingBytes).toBe(budget - warning.firstLoadGzipBytes);
      expect(warning.usedRatio).toBeGreaterThanOrEqual(0.95);
    });

    /** 警告帯が常時点灯していないこと。ここが無いと上のテストは「常に WARN」でも通ってしまう */
    it('余裕のある route は警告に含めない', () => {
      const fixture = makeFixture();
      const budget = budgetForRatio(fixture, '/', 0.5);
      const result = runCheck(fixture.buildRoot, ['--budget', String(budget), '--report', fixture.reportPath]);

      expect(result.status).toBe(0);
      const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
      expect(report.warnings).toEqual([]);
      expect(result.stdout).toContain('OK /');
    });

    it('予算超過した route は警告ではなく違反としてのみ報告する', () => {
      const fixture = makeFixture({ largeLayout: true });
      const result = runCheck(fixture.buildRoot, ['--budget', '128', '--report', fixture.reportPath]);

      expect(result.status).not.toBe(0);
      const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
      expect(report.violations.map((v: { route: string }) => v.route)).toContain('/');
      // 両方に出すと「警告が出ている = まだ余裕がある」という読みが崩れる
      expect(report.warnings.map((w: { route: string }) => w.route)).not.toContain('/');
    });

    it('route handler は警告帯の判定対象にしない', () => {
      const fixture = makeFixture({ largeHandler: true });
      runCheck(fixture.buildRoot, ['--budget', '128', '--report', fixture.reportPath]);

      const report = JSON.parse(readFileSync(fixture.reportPath, 'utf8'));
      expect(report.warnings.map((w: { route: string }) => w.route)).not.toContain('/health');
    });
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
