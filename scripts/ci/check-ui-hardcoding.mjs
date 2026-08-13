#!/usr/bin/env node
// 画面層 (層 4) の視覚ハードコーディング detector。
// 判定仕様の正本: architecture/harness-hub-design-system.md §1「一元管理の原則」
//
// デザインシステムは視覚の決定を 4 層に分け、上下関係を守ることで成立している:
//   1. token 値 (packages/ui/src/tokens/tokens.ts)   … 色・余白・角丸・影・書体の値
//   2. token 名 (packages/ui/src/tokens/token-names) … CSS 変数名の導出
//   3. 共通部品 (packages/ui/src/components, shell)  … token をどう組み合わせるか
//   4. 画面     (apps/*/src)                          … どの部品を並べるか
//
// 画面が自分で色や角丸を決めた瞬間、テーマ切替もコントラスト保証も部分的に壊れる。
// しかも壊れ方が「この画面のこのボタンだけ角が違う」という形で現れるため、目視では
// 見つけきれない。そこで機械的に拒否する。
//
// 検出する 4 種 (名前と正規表現だけで決定的に判定する):
//   raw-color   : 生の #hex / rgb() / hsl() (テーマを切り替えても追従しない)
//   own-surface : borderRadius / boxShadow の指定 (面の段は Card/Panel/Tile が持つ)
//   px-media    : px 直書きの @media (breakpoint 正本は mediaUp/mediaDown)
//   bare-button : 素の <button> (見た目と操作域が Button/TextButton とずれる)
//
// 使い方:
//   node scripts/ci/check-ui-hardcoding.mjs             # 検出 0 件でなければ非ゼロ終了
//   node scripts/ci/check-ui-hardcoding.mjs --root <dir> # 走査起点を差し替える (fixture 検証用)
//   node scripts/ci/check-ui-hardcoding.mjs --json <path> # 検出結果を JSON で保存
//   node scripts/ci/check-ui-hardcoding.mjs --no-fail    # 終了コードを常に 0 にする

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** 走査対象は各 apps/<name>/src から自動導出する。新しい app を暗黙に検査外へしない。 */
function screenRoots(root) {
  const appsRoot = join(root, 'apps');
  if (!existsSync(appsRoot)) return [];
  return readdirSync(appsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(appsRoot, entry.name, 'src')))
    .map((entry) => `apps/${entry.name}/src`)
    .sort();
}

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.git', '__tests__', '__fixtures__']);
const SOURCE_EXT = ['.ts', '.tsx'];

/**
 * 意図的な例外。**増やすときは必ず理由を書く**。理由の書けない例外は、
 * 部品側の表現力不足を画面に押し付けているだけなので、部品を直す。
 */
const ALLOWLIST = {
  // RootLayout ごと落ちたときの最後の受け皿。design token が供給されないため
  // @harness-hub/ui に依存できない (依存させると「エラー画面自体が落ちる」経路ができる)。
  'apps/hub/src/app/global-error.tsx': ['bare-button', 'raw-color', 'own-surface'],
};

const RULES = [
  {
    id: 'raw-color',
    // 生の色。`#` は色コードの形 (3/4/6/8 桁) のときだけ拾う
    pattern: /(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(?:rgba?|hsla?)\s*\()/,
    hint: 'var(--hh-color-*) か共通部品の tone/variant を使う (色の値は tokens.ts だけが持つ)',
  },
  {
    id: 'own-surface',
    pattern: /\b(?:borderRadius|boxShadow)\s*:|(?:border-radius|box-shadow)\s*:/,
    hint: '面は Card / Panel / Tile、押せるものは Button / TextButton / ActionLink に寄せる',
  },
  {
    id: 'px-media',
    pattern: /@media[^{]*\d+px/,
    hint: 'mediaUp() / mediaDown() を使う (breakpoint の数値正本は breakpointTokens)',
  },
  {
    id: 'bare-button',
    pattern: /<button[\s>]/,
    hint: '操作は Button、文章に混ぜる小さな操作は TextButton を使う',
  },
];

function parseArgs(argv) {
  const args = { root: REPO_ROOT, json: null, fail: true };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--root') args.root = resolve(argv[++i]);
    else if (a === '--json') args.json = resolve(argv[++i]);
    else if (a === '--no-fail') args.fail = false;
    else throw new Error(`未知の引数: ${a}`);
  }
  return args;
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (SOURCE_EXT.some((ext) => entry.endsWith(ext)) && !/\.test\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

/**
 * コメントを取り除いた行を返す。コメント中の「生の <button> は使わない」「#1677ff は廃止」
 * のような**説明**を違反として数えると、正しく書き残した人が罰せられる。
 * JSX の `{/* … *\/}` は行の途中に現れるため、行頭判定だけでは足りない。
 */
function stripComments(line) {
  const withoutBlocks = line.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '');
  const trimmed = withoutBlocks.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*') || trimmed.startsWith('/*')) {
    return '';
  }
  return withoutBlocks.replace(/\/\/.*$/, '');
}

function scan(root) {
  const findings = [];
  for (const screenRoot of screenRoots(root)) {
    for (const file of walk(join(root, screenRoot))) {
      const relPath = relative(root, file).split('\\').join('/');
      const allowed = ALLOWLIST[relPath] ?? [];
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((rawLine, index) => {
        const line = stripComments(rawLine);
        if (line.trim() === '') return;
        for (const rule of RULES) {
          if (rule.id === 'bare-button') continue;
          if (allowed.includes(rule.id)) continue;
          if (rule.pattern.test(line)) {
            findings.push({ rule: rule.id, file: relPath, line: index + 1, text: rawLine.trim(), hint: rule.hint });
          }
        }
      });
      if (!allowed.includes('bare-button')) {
        const uncommentedSource = lines.map(stripComments).join('\n');
        for (const match of uncommentedSource.matchAll(/<button(?:\s|>)/g)) {
          const offset = match.index ?? 0;
          const line = uncommentedSource.slice(0, offset).split('\n').length;
          findings.push({
            rule: 'bare-button',
            file: relPath,
            line,
            text: lines[line - 1]?.trim() ?? '<button>',
            hint: RULES.find((rule) => rule.id === 'bare-button')?.hint ?? 'Button / TextButton を使う',
          });
        }
      }
    }
  }
  return findings;
}

const args = parseArgs(process.argv);
const findings = scan(args.root);

if (args.json !== null) {
  mkdirSync(dirname(args.json), { recursive: true });
  writeFileSync(args.json, `${JSON.stringify({ findings, count: findings.length }, null, 2)}\n`);
}

if (findings.length === 0) {
  console.log('check:ui-hardcoding OK — 画面層に視覚のハードコーディングはありません');
  process.exit(0);
}

console.error(`check:ui-hardcoding NG — ${findings.length} 件の視覚ハードコーディングを検出しました\n`);
for (const f of findings) {
  console.error(`  [${f.rule}] ${f.file}:${f.line}`);
  console.error(`    ${f.text}`);
  console.error(`    → ${f.hint}\n`);
}
console.error('視覚の決定は packages/ui の層 1-3 に置きます (architecture/harness-hub-design-system.md §1)。');
process.exit(args.fail ? 1 : 0);
