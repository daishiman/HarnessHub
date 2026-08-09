#!/usr/bin/env node
/**
 * 「動的でなければならない route」がビルド時に静的化されていないかの検査ゲート。
 *
 * なぜ要るのか (2026-08-08 の本番 500 の再発防止):
 *   `/` は session cookie を読む画面だが、`cookies()` の呼び出しが `AUTH_SESSION_SECRET` の有無に
 *   依存していたため、secret を持たないビルド環境では動的 API へ到達せず、Next は `/` を
 *   **静的ページとして事前レンダリング** した。実行時 (secret あり) は `cookies()` を呼ぶので
 *   DYNAMIC_SERVER_USAGE を投げ、ランディングだけが 500 になった。
 *
 *   この退行の厄介さは検知経路が無かったことにある。ユニットテストも `next dev` も `next start` も
 *   緑のままで、workerd 上の本番ビルドでしか出ない。しかも Next の本番ビルドは例外の中身を伏せる。
 *   よって「ビルド成果物の分類」そのものを検査対象にする。
 *
 * 判定材料は `.next/prerender-manifest.json` の `routes`。ここに載る = 事前レンダリング済み。
 *
 * 使い方:
 *   node scripts/check-dynamic-routes.mjs [--build-dir <path>] [--json <path>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 静的化を禁じる route と、その理由。
 * 「要求ごとに変わる入力 (cookie / header / query) を読む画面」だけを載せる。
 */
const MUST_BE_DYNAMIC = [
  {
    route: '/',
    reason: 'session cookie を読んでサインイン済みなら着地先へ redirect するため (静的化すると本番で 500)',
  },
];

function parseArgs(argv) {
  const options = { buildDir: path.join(APP_ROOT, '.next'), json: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`${key} に値がありません`);
    if (key === '--build-dir') {
      options.buildDir = path.resolve(value);
    } else if (key === '--json') {
      options.json = path.resolve(value);
    } else {
      throw new Error(`未知の引数: ${key}`);
    }
  }
  return options;
}

/**
 * 事前レンダリング済み route の集合を読む。manifest が無い = ビルド未実行として扱う (null)。
 *
 * `routes` が期待した形でなければ **例外を投げて落とす (fail-closed)**。
 * `?? {}` で空集合に落とすと、Next の更新で manifest の形が変わった日から
 * 「0 件検査して全件通過」になり、ゲートは緑のままこの検知経路だけが静かに死ぬ。
 * 検査対象が読めなかったことと、検査して違反が無かったことを取り違えない。
 */
export function readPrerenderedRoutes(buildDir) {
  const manifestPath = path.join(buildDir, 'prerender-manifest.json');
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const routes = manifest?.routes;
  if (typeof routes !== 'object' || routes === null || Array.isArray(routes)) {
    throw new Error(
      `prerender-manifest.json の routes が object ではありません (${manifestPath})。` +
        `Next のビルド成果物の形が変わった可能性があります — 静的化検査が空振りするため中止します。`,
    );
  }
  return new Set(Object.keys(routes));
}

/** 違反 (静的化されてしまった route) を返す。 */
export function findStaticViolations(prerenderedRoutes, mustBeDynamic = MUST_BE_DYNAMIC) {
  return mustBeDynamic.filter((entry) => prerenderedRoutes.has(entry.route));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let prerendered;
  try {
    prerendered = readPrerenderedRoutes(options.buildDir);
  } catch (error) {
    // 読めたが形が違う = 検査不能。素通りさせず、何が起きたかだけを 1 行で出して落とす
    console.error(`✘ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  if (prerendered === null) {
    console.error(`prerender-manifest.json が見つかりません: ${options.buildDir}`);
    console.error('先に `pnpm --filter @harness-hub/hub run build:next` を実行してください。');
    process.exit(1);
  }

  const violations = findStaticViolations(prerendered);
  const report = {
    buildDir: options.buildDir,
    checked: MUST_BE_DYNAMIC.map((entry) => entry.route),
    violations: violations.map((entry) => entry.route),
  };

  if (options.json !== null) {
    mkdirSync(path.dirname(options.json), { recursive: true });
    writeFileSync(options.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (violations.length > 0) {
    for (const entry of violations) {
      console.error(`✘ ${entry.route} が静的に事前レンダリングされています — ${entry.reason}`);
    }
    console.error("対象の page.tsx に `export const dynamic = 'force-dynamic';` があるか確認してください。");
    process.exit(1);
  }

  console.log(`✔ 動的必須 route ${report.checked.length} 件はいずれも静的化されていません`);
}

// import されたとき (テスト) は実行しない
if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
