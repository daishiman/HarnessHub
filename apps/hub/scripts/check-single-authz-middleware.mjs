#!/usr/bin/env node
// 認可判定の単一集約を機械検証する (SEC2 / qa-020 / feat-auth-tenancy P09)。
//
// 「認可判定が 1 箇所にある」は宣言では守れない。守れないまま増えると、
// route ごとに少しずつ違う role 比較が生えて、matrix テストが実態を覆わなくなる。
// そこで **role 判定の語彙** がどのファイルに現れるかを検査する:
//
//   - role 文字列リテラル (`'provider-admin'` 等) の比較・順序づけ
//   - 判定を意味する識別子 (`ROLE_ORDER` / `effectiveRole` / `minRole` / `hasRole` ...)
//
// これらが `apps/hub/src/lib/authz/` の外に現れたら fail。
// 型の定義 (packages/schemas) と matrix テストは allowlist で明示的に除外する。
// **除外は増やす前に「その場所で本当に判定してよいか」を疑うこと** —
// allowlist を足すのは検査を弱める操作で、宣言に戻る一歩になる。
//
// もう 1 つ、`withAuthz()` を通さない route の**例外一覧**を期待集合と厳密一致で照合する
// (ADR AD-4)。判定が 1 箇所にあっても、そこを通らない route が黙って増えれば同じことなので。
//
// 使い方:
//   node apps/hub/scripts/check-single-authz-middleware.mjs
//   node apps/hub/scripts/check-single-authz-middleware.mjs --json <path>

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');

const SOURCE_EXT = ['.ts', '.tsx', '.mts'];
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build', 'coverage'];

/** 判定を書いてよい唯一の場所。 */
const DECISION_DIR = join(HUB_ROOT, 'src', 'lib', 'authz');

/**
 * 判定語彙が現れてよい例外。理由を必ず併記する (理由の無い除外を作らない)。
 * path は repository root からの相対。
 */
const ALLOWLIST = [
  {
    path: 'packages/schemas/auth-tenancy/primitives.ts',
    reason: 'role の**型**定義 (z.enum)。値の意味付けはせず、判定は lib/authz が行う',
  },
  {
    path: 'apps/hub/tests/auth-tenancy/authz-matrix.test.ts',
    reason: 'backend-spec §3.3 の matrix を仕様側から書き下す表。実装を参照すると検査が自己言及になる',
  },
  {
    path: 'apps/hub/tests/auth-tenancy/tenant-isolation.test.ts',
    reason: 'role×action の越境不可を総当たりする分離テスト。期待値として role 語彙を持つ',
  },
];

/**
 * `withAuthz()` を通さない route の**期待集合** (ADR AD-4「例外扱いする route」)。
 *
 * detector 本体 (`scripts/ci/check-shared-layer-duplicates.mjs`) は
 * 「登録簿に載っている exemption は許す」しか見ない。それだけだと **exemption を 1 行足せば
 * 認可の外に出られる**ので、登録簿が育っても誰も気付かない。
 * ここでは期待集合との**厳密一致**を要求し、増減の両方を fail にする。
 *
 * 例外が正当なのは「認証前に到達する」構造的理由がある経路だけ。
 * 追加するなら、まず ADR AD-4 の表を直すこと。
 */
const REGISTRY_PATH = join(REPO_ROOT, 'scripts', 'ci', 'shared-layer-registry.json');
const EXPECTED_EXEMPTIONS = [
  'apps/hub/src/app/health/route.ts',
  'apps/hub/src/app/api/auth/[...nextauth]/route.ts',
  'apps/hub/src/app/api/v1/device/code/route.ts',
  'apps/hub/src/app/api/v1/device/token/route.ts',
  'apps/hub/src/app/api/v1/token/refresh/route.ts',
];

/**
 * 判定とみなす記述。identifier 系と「role リテラルの比較」を分けて数える。
 *
 * `effectiveRole` は意図的に**含めない**。あれは判定の *結果* であり、
 * handler が受け取って読むのは wrapper 設計そのもの (それを禁じたら decide の意味が無い)。
 * 結果を使って**再判定**する形 (`authz.effectiveRole === 'workspace-admin'`) は
 * 下の ROLE_COMPARISON 側で捕まる。
 */
const DECISION_IDENTIFIERS =
  /\b(?:ROLE_ORDER|ROLE_RANK|roleRank|roleOrder|minRole|requiredRole|hasRole|requireRole|isAdmin|canAccess|checkPermission|ACTION_RULES)\b/g;
const ROLE_LITERAL = `'(?:provider-admin|workspace-admin|owner|member)'|"(?:provider-admin|workspace-admin|owner|member)"`;
/** `role === 'owner'` / `'member' !== x` / 配列順序づけ など、リテラルを判定に使う形。 */
const ROLE_COMPARISON = new RegExp(
  `(?:[=!]==?\\s*(?:${ROLE_LITERAL}))|(?:(?:${ROLE_LITERAL})\\s*[=!]==?)|(?:\\[\\s*(?:${ROLE_LITERAL})\\s*,)`,
  'g',
);

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

/** コメントの中身だけを空白へ潰す (行番号は保つ)。説明文の role 語彙を違反に数えないため。 */
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

function lineOf(code, index) {
  return code.slice(0, index).split('\n').length;
}

/** 登録簿の exemption 一覧が期待集合と厳密一致しているかを見る (ADR AD-4)。 */
function checkExemptions() {
  const findings = [];
  if (!existsSync(REGISTRY_PATH)) {
    return [
      {
        kind: 'registry-missing',
        file: relative(REPO_ROOT, REGISTRY_PATH),
        line: 0,
        detail: '登録簿が見つからず exemption を照合できない。検査を skip せず fail 扱いにする',
      },
    ];
  }

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  const actual = (registry.route_handler_policy?.exemptions ?? []).map((entry) => entry.path);
  const expected = new Set(EXPECTED_EXEMPTIONS);

  for (const path of actual) {
    if (!expected.has(path)) {
      findings.push({
        kind: 'unexpected-authz-exemption',
        file: 'scripts/ci/shared-layer-registry.json',
        line: 0,
        detail: `認可 wrapper の例外 '${path}' が期待集合に無い。認証前に到達する構造的理由があるなら ADR AD-4 の表と本スクリプトを先に更新すること`,
      });
    }
  }
  for (const path of EXPECTED_EXEMPTIONS) {
    if (!actual.includes(path)) {
      findings.push({
        kind: 'missing-authz-exemption',
        file: 'scripts/ci/shared-layer-registry.json',
        line: 0,
        detail: `期待していた例外 '${path}' が登録簿に無い。route を消したなら本スクリプトの期待集合からも消すこと`,
      });
    }
  }
  return findings;
}

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonPath = jsonIndex > -1 ? resolve(process.argv[jsonIndex + 1]) : null;

  const allowed = new Map(ALLOWLIST.map((entry) => [entry.path, entry.reason]));
  const files = [
    ...walk(join(HUB_ROOT, 'src')),
    ...walk(join(HUB_ROOT, 'tests')),
    ...walk(join(REPO_ROOT, 'packages', 'schemas', 'auth-tenancy')),
  ];

  const findings = [];
  const allowlistHits = [];

  for (const file of files) {
    const relativePath = relative(REPO_ROOT, file);
    const rel = relativePath.split('\\').join('/');
    if (relative(DECISION_DIR, file).startsWith('..') === false) continue; // 判定層そのもの

    const code = stripComments(readFileSync(file, 'utf8'));
    const hits = [
      ...[...code.matchAll(DECISION_IDENTIFIERS)].map((m) => ({ token: m[0], line: lineOf(code, m.index) })),
      ...[...code.matchAll(ROLE_COMPARISON)].map((m) => ({ token: m[0].trim(), line: lineOf(code, m.index) })),
    ];
    if (hits.length === 0) continue;

    if (allowed.has(rel)) {
      allowlistHits.push({ file: rel, hits: hits.length, reason: allowed.get(rel) });
      continue;
    }
    for (const hit of hits) {
      findings.push({
        kind: 'authz-decision-outside-single-layer',
        file: rel,
        line: hit.line,
        detail: `認可判定の語彙 \`${hit.token}\` が lib/authz/ の外に現れている`,
      });
    }
  }

  // 使われなくなった除外は残さない。「例外だらけだが緑」は検査が死んでいる状態そのもので、
  // 消し忘れた 1 行が後から本物の違反を吸収してしまう
  for (const entry of ALLOWLIST) {
    if (!allowlistHits.some((hit) => hit.file === entry.path)) {
      findings.push({
        kind: 'stale-allowlist-entry',
        file: entry.path,
        line: 0,
        detail: `allowlist に残っているが判定語彙を含まない。除外を削除すること (理由: ${entry.reason})`,
      });
    }
  }

  findings.push(...checkExemptions());

  const result = {
    check: 'single-authz-middleware',
    test_ids: [],
    decision_dir: relative(REPO_ROOT, DECISION_DIR),
    scanned_files: files.length,
    allowlisted_files: allowlistHits,
    expected_route_exemptions: EXPECTED_EXEMPTIONS,
    violation_count: findings.length,
    findings,
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (findings.length === 0) {
    console.log(
      `[single-authz-middleware] OK: 走査 ${files.length} ファイル / 違反 0 件 / allowlist ${allowlistHits.length} 件 / route 例外 ${EXPECTED_EXEMPTIONS.length} 件が期待集合と一致`,
    );
    process.exit(0);
  }
  console.error(`[single-authz-middleware] NG: 判定の分散 ${findings.length} 件`);
  for (const f of findings) console.error(`  - ${f.file}:${f.line}: ${f.detail}`);
  console.error('  認可判定は apps/hub/src/lib/authz/ へ集約し、route は withAuthz() 経由で呼び出してください。');
  process.exit(1);
}

main();
