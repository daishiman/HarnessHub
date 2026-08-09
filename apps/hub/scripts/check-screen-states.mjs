#!/usr/bin/env node
/**
 * 画面状態 (読込中 / エラー / 見つからない) の敷き漏れ検出ゲート。
 *
 * Next App Router では loading.tsx / error.tsx / not-found.tsx が「無くても動く」。
 * 無い場合はローディング表示が出ず (画面が固まったように見える)、例外は親の境界まで
 * 遡って画面全体を落とす。つまり欠落は実行時まで表に出ず、テストも緑のまま通る。
 * ここで静的に落とすことで「敷いたつもり」を防ぐ。
 *
 * 対象は「独自の layout.tsx を持つ UI セグメント」= route group とアプリのルート。
 * layout を持つということは、そのセグメント配下がひとまとまりの画面群であり、
 * 状態表示の受け皿を自前で持つべき単位だという意味になる。API route は UI を返さないので除外する。
 *
 * 使い方:
 *   node scripts/check-screen-states.mjs [--app-dir <path>] [--json <path>]
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_STATE_FILES = ['loading.tsx', 'error.tsx', 'not-found.tsx'];

/** 各状態ファイルが参照していなければならない共通実装。薄い配線であることを担保する。 */
const REQUIRED_IMPORTS = {
  'loading.tsx': 'components/screen-states.js',
  'error.tsx': 'components/error-screen.js',
  'not-found.tsx': 'components/screen-states.js',
};

/**
 * 共通実装を「包んだうえで」使う中継ファイルの許可リスト。
 *
 * 公開画面 (route group の外) は骨格 (header / main) を持つ層が居ないため、
 * 状態画面を骨格ごと差し替える必要がある。中継を無条件に許すと文面の分岐が
 * そこで増やせてしまうので、中継ファイル自身が共通実装を使っていることも検証する。
 */
const ALLOWED_WRAPPERS = {
  'error.tsx': ['components/shell/public-error-screen.js'],
};

const hubRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 状態ファイルが共通実装へ (直接または許可された中継経由で) 繋がっているか。 */
function usesSharedImplementation(source, required) {
  const shared = REQUIRED_IMPORTS[required];
  if (source.includes(shared)) return true;
  for (const wrapper of ALLOWED_WRAPPERS[required] ?? []) {
    if (!source.includes(wrapper)) continue;
    const wrapperPath = join(hubRoot, 'src', wrapper.replace(/\.js$/, '.tsx'));
    // 中継先は共通実装と同じ階層に居ることがあり、相対 import には `components/` が現れない。
    // 判定はファイル名 (error-screen.js) で行う。
    const sharedFile = shared.slice(shared.lastIndexOf('/') + 1);
    try {
      if (readFileSync(wrapperPath, 'utf8').includes(sharedFile)) return true;
    } catch {
      // 中継先が消えていれば「使っていない」扱いにする (握り潰して緑にしない)
    }
  }
  return false;
}

function parseArgs(argv) {
  const options = { appDir: join(hubRoot, 'src', 'app'), json: null };
  for (let index = 0; index < argv.length; index += 2) {
    const value = argv[index + 1];
    if (value === undefined) {
      throw new Error(`${argv[index]} に値がありません`);
    }
    if (argv[index] === '--app-dir') {
      options.appDir = resolve(value);
    } else if (argv[index] === '--json') {
      options.json = resolve(value);
    } else {
      throw new Error(`未知の引数: ${argv[index]}`);
    }
  }
  return options;
}

/** UI セグメントのうち、状態ファイルを要求する単位 (= layout.tsx を持つ dir) を集める。 */
function collectSegments(appDir) {
  const segments = [];
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    // api/ は Response を返す経路で、画面状態の概念を持たない
    const isApiRoute = entries.some((entry) => entry.isFile() && entry.name === 'route.ts');
    if (!isApiRoute && entries.some((entry) => entry.isFile() && entry.name === 'layout.tsx')) {
      segments.push(dir);
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'api') {
        walk(join(dir, entry.name));
      }
    }
  };
  walk(appDir);
  return segments;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const segments = collectSegments(options.appDir);
  const violations = [];

  if (segments.length === 0) {
    violations.push({
      segment: relative(hubRoot, options.appDir),
      kind: 'no-segment',
      detail: 'layout.tsx を持つ UI セグメントが 1 つも無い',
    });
  }

  for (const segment of segments) {
    const present = new Set(
      readdirSync(segment, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name),
    );
    for (const required of REQUIRED_STATE_FILES) {
      const segmentPath = relative(hubRoot, segment);
      if (!present.has(required)) {
        violations.push({ segment: segmentPath, kind: 'missing', detail: `${required} が無い` });
        continue;
      }
      // 存在するだけで中身が独自実装だと、状態の見た目が結局ばらつく
      const source = readFileSync(join(segment, required), 'utf8');
      if (!usesSharedImplementation(source, required)) {
        violations.push({
          segment: segmentPath,
          kind: 'not-shared',
          detail: `${required} が共通実装 (${REQUIRED_IMPORTS[required]}) を使っていない`,
        });
      }
    }
  }

  const report = {
    appDir: relative(hubRoot, options.appDir) || '.',
    segments: segments.map((segment) => relative(hubRoot, segment) || '.'),
    violations,
    ok: violations.length === 0,
    checkedAt: new Date().toISOString(),
  };

  if (options.json !== null) {
    mkdirSync(dirname(options.json), { recursive: true });
    writeFileSync(options.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  for (const segment of report.segments) {
    console.log(`[screen-states] 対象セグメント: ${segment}`);
  }
  for (const violation of violations) {
    console.error(`[screen-states] NG ${violation.segment}: ${violation.detail}`);
  }

  if (!report.ok) {
    console.error(`[screen-states] ${violations.length} 件の欠落があります`);
    process.exit(1);
  }
  console.log(`[screen-states] OK (${segments.length} セグメント x ${REQUIRED_STATE_FILES.length} 状態)`);
}

main();
