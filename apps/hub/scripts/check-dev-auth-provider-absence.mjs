#!/usr/bin/env node
// dev 専用認証経路が「コードに存在しない」ことの恒久検査 (I7 / qa-036 / feat-auth-tenancy P08)。
//
// 要件は「dev 環境では認証を緩める」ではなく **緩める口をコードに置かない**。
// 環境変数で切る実装 (`if (process.env.SKIP_AUTH)`) は、変数が誤って本番に入った瞬間に
// 全認可が無効化される。設定ミス 1 個で全部が開くものは、実装として置かない。
// Dev tenant も本番と同じ OIDC 経路 (提供者の Google Workspace) を通す。
//
// したがって検査対象は import ではなく **文字列の出現** になる。
// コメントも対象に含める: 「昔ここに mock login があった」等の痕跡ごと消したいため。
//
// 使い方:
//   node apps/hub/scripts/check-dev-auth-provider-absence.mjs
//   node apps/hub/scripts/check-dev-auth-provider-absence.mjs --json <path>

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');

const SOURCE_EXT = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.jsx'];
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build', 'coverage', '.git'];

/**
 * 禁止語は 2 群に分かれ、**群ごとに走査範囲が違う**。
 *
 * 射程を書かない禁止語は、必ず誤検出か検査漏れのどちらかになる。
 * 例えば `password` を全域で禁じると、別 feature の `passwordHash` PII マスキングテストと、
 * 「無いこと」を主張している oidc-verification.test.ts の正規表現リテラル自身を叩いてしまう。
 * 逆に auth 実装だけを見る群に `SKIP_AUTH` を閉じ込めると、route 側の抜け道を見逃す。
 */

/** 認証バイパス系 (T-BND-03)。抜け道はどこに書かれても抜け道なので、hub 全域を見る。 */
const BYPASS_TARGETS = [
  { root: join(HUB_ROOT, 'src'), label: 'apps/hub/src' },
  { root: join(HUB_ROOT, 'tests'), label: 'apps/hub/tests' },
  { root: join(REPO_ROOT, 'packages', 'schemas', 'auth-tenancy'), label: 'packages/schemas/auth-tenancy' },
];

/**
 * パスワード資格情報系 (T-BND-04)。
 * 「Hub がパスワードを **持たない**」ことを言うので、射程は auth 実装そのものに閉じる。
 * users テーブルの `passwordHash` 列は別 feature (feat-domain-model-db) の所有物で、
 * そこは「保持しても Hub 認証には使わない」が正しい状態 — 本検査の対象ではない。
 */
const PASSWORD_TARGETS = [
  { root: join(HUB_ROOT, 'src', 'lib', 'auth'), label: 'apps/hub/src/lib/auth' },
  { root: join(HUB_ROOT, 'src', 'lib', 'authz'), label: 'apps/hub/src/lib/authz' },
  { root: join(HUB_ROOT, 'src', 'shared', 'auth'), label: 'apps/hub/src/shared/auth' },
  { root: join(HUB_ROOT, 'src', 'middleware'), label: 'apps/hub/src/middleware' },
  { root: join(HUB_ROOT, 'src', 'app', 'api'), label: 'apps/hub/src/app/api' },
  { root: join(REPO_ROOT, 'packages', 'schemas', 'auth-tenancy'), label: 'packages/schemas/auth-tenancy' },
];

const EXCLUDED_FROM_SCAN = [
  'apps/hub/scripts/ (本検査スクリプト自身が禁止語を保持するため)',
  'パスワード語群は auth 実装 path のみ (users.passwordHash 列の所有者は feat-domain-model-db)',
];

/** 禁止語。`label` は検出時に「何を疑うべきか」を伝えるための説明。 */
const BYPASS_FORBIDDEN = [
  { pattern: /\bCredentialsProvider\b/g, label: 'Auth.js の Credentials provider (ID/パスワード直受け)' },
  { pattern: /\bCredentials\s*\(/g, label: 'Credentials provider の呼び出し' },
  { pattern: /\bSKIP_AUTH\b/g, label: '認証スキップの環境変数' },
  { pattern: /\bDISABLE_AUTH\b/g, label: '認証無効化の環境変数' },
  { pattern: /\bAUTH_BYPASS\b|\bBYPASS_AUTH\b/g, label: '認証バイパスの環境変数' },
  { pattern: /\bALLOW_INSECURE_AUTH\b/g, label: '検証を緩める環境変数' },
  { pattern: /\bmock[-_]?[Ll]ogin\b|\bmockUser\b|\bfakeUser\b/gi, label: 'mock ログイン / 偽ユーザー' },
  { pattern: /\bdev[-_]?[Ll]ogin\b|\bdevUser\b/g, label: 'dev 専用ログイン' },
  { pattern: /\bimpersonate\b/gi, label: 'なりすましログイン' },
  { pattern: /\bNEXTAUTH_DEV\b|\bAUTH_DEV_MODE\b/g, label: 'dev 専用 Auth モード切替' },
];

const PASSWORD_FORBIDDEN = [
  { pattern: /\bbcrypt\b/gi, label: 'パスワードハッシュ実装 (bcrypt)' },
  { pattern: /\bargon2\b/gi, label: 'パスワードハッシュ実装 (argon2)' },
  { pattern: /\bscrypt\b/gi, label: 'パスワードハッシュ実装 (scrypt)' },
  { pattern: /\bpbkdf2\b/gi, label: 'パスワードハッシュ実装 (PBKDF2)' },
  { pattern: /\bpassword\b|\bpasswd\b/gi, label: 'パスワード資格情報の取り扱い (Hub は IdP へ委譲する)' },
];

const RULE_GROUPS = [
  { id: 'auth-bypass', test_id: 'T-BND-03', targets: BYPASS_TARGETS, rules: BYPASS_FORBIDDEN },
  { id: 'password-credential', test_id: 'T-BND-04', targets: PASSWORD_TARGETS, rules: PASSWORD_FORBIDDEN },
];

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

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonPath = jsonIndex > -1 ? resolve(process.argv[jsonIndex + 1]) : null;

  const findings = [];
  const scanned = new Set();
  const groups = [];

  for (const group of RULE_GROUPS) {
    const files = group.targets.flatMap((target) => walk(target.root));
    for (const file of files) {
      scanned.add(file);
      const rel = relative(REPO_ROOT, file).split('\\').join('/');
      const source = readFileSync(file, 'utf8');
      for (const rule of group.rules) {
        rule.pattern.lastIndex = 0;
        for (const m of source.matchAll(rule.pattern)) {
          findings.push({
            kind: 'dev-only-auth-provider',
            group: group.id,
            test_id: group.test_id,
            file: rel,
            line: source.slice(0, m.index).split('\n').length,
            token: m[0],
            detail: `${rule.label} に該当する記述が存在する`,
          });
        }
      }
    }
    groups.push({
      id: group.id,
      test_id: group.test_id,
      scanned_roots: group.targets.map((t) => t.label),
      scanned_files: files.length,
      forbidden_patterns: group.rules.length,
    });
  }

  const files = [...scanned];
  const result = {
    check: 'dev-auth-provider-absence',
    rule_groups: groups,
    excluded_from_scan: EXCLUDED_FROM_SCAN,
    scanned_files: files.length,
    forbidden_patterns: RULE_GROUPS.reduce((sum, g) => sum + g.rules.length, 0),
    violation_count: findings.length,
    findings,
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (findings.length === 0) {
    console.log(
      `[dev-auth-provider-absence] OK: 走査 ${files.length} ファイル / 禁止語 ${result.forbidden_patterns} 種 (${RULE_GROUPS.map((g) => g.test_id).join('+')}) / 検出 0 件`,
    );
    process.exit(0);
  }
  console.error(`[dev-auth-provider-absence] NG: dev 専用認証経路の痕跡 ${findings.length} 件`);
  for (const f of findings) console.error(`  - [${f.test_id}] ${f.file}:${f.line}: ${f.token} — ${f.detail}`);
  console.error('  dev/demo も本番と同じ OIDC 経路 (Dev tenant = 提供者の Google Workspace) を使ってください。');
  process.exit(1);
}

main();
