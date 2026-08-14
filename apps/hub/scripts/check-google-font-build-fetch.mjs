#!/usr/bin/env node
/**
 * `next/font/google` による Google Fonts の build 時 fetch を禁止する。
 *
 * このゲートが保証するのはフォント経路だけであり、build 全体の
 * network independence は保証しない。Hub と pnpm workspace に宣言された
 * 全 package の source を走査し、Google Fonts の一時的な不調が
 * `next build` / deploy を止める経路の再導入を防ぐ。
 *
 * 使い方:
 *   node scripts/check-google-font-build-fetch.mjs
 *   node scripts/check-google-font-build-fetch.mjs --self-test
 *   node scripts/check-google-font-build-fetch.mjs --json ../../artifacts/google-font-build-fetch.json
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');
const THIS_FILE = fileURLToPath(import.meta.url);
const WORKSPACE_FILE = 'pnpm-workspace.yaml';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const EXCLUDED_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  '.open-next',
  '.wrangler',
  'artifacts',
  'coverage',
  'dist',
  'fixtures',
]);

const FORBIDDEN_RULE = {
  specifier: 'next/font/google',
  reason:
    'next build 中に fonts.googleapis.com / fonts.gstatic.com からフォントを取得し、Google Fonts の不調が deploy 停止に直結する',
  remedy: 'next/font/local と apps/hub/src/assets/fonts/ の同梱実体を使う',
};

function parseArgs(argv) {
  const args = { json: null, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--self-test') {
      args.selfTest = true;
      continue;
    }
    if (argument === '--json') {
      const output = argv[index + 1];
      if (!output || output.startsWith('--')) throw new Error('--json に出力先が必要です');
      args.json = output;
      index += 1;
      continue;
    }
    throw new Error(`未知の引数: ${argument}`);
  }
  return args;
}

function workspacePatterns(repoRoot) {
  const workspacePath = resolve(repoRoot, WORKSPACE_FILE);
  if (!existsSync(workspacePath)) throw new Error(`${WORKSPACE_FILE} が存在しません: ${workspacePath}`);

  const patterns = [];
  let inPackages = false;
  for (const line of readFileSync(workspacePath, 'utf8').split(/\r?\n/)) {
    if (!inPackages) {
      if (/^packages:\s*(?:#.*)?$/.test(line)) inPackages = true;
      continue;
    }
    if (/^[^\s#]/.test(line)) break;
    const match = line.match(/^\s*-\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))/);
    if (!match) continue;
    const pattern = match[1] ?? match[2] ?? match[3];
    if (pattern.startsWith('!')) throw new Error(`除外 workspace pattern は未対応です: ${pattern}`);
    patterns.push(pattern.replace(/\\/g, '/').replace(/\/$/, ''));
  }
  if (patterns.length === 0) throw new Error(`${WORKSPACE_FILE} に workspace package 宣言がありません`);
  return patterns;
}

function expandWorkspacePattern(repoRoot, pattern) {
  const segments = pattern.split('/').filter(Boolean);
  let candidates = [{ id: '', path: repoRoot }];
  for (const segment of segments) {
    if (segment.includes('**') || (segment.includes('*') && segment !== '*')) {
      throw new Error(`workspace pattern は完全パスまたは 1 segment の * のみ対応です: ${pattern}`);
    }
    if (segment === '*') {
      candidates = candidates.flatMap((candidate) => {
        if (!existsSync(candidate.path) || !statSync(candidate.path).isDirectory()) return [];
        return readdirSync(candidate.path, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => ({
            id: candidate.id ? `${candidate.id}/${entry.name}` : entry.name,
            path: join(candidate.path, entry.name),
          }));
      });
    } else {
      candidates = candidates.map((candidate) => ({
        id: candidate.id ? `${candidate.id}/${segment}` : segment,
        path: join(candidate.path, segment),
      }));
    }
  }
  return candidates.length > 0 ? candidates : [{ id: pattern, path: resolve(repoRoot, pattern) }];
}

/** pnpm workspace 宣言から走査 root を毎回再構成し、将来追加 package も取り込む。 */
export function discoverWorkspaceSourceRoots(repoRoot = REPO_ROOT) {
  const byId = new Map();
  for (const pattern of workspacePatterns(repoRoot)) {
    for (const root of expandWorkspacePattern(repoRoot, pattern)) byId.set(root.id, root);
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function walkSourceFiles(target, files = []) {
  if (!existsSync(target)) return files;
  const metadata = statSync(target);
  if (metadata.isFile()) {
    if (SOURCE_EXTENSIONS.some((extension) => target.endsWith(extension))) files.push(resolve(target));
    return files;
  }
  if (!metadata.isDirectory()) return files;
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name))) continue;
    walkSourceFiles(join(target, entry.name), files);
  }
  return files;
}

/** コメントだけを同じ改行数の空白へ変換し、報告行を保つ。 */
function stripComments(source) {
  let output = '';
  let index = 0;
  const blank = (text) => text.replace(/[^\n]/g, ' ');

  while (index < source.length) {
    const pair = source.slice(index, index + 2);
    if (pair === '//') {
      const newline = source.indexOf('\n', index);
      const end = newline === -1 ? source.length : newline;
      output += blank(source.slice(index, end));
      index = end;
      continue;
    }
    if (pair === '/*') {
      const closing = source.indexOf('*/', index + 2);
      const end = closing === -1 ? source.length : closing + 2;
      output += blank(source.slice(index, end));
      index = end;
      continue;
    }
    const quote = source[index];
    if (quote === '"' || quote === "'" || quote === '`') {
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === '\\') {
          end += 2;
          continue;
        }
        if (source[end] === quote) break;
        end += 1;
      }
      output += source.slice(index, Math.min(end + 1, source.length));
      index = end + 1;
      continue;
    }
    output += source[index];
    index += 1;
  }
  return output;
}

/** 通常の static/dynamic import、require、vi.mock に限定して検出する。 */
export function analyzeSource(label, source) {
  const code = stripComments(source);
  const escapedSpecifier = FORBIDDEN_RULE.specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const referencePattern = new RegExp(
    `(?:\\bfrom\\s*|\\bimport\\s*(?:\\(\\s*)?|\\brequire\\s*\\(\\s*|\\bvi\\s*\\.\\s*mock\\s*\\(\\s*)(["'\\x60])${escapedSpecifier}\\1`,
    'g',
  );
  const findings = [];
  for (const match of code.matchAll(referencePattern)) {
    findings.push({
      kind: 'google-font-build-fetch',
      file: label,
      line: code.slice(0, match.index).split('\n').length,
      specifier: FORBIDDEN_RULE.specifier,
      reason: FORBIDDEN_RULE.reason,
      remedy: FORBIDDEN_RULE.remedy,
    });
  }
  return findings;
}

/** root の走査・集計・合否材料を、本番と self-test で共用する。 */
export function evaluateSourceRoots(sourceRoots, { repoRoot = REPO_ROOT, excludedFiles = [THIS_FILE] } = {}) {
  const exclusions = new Set(excludedFiles.map((file) => resolve(file)));
  const seenFiles = new Set();
  const roots = sourceRoots.map((root) => {
    const absolutePath = resolve(root.path);
    const exists = existsSync(absolutePath) && statSync(absolutePath).isDirectory();
    const sourceFiles = exists
      ? walkSourceFiles(absolutePath)
          .filter((file) => !exclusions.has(resolve(file)))
          .sort()
      : [];
    for (const file of sourceFiles) seenFiles.add(file);
    return {
      id: root.id,
      path: relative(repoRoot, absolutePath).split(sep).join('/'),
      exists,
      source_files: sourceFiles.length,
    };
  });

  const files = [...seenFiles].sort();
  const findings = files.flatMap((file) =>
    analyzeSource(relative(repoRoot, file).split(sep).join('/'), readFileSync(file, 'utf8')),
  );
  const missingRootCount = roots.filter((root) => !root.exists).length;
  const emptyRootCount = roots.filter((root) => root.exists && root.source_files === 0).length;
  const failureReasons = [];
  if (missingRootCount > 0) failureReasons.push('missing-declared-root');
  if (emptyRootCount > 0) failureReasons.push('empty-declared-root');
  if (findings.length > 0) failureReasons.push('forbidden-google-font-build-fetch');

  return {
    check: 'google-font-build-fetch',
    test_ids: ['G18-GF-01', 'G18-GF-02'],
    forbidden: [FORBIDDEN_RULE.specifier],
    declared_root_count: roots.length,
    missing_root_count: missingRootCount,
    empty_root_count: emptyRootCount,
    scanned_files: files.length,
    violation_count: findings.length,
    status: failureReasons.length === 0 ? 'pass' : 'fail',
    failure_reasons: failureReasons,
    roots,
    findings,
  };
}

export function getExitCode(result) {
  return result.status === 'pass' ? 0 : 1;
}

function writeFixture(root, relativePath, content) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

/** 安全・意図的違反・空・欠落を、本番と同じ evaluate/getExitCode で反転確認する。 */
export function runSelfTest() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'google-font-build-fetch-self-test-'));
  const forbidden = FORBIDDEN_RULE.specifier;
  try {
    writeFixture(fixtureRoot, 'safe/index.ts', `// ${forbidden} は禁止\nimport localFont from 'next/font/local';\n`);
    writeFixture(
      fixtureRoot,
      'violation/index.ts',
      [
        `import font from '${forbidden}';`,
        `const required = require('${forbidden}');`,
        `vi.mock('${forbidden}', () => ({}));`,
      ].join('\n'),
    );
    mkdirSync(join(fixtureRoot, 'empty'), { recursive: true });

    const cases = [
      {
        name: '安全 fixture',
        roots: [{ id: 'safe', path: join(fixtureRoot, 'safe') }],
        expectedExit: 0,
        expectedViolations: 0,
      },
      {
        name: '意図的違反 fixture',
        roots: [{ id: 'violation', path: join(fixtureRoot, 'violation') }],
        expectedExit: 1,
        expectedViolations: 3,
      },
      {
        name: '空 root fixture',
        roots: [{ id: 'empty', path: join(fixtureRoot, 'empty') }],
        expectedExit: 1,
        expectedEmptyRoots: 1,
      },
      {
        name: '欠落 root fixture',
        roots: [{ id: 'missing', path: join(fixtureRoot, 'missing') }],
        expectedExit: 1,
        expectedMissingRoots: 1,
      },
    ];

    let failures = 0;
    for (const fixture of cases) {
      const result = evaluateSourceRoots(fixture.roots, { repoRoot: fixtureRoot });
      const passed =
        getExitCode(result) === fixture.expectedExit &&
        (fixture.expectedViolations === undefined || result.violation_count === fixture.expectedViolations) &&
        (fixture.expectedEmptyRoots === undefined || result.empty_root_count === fixture.expectedEmptyRoots) &&
        (fixture.expectedMissingRoots === undefined || result.missing_root_count === fixture.expectedMissingRoots);
      if (!passed) failures += 1;
      console.log(`  ${passed ? 'OK' : 'NG'} ${fixture.name}`);
    }
    if (failures > 0) console.error(`[google-font-build-fetch] self-test NG: ${failures}/${cases.length} ケース`);
    else console.log(`[google-font-build-fetch] self-test OK: ${cases.length}/${cases.length} ケース`);
    return failures === 0 ? 0 : 1;
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
}

function printResult(result) {
  for (const root of result.roots) {
    if (!root.exists) console.error(`  - 宣言 root 欠落: ${root.id} (${root.path})`);
    else if (root.source_files === 0) console.error(`  - 宣言 root が空: ${root.id} (${root.path})`);
  }
  for (const finding of result.findings) {
    console.error(
      `  - ${finding.file}:${finding.line}: ${finding.specifier} — ${finding.reason}\n      → ${finding.remedy}`,
    );
  }
  const summary = `root ${result.declared_root_count} / source ${result.scanned_files} / 違反 ${result.violation_count} / 欠落 ${result.missing_root_count} / 空 ${result.empty_root_count}`;
  if (getExitCode(result) === 0) console.log(`[google-font-build-fetch] OK: ${summary}`);
  else console.error(`[google-font-build-fetch] NG: ${summary}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return runSelfTest();

  const result = evaluateSourceRoots(discoverWorkspaceSourceRoots(REPO_ROOT));
  if (args.json) {
    const output = resolve(args.json);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  }
  printResult(result);
  return getExitCode(result);
}

if (process.argv[1] && resolve(process.argv[1]) === THIS_FILE) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`[google-font-build-fetch] NG: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
