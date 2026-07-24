// 接続層隔離の静的検査 (qa-020 / P09 / CI-6 相当)。
// packages/db 以外のワークスペース source から DB driver への直接 import を fail-closed で検出する。
// DB アクセスは packages/db のリポジトリ層に閉じる — この検査が「閉じている」ことの機械証明になる。

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const SCAN_ROOTS = ['apps', 'packages'];
const OWNER_DIR = join('packages', 'db');
const SOURCE_EXT = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.jsx'];
const EXCLUDED_DIRS = new Set(['node_modules', '.next', '.open-next', 'dist', 'build', 'coverage']);

/** 禁止 import (driver 直接参照)。型 import も禁止 — 型が漏れれば実装も漏れるため。 */
const FORBIDDEN = [/@libsql\/client/, /drizzle-orm\/libsql/, /drizzle-orm\/d1/, /\bnode:sqlite\b/];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (SOURCE_EXT.some((ext) => entry.endsWith(ext))) acc.push(full);
  }
  return acc;
}

const violations: string[] = [];
for (const root of SCAN_ROOTS) {
  for (const file of walk(join(REPO_ROOT, root))) {
    const rel = relative(REPO_ROOT, file);
    if (rel.startsWith(OWNER_DIR)) continue; // owner (packages/db) 自身は対象外
    const content = readFileSync(file, 'utf8');
    for (const line of content.split('\n')) {
      if (!/^\s*(import|export)\b|require\s*\(/.test(line)) continue;
      if (FORBIDDEN.some((re) => re.test(line))) {
        violations.push(`${rel}: ${line.trim()}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    `[check:connection-isolation] NG: packages/db 外から DB driver への直接 import ${violations.length} 件:\n  ${violations.join('\n  ')}`,
  );
  process.exit(1);
}
console.log('[check:connection-isolation] OK: packages/db 外からの driver 直接 import 0 件');
