import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const checker = resolve('scripts/ci/check-ui-hardcoding.mjs');

function fixture(source) {
  const root = mkdtempSync(join(tmpdir(), 'hh-ui-hardcoding-'));
  const screen = join(root, 'apps', 'new-surface', 'src');
  mkdirSync(screen, { recursive: true });
  writeFileSync(join(screen, 'page.tsx'), source);
  return root;
}

test('workspace に追加された新規 app も自動発見して検査する', () => {
  const root = fixture("export const View = () => <div style={{ color: '#ff00ff' }}>bad</div>;\n");
  const result = spawnSync(process.execPath, [checker, '--root', root], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[raw-color\].*apps\/new-surface\/src\/page\.tsx/s);
});

test('複数行 JSX の bare button を構文として検出する', () => {
  const root = fixture("export const View = () => (\n  <button\n    type=\"button\"\n  >bad</button>\n);\n");
  const result = spawnSync(process.execPath, [checker, '--root', root], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[bare-button\].*apps\/new-surface\/src\/page\.tsx/s);
});

test('共通部品だけを並べる画面は合格する', () => {
  const root = fixture("import { Button } from '@harness-hub/ui';\nexport const View = () => <Button>ok</Button>;\n");

  assert.doesNotThrow(() => execFileSync(process.execPath, [checker, '--root', root], { encoding: 'utf8' }));
});
