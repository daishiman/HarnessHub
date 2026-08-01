#!/usr/bin/env node
// apps/hub → packages/db スキーマ実体への直接アクセス禁止の静的検査
// (feat-publish-pipeline P08 / AD-1 / cross-feature 境界判断 "スキーマ owner=feat-domain-model-db")。
//
// 本 feature は `packages/db/schema/` を write scope に持たない。持たないことは計画上の宣言にすぎず、
// 実装がその宣言を守っているかは別問題である。`packages/db` の package.json は
// `"./schema": "./schema/index.ts"` を **公開 subpath として出している**ので、
// apps/hub 側から `@harness-hub/db/schema` と書けばテーブル定義に直接届いてしまう。
// 届いた瞬間、feat-domain-model-db が列を変える自由を feat-publish-pipeline が奪う。
//
// 検査するのは 2 点。どちらも import 指定子の文字列から決定的に決まる (実行環境に依存しない):
//   1. (T-DBB-01) `@harness-hub/db` の **公開入口以外** を参照していない
//      = subpath (`/schema`, `/repository`, `/connection` …) を一切使わない
//   2. (T-DBB-02) 相対 path で `packages/db/` へ到達していない
//      (`../../../packages/db/schema/core/publish` の形で 1 を迂回できるため)
//
// 1 を subpath 全面禁止にしているのは、`/schema` だけを禁じると `/repository` 経由で
// 行型がそのまま業務ロジックへ流れる経路が残るため。公開入口 (`.`) は
// feat-domain-model-db が「外へ出してよい」と決めた面であり、
// **境界を 1 枚に保つ**ことがこの検査の目的である。現時点で subpath 参照は 0 件なので、
// この禁止は既存コードを 1 行も曲げない (= 追加の制約ではなく現状の固定である)。
//
// 使い方:
//   node apps/hub/scripts/check-db-schema-boundary.mjs
//   node apps/hub/scripts/check-db-schema-boundary.mjs --json <path>

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');

const SCAN_DIRS = ['src', 'tests'];
const SOURCE_EXT = ['.ts', '.tsx', '.mts'];
const EXCLUDE_DIRS = ['node_modules', '.next', '.open-next', 'dist', 'coverage'];

/** packages/db の package 名。公開入口はこれ **そのもの** だけ。 */
const DB_PACKAGE = '@harness-hub/db';

/** スキーマ実体が置かれている場所。相対 path での到達もここで判定する。 */
const DB_SCHEMA_DIR = resolve(REPO_ROOT, 'packages', 'db');

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
 * コメントの中身を落とす (行数は保つ)。
 * `packages/db/schema/` は境界を説明する注記として本文中に何度も現れるので、
 * 落とさないと説明文が違反として数えられる。文字列リテラルは import 指定子そのものなので残す。
 */
function stripComments(source) {
  let out = '';
  let i = 0;
  const blank = (text) => text.replace(/[^\n]/g, ' ');

  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      out += blank(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += blank(source.slice(i, stop));
      i = stop;
      continue;
    }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
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

/** import / export ... from / dynamic import / require の module 指定子を行番号つきで列挙する。 */
function moduleSpecifiers(code) {
  const found = [];
  const patterns = [
    /(?:^|\n)\s*import\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) {
      found.push({ specifier: m[1], line: code.slice(0, m.index).split('\n').length });
    }
  }
  return found;
}

/** 相対指定子が packages/db の内側へ届くか。解決できない指定子は「届かない」と扱う。 */
function reachesDbPackage(fromFile, specifier) {
  if (!specifier.startsWith('.')) return false;
  const target = resolve(dirname(fromFile), specifier);
  const rel = relative(DB_SCHEMA_DIR, target);
  // 空文字 = packages/db そのもの、'..' 始まり = 外側、絶対 path = 別ルート (到達しない)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonPath = jsonIndex > -1 ? resolve(process.argv[jsonIndex + 1]) : null;

  const files = SCAN_DIRS.flatMap((d) => walk(join(HUB_ROOT, d)));
  const findings = [];

  for (const file of files) {
    const relativePath = relative(REPO_ROOT, file);
    const code = stripComments(readFileSync(file, 'utf8'));

    for (const { specifier, line } of moduleSpecifiers(code)) {
      if (specifier.startsWith(`${DB_PACKAGE}/`)) {
        findings.push({
          kind: 'db-subpath-import',
          test_id: 'T-DBB-01',
          file: relativePath,
          line,
          detail: `'${specifier}' は packages/db の subpath。公開入口 '${DB_PACKAGE}' のみを経由してください`,
        });
        continue;
      }
      if (reachesDbPackage(file, specifier)) {
        findings.push({
          kind: 'db-relative-reach',
          test_id: 'T-DBB-02',
          file: relativePath,
          line,
          detail: `'${specifier}' は相対 path で packages/db の内部へ到達しています`,
        });
      }
    }
  }

  const result = {
    check: 'db-schema-boundary',
    test_ids: ['T-DBB-01', 'T-DBB-02'],
    db_package: DB_PACKAGE,
    scanned_files: files.length,
    violation_count: findings.length,
    findings,
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (findings.length === 0) {
    console.log(`[db-schema-boundary] OK: 走査 ${files.length} ファイル / 違反 0 件`);
    process.exit(0);
  }
  console.error(`[db-schema-boundary] NG: 境界違反 ${findings.length} 件`);
  for (const f of findings) console.error(`  - [${f.kind}] ${f.file}:${f.line}: ${f.detail}`);
  console.error(`  スキーマ実体の owner は feat-domain-model-db です。${DB_PACKAGE} の公開入口だけを使ってください。`);
  process.exit(1);
}

main();
