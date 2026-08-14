import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { discoverWorkspaceSourceRoots, evaluateSourceRoots, getExitCode } from './check-google-font-build-fetch.mjs';

const temporaryDirectories = [];
const forbiddenSpecifier = ['next/font', 'google'].join('/');
const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, '..', '..', '..');

function makeTemporaryRepository() {
  const root = mkdtempSync(join(tmpdir(), 'google-font-build-fetch-'));
  temporaryDirectories.push(root);
  return root;
}

function writeSource(root, relativePath, source) {
  const target = join(root, relativePath);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, source);
}

function declareWorkspace(root, relativePath, source = 'export const ready = true;\n') {
  writeSource(root, `${relativePath}/package.json`, '{"private":true}\n');
  writeSource(root, `${relativePath}/src/index.ts`, source);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true });
});

test('workspace 宣言から Hub と将来追加 package をすべて発見する', () => {
  const repoRoot = makeTemporaryRepository();
  writeFileSync(
    join(repoRoot, 'pnpm-workspace.yaml'),
    'packages:\n  - "apps/hub"\n  - "packages/ui"\n  - "packages/future"\n',
  );
  declareWorkspace(repoRoot, 'apps/hub');
  declareWorkspace(repoRoot, 'packages/ui');
  declareWorkspace(repoRoot, 'packages/future');

  const roots = discoverWorkspaceSourceRoots(repoRoot);

  assert.deepEqual(
    roots.map((root) => root.id),
    ['apps/hub', 'packages/future', 'packages/ui'],
  );
});

test('通常 import / require / vi.mock を検出し、コメント言及は違反にしない', () => {
  const repoRoot = makeTemporaryRepository();
  declareWorkspace(
    repoRoot,
    'apps/hub',
    [
      `import font from '${forbiddenSpecifier}';`,
      `const required = require('${forbiddenSpecifier}');`,
      `vi.mock('${forbiddenSpecifier}', () => ({}));`,
      `// import ignored from '${forbiddenSpecifier}';`,
      `/* vi.mock('${forbiddenSpecifier}') */`,
    ].join('\n'),
  );

  const result = evaluateSourceRoots([{ id: 'apps/hub', path: join(repoRoot, 'apps/hub') }], { repoRoot });

  assert.equal(result.violation_count, 3);
  assert.equal(getExitCode(result), 1);
});

test('安全な root は合格し、宣言 root が空または欠落なら fail-closed にする', () => {
  const repoRoot = makeTemporaryRepository();
  declareWorkspace(
    repoRoot,
    'apps/hub',
    `// ${forbiddenSpecifier} は使わない\nimport localFont from 'next/font/local';\n`,
  );
  mkdirSync(join(repoRoot, 'packages/empty'), { recursive: true });

  const safe = evaluateSourceRoots([{ id: 'apps/hub', path: join(repoRoot, 'apps/hub') }], { repoRoot });
  const failClosed = evaluateSourceRoots(
    [
      { id: 'packages/empty', path: join(repoRoot, 'packages/empty') },
      { id: 'packages/missing', path: join(repoRoot, 'packages/missing') },
    ],
    { repoRoot },
  );

  assert.equal(getExitCode(safe), 0);
  assert.equal(failClosed.empty_root_count, 1);
  assert.equal(failClosed.missing_root_count, 1);
  assert.equal(getExitCode(failClosed), 1);
});

test('static-gates の G18 は依存インストール前でも実行できる Node 入口を使う', () => {
  const workflow = readFileSync(join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8');
  const g18 = workflow.match(/- name: G18 Google Fonts build fetch 禁止 \/ 同梱フォント台帳の突合\n\s+run: ([^\n]+)/);

  assert.ok(g18, 'G18 の実行ステップが存在すること');
  assert.equal(
    g18[1].trim(),
    'node apps/hub/scripts/check-font-assets.mjs --json-dir ../../artifacts',
    '依存インストール前の static-gates では pnpm ではなく Node 集約入口を直接実行すること',
  );
});
