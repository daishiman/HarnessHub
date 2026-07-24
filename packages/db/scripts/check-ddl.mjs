#!/usr/bin/env node
// G7 破壊的 DDL 検査 (expand/contract 3 段階, qa-038【5】)。CI が `pnpm --filter @harness-hub/db run check:ddl` で呼ぶ。
//
// 規約: migration は既定で expand (追加系) のみを許す。契約 (contract = DROP/RENAME/破壊的 ALTER) は、
// expand → デュアルリード/ライト → contract の 3 段階を経たうえで、該当文の直前に
//   -- ddl:contract-approved <理由>
// を明記した場合のみ許す。注釈のない破壊的 DDL は fail-closed で CI を落とす。
// あわせて migration lineage が単一系統 (meta/_journal.json と .sql の 1:1、idx 連番) であることを検査する。

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(PKG_ROOT, 'migrations');

const DESTRUCTIVE = [
  /^\s*DROP\s+TABLE\b/i,
  /^\s*DROP\s+INDEX\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bRENAME\s+(TO|COLUMN)\b/i,
];
const APPROVAL_MARKER = /--\s*ddl:contract-approved\b/;

function fail(message) {
  console.error(`[check:ddl] NG: ${message}`);
  process.exit(1);
}

if (!existsSync(MIGRATIONS_DIR)) {
  console.log('[check:ddl] migrations/ が存在しないため対象なし');
  process.exit(0);
}

// 1) 単一 lineage: journal と .sql の 1:1 / idx 連番
const journalPath = join(MIGRATIONS_DIR, 'meta', '_journal.json');
if (!existsSync(journalPath)) fail('meta/_journal.json がありません (lineage が壊れています)');
const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
if (journal.dialect !== 'sqlite') fail(`dialect が sqlite ではありません: ${journal.dialect}`);
const sqlFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
if (journal.entries.length !== sqlFiles.length) {
  fail(`journal entries (${journal.entries.length}) と .sql ファイル数 (${sqlFiles.length}) が一致しません`);
}
journal.entries.forEach((entry, i) => {
  if (entry.idx !== i) fail(`journal idx が連番ではありません: entries[${i}].idx=${entry.idx}`);
  if (!sqlFiles.some((f) => f.startsWith(`${String(i).padStart(4, '0')}_`))) {
    fail(`idx=${i} に対応する .sql ファイルがありません`);
  }
});

// 2) 破壊的 DDL の fail-closed 検査
const violations = [];
for (const file of sqlFiles) {
  const lines = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (!DESTRUCTIVE.some((re) => re.test(line))) return;
    const approved = APPROVAL_MARKER.test(lines[idx - 1] ?? '');
    if (!approved) violations.push(`${file}:${idx + 1}: ${line.trim()}`);
  });
}
if (violations.length > 0) {
  fail(`承認注釈のない破壊的 DDL:\n  ${violations.join('\n  ')}`);
}

console.log(`[check:ddl] OK: ${sqlFiles.length} migration / 単一 lineage / 未承認の破壊的 DDL 0 件`);
