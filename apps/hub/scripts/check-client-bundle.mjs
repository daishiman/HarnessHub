#!/usr/bin/env node
// client JS (First Load JS) 予算ゲート (HarnessHub-aqi)。route ごとの初期読み込み JS が予算を超えたら非ゼロ終了する
//
// なぜ check-bundle.mjs と別に要るのか:
//   check-bundle.mjs が測るのは wrangler が Cloudflare へ上げる Worker (サーバー側実行コード) で予算は 3 MiB。
//   TBT/INP を悪化させるのはブラウザへ配る client JS であり、両者は別物である。
//   実測 (2026-07-25): / の First Load JS が 159 kB へ膨らみ TBT 926ms (予算 200ms) を出したとき、
//   Worker 予算ゲートは 0.96 MiB / 3 MiB で緑のままだった。測っている対象が違うため原理的に検知できない。
//   よって client 側の予算を独立に持たせ、同種の退行を fail-closed で止める。
//
// 計測対象は app-build-manifest の route entry と route 固有の client-reference manifest の和集合。
// App Router は page と layout を別 entry にするため、両方を合わせて route を開いた瞬間に読む JS の全量を得る。
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

/** 既定 path は cwd ではなく apps/hub 自身を基準にする (どこから起動しても同じ対象を測る) */
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * テストでは合成した Next.js build 出力を渡せるようにする。
 * production/CI の既定値は apps/hub/.next であり、予算値と異なり運用時に変更する設定ではない。
 */
const BUILD_ROOT = path.resolve(process.env.HUB_CLIENT_BUILD_DIR ?? path.join(APP_ROOT, '.next'));
const APP_BUILD_MANIFEST = path.join(BUILD_ROOT, 'app-build-manifest.json');
const APP_PATH_ROUTES_MANIFEST = path.join(BUILD_ROOT, 'app-path-routes-manifest.json');
const APP_PATHS_MANIFEST = path.join(BUILD_ROOT, 'server/app-paths-manifest.json');
const BUILD_MANIFEST = path.join(BUILD_ROOT, 'build-manifest.json');
const SERVER_ROOT = path.join(BUILD_ROOT, 'server');
const STATIC_ROOT = BUILD_ROOT;

/**
 * route ごとの client JS 予算 (gzip 後 bytes)。
 *
 * 既定値 120 KiB の根拠 (2026-07-25 実測):
 *   - Next.js 15 の framework baseline がそのまま下限になり、是正後の / は 103.0 KiB。これ以上は削れない。
 *   - 是正前の / は 159 KiB (barrel 経由で markdown パーサ一式を巻き込んだ状態)。
 *   - 120 KiB は下限に約 17 KiB の余裕を残しつつ、今回級の退行 (+56 KiB) は必ず超過させる位置。
 * なお Next.js の build 出力 "First Load JS" は gzip 後の値で、本 script の計測値と一致する。
 */
const DEFAULT_BUDGET_BYTES = 120 * 1024;

/**
 * 警告帯の下限 (予算に対する比率, HarnessHub-5vlq)。
 *
 * 超過ゲートだけだと「予算を使い切った route」と「まだ余裕のある route」が同じ緑になる。
 * その状態で誰かが import を 1 本足すと、赤くなるのはその PR なので**原因が自分の import に見える**が、
 * 実際の原因は先に積み上がった消費である (誤帰属)。
 * 実測 (2026-08-10): /catalog/publish は 122,184 / 122,880 = 99.4% で緑だった。
 *
 * 警告は exit code を変えない。ここを fail にすると「今日の緑が明日理由なく赤くなる」ゲートになり、
 * 予算超過そのものを止める本来の判定 (evaluateBudget) の意味が薄れる。
 * 代わりに残余をバイト数で明示し、次に足す人が事前に気づける形にする。
 */
const WARN_RATIO = 0.95;

function parseArgs(argv) {
  const args = { budget: null, report: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--budget') {
      args.budget = Number(value);
      i += 1;
    } else if (key === '--report') {
      args.report = value;
      i += 1;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }
  }
  return args;
}

function resolveBudget(cliBudget) {
  if (cliBudget !== null && Number.isFinite(cliBudget) && cliBudget > 0) return cliBudget;
  const fromEnv = Number(process.env.HUB_CLIENT_BUNDLE_BUDGET_BYTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_BUDGET_BYTES;
}

/** ファイル 1 件の gzip 後サイズ。全体をメモリに載せずに数える (check-bundle.mjs と同方式) */
async function gzipSize(filePath) {
  let size = 0;
  const counter = new Writable({
    write(chunk, _encoding, callback) {
      size += chunk.length;
      callback();
    },
  });
  await pipeline(createReadStream(filePath), createGzip({ level: 9 }), counter);
  return size;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB (${bytes} bytes)`;
}

/**
 * page (ブラウザが JS を読む画面) か route handler (API) かを区別する。
 * route handler は manifest に載るがレスポンスは JSON 等でブラウザは chunk を読まないため、予算判定から外す。
 */
function toRouteKind(manifestKey) {
  return manifestKey.endsWith('/route') ? 'route-handler' : 'page';
}

/**
 * chunk の相対パスをファイルシステム表記へ正規化する。
 *
 * 同一の chunk が manifest によって別表記で現れる (実測 2026-07-26 / 動的 route 追加時に判明):
 *   app-build-manifest.json        → static/chunks/app/[tenant_slug]/signin/page-*.js
 *   *_client-reference-manifest.js → static/chunks/app/%5Btenant_slug%5D/signin/page-*.js
 *
 * 後者はブラウザが <script src> として読む URL なので、動的セグメントの [ ] が percent-encode される。
 * 正規化しないと 2 つの誤りが同時に起きる:
 *   (a) 実ファイルを引けず fail-closed で停止し、動的 route を持つ app では常に赤くなる
 *   (b) 和集合を取る Set 上で同一 chunk が別要素として残り、二重計上で予算判定が過大に厳しくなる
 *
 * @param {string} chunkPath manifest が持つ chunk の相対パス
 * @returns {string} STATIC_ROOT からの相対ファイルパス
 */
function toFsRelativePath(chunkPath) {
  try {
    return decodeURIComponent(chunkPath);
  } catch (error) {
    throw new Error(`chunk path の URL decode に失敗しました: ${chunkPath}`, {
      cause: error,
    });
  }
}

/**
 * route key (`/(workspace)/catalog/[projectId]/page`) から、初期表示で読み得るセグメント dir の集合を作る。
 * 祖先セグメントは layout / error / loading / not-found を提供するので鎖の全段が対象になる。
 */
function segmentChain(manifestKey) {
  const parts = manifestKey
    .replace(/\/(page|route)$/, '')
    .split('/')
    .filter(Boolean);
  const chain = [''];
  let current = '';
  for (const part of parts) {
    current = current === '' ? part : `${current}/${part}`;
    chain.push(current);
  }
  return new Set(chain);
}

/**
 * RSC manifest 由来の chunk のうち、この route では読まれないものを落とす。
 *
 * clientModules は「その module を含む chunk」を列挙するため、webpack が別 route の client 部品と
 * 同じ共有 chunk へ同居させると、同居相手の *専用* chunk まで芋づるで付いてくる。
 * 実測 (2026-08-08): /catalog/[projectId] に CatalogList が現れ、一覧専用の
 * `app/(workspace)/catalog/page-*.js` (5.3 KiB) と、別 route group の `(dashboard)/error-*.js` が計上され、
 * Next 自身の First Load JS (115 kB) に対しゲートが 121.0 KiB を出していた。
 * script 冒頭が置いている「Next の First Load JS と一致する」という前提が崩れ、
 * 実際には増えていない route を予算超過と判定してしまう (過大計測は fail-closed ではなく単なる誤検知)。
 *
 * 判定は 2 段。`static/chunks/app/**` は route のセグメント鎖に属するものだけ残し、
 * さらに `page-*` は自分自身のセグメントのものに限る (祖先が page を提供することはない)。
 * `app/` 配下でない共有 chunk (vendor や 6463 のような共有 client chunk) はブラウザが実際に読むので残す。
 */
function isChunkOnRoute(chunkPath, ownSegment, chain) {
  const match = /^static\/chunks\/app\/(.*)$/.exec(chunkPath);
  if (match === null) return true;
  const rest = match[1];
  const lastSlash = rest.lastIndexOf('/');
  const dir = lastSlash === -1 ? '' : rest.slice(0, lastSlash);
  const base = lastSlash === -1 ? rest : rest.slice(lastSlash + 1);
  if (!chain.has(dir)) return false;
  if (base.startsWith('page-')) return dir === ownSegment;
  return true;
}

/**
 * route 固有の client reference manifest から、layout を含む client component chunk を取り出す。
 *
 * app-build-manifest の pages["/page"] は page entry しか列挙せず、root layout の entry は
 * pages["/layout"] に分かれている。page entry だけを合計すると、実ブラウザが初期表示で読む
 * layout chunk を見落とす。実際の HTML も page と layout の両方を script src に持つため、
 * route ごとの client reference manifest を併用して完全な集合へ戻す。
 * ただし同居 chunk の巻き込みは isChunkOnRoute で落とす。
 */
async function clientReferenceChunks(appPath, serverEntry) {
  const manifestPath = path.join(SERVER_ROOT, serverEntry.replace(/\.js$/, '_client-reference-manifest.js'));
  const source = await readFile(manifestPath, 'utf8');
  const marker = `globalThis.__RSC_MANIFEST[${JSON.stringify(appPath)}]=`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`client reference manifest の route key が見つかりません: ${manifestPath}`);
  }

  const serialized = source
    .slice(markerIndex + marker.length)
    .trim()
    .replace(/;$/, '');
  const manifest = JSON.parse(serialized);
  const chain = segmentChain(appPath);
  const ownSegment = appPath
    .replace(/\/(page|route)$/, '')
    .split('/')
    .filter(Boolean)
    .join('/');
  const chunks = new Set();
  for (const module of Object.values(manifest.clientModules ?? {})) {
    for (const value of module.chunks ?? []) {
      if (typeof value !== 'string' || !value.endsWith('.js')) continue;
      const relative = toFsRelativePath(value);
      if (isChunkOnRoute(relative, ownSegment, chain)) chunks.add(relative);
    }
  }
  return chunks;
}

/**
 * route ごとの First Load JS を実測する。
 * polyfill は modern browser では実行されないため既定では加算せず、内訳として別途記録する。
 */
async function measureRoutes(budget) {
  const appManifest = JSON.parse(await readFile(APP_BUILD_MANIFEST, 'utf8'));
  const routeManifest = JSON.parse(await readFile(APP_PATH_ROUTES_MANIFEST, 'utf8'));
  const appPathsManifest = JSON.parse(await readFile(APP_PATHS_MANIFEST, 'utf8'));
  const buildManifest = JSON.parse(await readFile(BUILD_MANIFEST, 'utf8'));
  const polyfillFiles = buildManifest.polyfillFiles ?? [];

  /** 同じ chunk を複数 route が共有するので gzip 計測結果を使い回す */
  const sizeCache = new Map();
  const sizeOf = async (relative) => {
    if (sizeCache.has(relative)) return sizeCache.get(relative);
    const full = path.join(STATIC_ROOT, relative);
    if (!existsSync(full)) {
      // 計測対象が欠けた状態を「予算内」と誤判定しないため fail-closed にする
      throw new Error(`chunk が見つかりません: ${full}`);
    }
    const size = await gzipSize(full);
    sizeCache.set(relative, size);
    return size;
  };

  let polyfillBytes = 0;
  for (const file of polyfillFiles) polyfillBytes += await sizeOf(toFsRelativePath(file));

  const routes = [];
  for (const [manifestKey, routePath] of Object.entries(routeManifest)) {
    const files = appManifest.pages?.[manifestKey];
    if (!Array.isArray(files)) {
      throw new Error(`app-build-manifest に route entry がありません: ${manifestKey}`);
    }

    const kind = toRouteKind(manifestKey);
    // 和集合を取る前に表記を揃える。揃えないと同一 chunk が別要素として残り二重計上される
    const routeFiles = new Set(files.map(toFsRelativePath));
    if (kind === 'page') {
      const serverEntry = appPathsManifest[manifestKey];
      if (typeof serverEntry !== 'string') {
        throw new Error(`app-paths-manifest に route entry がありません: ${manifestKey}`);
      }
      for (const file of await clientReferenceChunks(manifestKey, serverEntry)) routeFiles.add(file);
    }

    const chunks = [];
    let total = 0;
    for (const file of routeFiles) {
      const size = await sizeOf(file);
      total += size;
      chunks.push({ path: file, gzipBytes: size });
    }
    chunks.sort((a, b) => b.gzipBytes - a.gzipBytes);
    routes.push({
      route: routePath,
      kind,
      firstLoadGzipBytes: total,
      budgetBytes: budget,
      chunkCount: chunks.length,
      largestChunks: chunks.slice(0, 5),
    });
  }
  routes.sort((a, b) => b.firstLoadGzipBytes - a.firstLoadGzipBytes);
  return { routes, polyfillBytes };
}

/**
 * 予算判定。違反した route の配列を返す (空配列 = PASS)。
 *
 * 方針は 3 点:
 *  (1) 判定対象は page のみ。route handler (API) はブラウザが chunk を読まないので数値は記録だけして判定しない。
 *  (2) 予算は route ごとに持たせた budgetBytes と比較する。現状は全 route 同額だが、
 *      将来 Markdown エディタを実際に使う画面のように正当に重い route が出たとき、
 *      この関数を変えずに measureRoutes 側で個別予算を与えて例外化できる形にしておく。
 *  (3) 超過は即 fail とし警告幅は設けない。cwv.yml が「警告どまりにすると劣化が放置される」として
 *      閾値超過を即 fail にしているのと同じ立場を取る (qa-018)。
 */
function evaluateBudget(routes) {
  return routes
    .filter((r) => r.kind === 'page' && r.firstLoadGzipBytes > r.budgetBytes)
    .map((r) => ({
      route: r.route,
      firstLoadGzipBytes: r.firstLoadGzipBytes,
      budgetBytes: r.budgetBytes,
      overBy: r.firstLoadGzipBytes - r.budgetBytes,
    }));
}

/**
 * 警告帯の判定。予算の WARN_RATIO 以上を消費しているが、まだ超過はしていない page を返す。
 *
 * 超過済み route は violations 側で赤くなるのでここには入れない。両方に出すと
 * 「警告が出ている = まだ余裕がある」という読みが崩れ、警告の意味が失われる。
 */
function evaluateWarnings(routes) {
  return routes
    .filter(
      (r) =>
        r.kind === 'page' &&
        r.firstLoadGzipBytes <= r.budgetBytes &&
        r.firstLoadGzipBytes >= r.budgetBytes * WARN_RATIO,
    )
    .map((r) => ({
      route: r.route,
      firstLoadGzipBytes: r.firstLoadGzipBytes,
      budgetBytes: r.budgetBytes,
      // 「あと何バイト足せるか」。比率だけだと、次に足す import が入るかどうかを判断できない
      remainingBytes: r.budgetBytes - r.firstLoadGzipBytes,
      usedRatio: r.firstLoadGzipBytes / r.budgetBytes,
    }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'usage: check-client-bundle.mjs [--budget <bytes>] [--report <path>]\n' +
        '  route ごとの First Load JS (gzip 後) を実測し、予算超過なら exit 1\n' +
        '  先に `pnpm --filter @harness-hub/hub run build:next` が必要\n',
    );
    return 0;
  }

  const budget = resolveBudget(args.budget);
  const reportPath = path.resolve(args.report ?? path.join(APP_ROOT, 'artifacts/client-bundle-report.json'));

  if (!existsSync(APP_BUILD_MANIFEST)) {
    // 未ビルドを「予算内」と誤判定しないため fail-closed にする
    process.stderr.write(
      `[client-bundle] 計測対象が見つかりません: ${APP_BUILD_MANIFEST}\n` +
        '[client-bundle] 先に `pnpm --filter @harness-hub/hub run build:next` を実行してください\n',
    );
    return 1;
  }

  let measurement;
  try {
    measurement = await measureRoutes(budget);
  } catch (error) {
    process.stderr.write(
      `[client-bundle] 計測に失敗しました: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }

  const { routes, polyfillBytes } = measurement;
  if (routes.length === 0) {
    process.stderr.write('[client-bundle] 計測対象 route が 0 件です\n');
    return 1;
  }

  const violations = evaluateBudget(routes);
  const warnings = evaluateWarnings(routes);

  const report = {
    budgetBytes: budget,
    warnRatio: WARN_RATIO,
    routes,
    polyfillGzipBytes: polyfillBytes,
    violations,
    warnings,
    withinBudget: violations.length === 0,
    measuredAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `[client-bundle] 予算: ${formatBytes(budget)} / route (警告帯: ${(WARN_RATIO * 100).toFixed(0)}% 以上)\n`,
  );
  for (const r of routes) {
    const mark =
      r.kind === 'route-handler'
        ? 'SKIP (route handler)'
        : violations.some((v) => v.route === r.route)
          ? 'NG'
          : warnings.some((w) => w.route === r.route)
            ? 'WARN'
            : 'OK';
    process.stdout.write(`[client-bundle] ${mark} ${r.route}: ${formatBytes(r.firstLoadGzipBytes)}\n`);
  }
  process.stdout.write(`[client-bundle] polyfill (modern browser では未実行): ${formatBytes(polyfillBytes)}\n`);
  process.stdout.write(`[client-bundle] 計測結果: ${reportPath}\n`);

  if (warnings.length > 0) {
    // stderr へ出す。CI ログの折り畳みでも目に入り、かつ exit code は 0 のまま維持される
    for (const w of warnings) {
      process.stderr.write(
        `[client-bundle] 予算残りわずか: ${w.route} ${formatBytes(w.firstLoadGzipBytes)} ` +
          `(${(w.usedRatio * 100).toFixed(1)}% 消費 / 残り ${w.remainingBytes} bytes)\n`,
      );
    }
    process.stderr.write(
      '[client-bundle] これらの route は次に import を 1 本足しただけで超過し得ます。' +
        '超過したときの原因はその import ではなく既に積み上がった消費なので、' +
        '先に遅延読込 (next/dynamic) や client 境界の見直しで余裕を戻してください\n',
    );
  }

  if (violations.length > 0) {
    for (const v of violations) {
      process.stderr.write(
        `[client-bundle] 予算超過: ${v.route} ${formatBytes(v.firstLoadGzipBytes)} > ${formatBytes(v.budgetBytes)}\n`,
      );
    }
    process.stderr.write(
      '[client-bundle] 共通層 barrel の巻き込みを疑ってください。' +
        'next.config.ts の optimizePackageImports に対象 package が入っているか、' +
        "重量級依存を持つ部品が 'use client' 経由で初期チャンクへ載っていないかを確認します\n",
    );
    return 1;
  }

  return 0;
}

const exitCode = await main();
process.exit(exitCode);
