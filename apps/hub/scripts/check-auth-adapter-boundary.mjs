#!/usr/bin/env node
// Auth.js adapter 境界の静的検査 (D3 caveat / qa-020 / feat-auth-tenancy P08-P09)。
//
// 判定するのは 3 点だけ。いずれも「名前と参照経路」から決定的に決まるので、
// 実行環境にも next-auth のインストール有無にも依存しない:
//   1. (T-BND-01) Auth.js 固有 module (`next-auth` / `@auth/*`) の import が
//      `src/lib/auth/adapter/` の外に存在しない
//   2. `adapter/` 配下への import が公開入口 (`adapter/index.js`) 経由に閉じている
//   3. (T-BND-02) 公開入口が Auth.js module を `export ... from` で再輸出していない
//
// 2 を入れているのは、1 だけだと「外側が `adapter/callbacks.js` を直に読む」形で
// 境界が骨抜きになるため。3 は「入口は 1 枚だが、その 1 枚が Auth.js 型を素通しする」形を塞ぐ。
// Auth.js 由来の型は Auth.js module からしか入って来られないので、
// 1 と 3 の 2 つで「adapter の公開型に Auth.js 由来型名が漏れない」が構造的に決まる。
// Better Auth へ乗り換える際に触る面を adapter/index.ts 1 枚に保つのが本検査の目的。
//
// 使い方:
//   node apps/hub/scripts/check-auth-adapter-boundary.mjs
//   node apps/hub/scripts/check-auth-adapter-boundary.mjs --json <path>

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');

const SCAN_DIRS = ['src', 'tests'];
const SOURCE_EXT = ['.ts', '.tsx', '.mts'];
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build', 'coverage'];

/** Auth.js 実装の module 指定子。version 差で名前が増えても前方一致で捕まえる。 */
const AUTHJS_MODULE = /^(?:next-auth(?:\/.*)?|@auth\/[^/]+(?:\/.*)?|@next-auth\/[^/]+(?:\/.*)?)$/;

const ADAPTER_DIR = join(HUB_ROOT, 'src', 'lib', 'auth', 'adapter');
/** adapter の公開入口。ここだけが外から参照してよい。 */
const ADAPTER_ENTRY = new Set(['index.js', 'index.ts', 'index.mjs']);

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (SOURCE_EXT.some((ext) => entry.endsWith(ext))) acc.push(full);
  }
  return acc;
}

/**
 * コメントと文字列リテラルの中身を落とす。
 * 「next-auth 未導入」と書いた **説明文** を違反として数えないため。
 * 落とすのは中身だけで、行数 (改行) は保つ (行番号がずれると指摘が読めなくなる)。
 */
function stripNonCode(source) {
  let out = '';
  let i = 0;
  const keepNewlines = (text) => text.replace(/[^\n]/g, ' ');

  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += keepNewlines(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += keepNewlines(source.slice(i, stop));
      i = stop;
      continue;
    }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      // import 指定子は文字列リテラルなので、クォート自体は残して中身を保つ。
      // ここでは「コメントだけ」を落としたいので文字列はそのまま通す。
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === ch) break;
        j += 1;
      }
      out += source.slice(i, Math.min(j + 1, source.length));
      i = j + 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * import / export ... from / dynamic import / require の module 指定子を行番号つきで列挙する。
 * `kind` で再輸出 (`export ... from`) を区別する — 再輸出だけは adapter の内側でも違反になるため。
 */
function moduleSpecifiers(code) {
  const found = [];
  const patterns = [
    { kind: 'import', re: /(?:^|\n)\s*import\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']/g },
    { kind: 're-export', re: /(?:^|\n)\s*export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g },
    { kind: 'import', re: /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g },
    { kind: 'import', re: /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g },
  ];
  for (const { kind, re } of patterns) {
    for (const m of code.matchAll(re)) {
      found.push({ specifier: m[1], kind, line: code.slice(0, m.index).split('\n').length });
    }
  }
  return found;
}

function isInside(file, dir) {
  const rel = relative(dir, file);
  return rel !== '' && !rel.startsWith('..');
}

/**
 * 相対指定子を実ファイルへ解決する。
 * TS の NodeNext では `./x.js` と書いて `./x.ts` を指すので、拡張子は張り替えて探す。
 */
function resolveRelative(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const stem = base.replace(/\.(?:js|mjs|ts|mts|tsx)$/, '');
  for (const candidate of [
    ...SOURCE_EXT.map((ext) => `${stem}${ext}`),
    ...SOURCE_EXT.map((ext) => join(stem, `index${ext}`)),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * 公開入口から到達できる再輸出グラフを辿り、Auth.js module の再輸出を探す (T-BND-02)。
 *
 * 入口 1 枚だけを見るのでは足りない。`index.ts` が `./callbacks.js` を `export *` し、
 * その `callbacks.ts` が `next-auth` を再輸出していれば、入口に next-auth の文字が
 * 一度も現れないまま Auth.js 由来型が境界の外へ出る。**漏れるかどうかは到達可能性で決まる**ので、
 * 検査も到達可能性で書く。
 */
function reexportLeaks(reexportsByFile) {
  const findings = [];
  const entries = [...reexportsByFile.keys()].filter((file) => ADAPTER_ENTRY.has(file.split('/').at(-1) ?? ''));
  const seen = new Set(entries);
  const queue = entries.map((file) => ({ file, chain: [file] }));

  while (queue.length > 0) {
    const { file, chain } = queue.shift();
    for (const { specifier, line } of reexportsByFile.get(file) ?? []) {
      if (AUTHJS_MODULE.test(specifier)) {
        const via = chain.map((f) => relative(REPO_ROOT, f)).join(' -> ');
        findings.push({
          kind: 'authjs-type-reexport',
          file: relative(REPO_ROOT, file),
          line,
          detail: `公開入口から到達する再輸出 (${via}) が Auth.js 固有 module '${specifier}' を通しており、Auth.js 由来型が境界外へ漏れる`,
        });
        continue;
      }
      if (!specifier.startsWith('.')) continue;
      const next = resolveRelative(file, specifier);
      if (next === null || seen.has(next) || !isInside(next, ADAPTER_DIR)) continue;
      seen.add(next);
      queue.push({ file: next, chain: [...chain, next] });
    }
  }
  return findings;
}

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonPath = jsonIndex > -1 ? resolve(process.argv[jsonIndex + 1]) : null;

  const files = SCAN_DIRS.flatMap((d) => walk(join(HUB_ROOT, d)));
  const findings = [];
  /** adapter 内の再輸出辺。入口からの到達可能性判定 (T-BND-02) に使う。 */
  const reexportsByFile = new Map();

  for (const file of files) {
    const relativePath = relative(REPO_ROOT, file);
    const code = stripNonCode(readFileSync(file, 'utf8'));
    const insideAdapter = isInside(file, ADAPTER_DIR);

    if (insideAdapter) {
      reexportsByFile.set(
        file,
        moduleSpecifiers(code).filter((entry) => entry.kind === 're-export'),
      );
    }

    for (const { specifier, line } of moduleSpecifiers(code)) {
      if (AUTHJS_MODULE.test(specifier) && !insideAdapter) {
        findings.push({
          kind: 'authjs-import-outside-adapter',
          file: relativePath,
          line,
          detail: `Auth.js 固有 module '${specifier}' を adapter 境界の外から import している`,
        });
      }

      // adapter 配下への参照。相対 path でしか届かないので相対のみ見る
      if (!insideAdapter && /(?:^|\/)adapter\//.test(specifier) && specifier.startsWith('.')) {
        const target = specifier.split('/').at(-1) ?? '';
        if (!ADAPTER_ENTRY.has(target)) {
          findings.push({
            kind: 'adapter-deep-import',
            file: relativePath,
            line,
            detail: `adapter 内部 '${specifier}' を公開入口 (adapter/index.js) を通さずに参照している`,
          });
        }
      }
    }
  }

  findings.push(...reexportLeaks(reexportsByFile));

  const result = {
    check: 'auth-adapter-boundary',
    test_ids: ['T-BND-01', 'T-BND-02'],
    adapter_dir: relative(REPO_ROOT, ADAPTER_DIR),
    scanned_files: files.length,
    violation_count: findings.length,
    findings,
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (findings.length === 0) {
    console.log(`[auth-adapter-boundary] OK: 走査 ${files.length} ファイル / 違反 0 件`);
    process.exit(0);
  }
  console.error(`[auth-adapter-boundary] NG: 境界違反 ${findings.length} 件`);
  for (const f of findings) console.error(`  - [${f.kind}] ${f.file}:${f.line}: ${f.detail}`);
  console.error('  Auth.js 固有 API は apps/hub/src/lib/auth/adapter/ の内側だけで扱ってください。');
  process.exit(1);
}

main();
