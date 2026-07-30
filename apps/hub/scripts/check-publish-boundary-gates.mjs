#!/usr/bin/env node
// G15 の正例と負例を一度に検証する self-test。
//
// 個々の静的ゲートが「現在のコードを通す」だけでは、検出器そのものが壊れても
// CI が green になり得る。そこで公開経路へ意図的な inspection bypass と
// packages/db subpath import を一時的に置き、両ゲートが必ず fail-closed で
// 拒否することを確認する。probe は finally で削除し、最後に正例を再確認する。

import { spawnSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const PROBE = resolve(HUB_ROOT, 'src/lib/publish/.ci-g15-negative-control.ts');
const GATES = [resolve(HERE, 'check-publish-inspection-gate.mjs'), resolve(HERE, 'check-db-schema-boundary.mjs')];

function runGate(gate) {
  return spawnSync(process.execPath, [gate], {
    cwd: resolve(HUB_ROOT, '..', '..'),
    encoding: 'utf8',
  });
}

function requireExit(gate, expected, phase) {
  const result = runGate(gate);
  const ok = expected === 'zero' ? result.status === 0 : result.status !== 0;
  if (!ok) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(
      `${phase}: ${gate} の exit=${String(result.status)} は期待 ${expected} と不一致です` +
        (detail ? `\n${detail}` : ''),
    );
  }
  return result.status;
}

function removeProbe() {
  if (existsSync(PROBE)) unlinkSync(PROBE);
}

try {
  removeProbe();
  for (const gate of GATES) requireExit(gate, 'zero', 'positive control');

  writeFileSync(
    PROBE,
    ["import '@harness-hub/db/schema';", 'export const ciNegativeControl = runInspection;', ''].join('\n'),
  );

  const inspectionExit = requireExit(GATES[0], 'nonzero', 'negative control');
  const boundaryExit = requireExit(GATES[1], 'nonzero', 'negative control');
  console.log(`[publish-boundary-gates] negative control OK: inspection=${inspectionExit} boundary=${boundaryExit}`);
} finally {
  removeProbe();
}

for (const gate of GATES) requireExit(gate, 'zero', 'post-cleanup positive control');
console.log('[publish-boundary-gates] OK: 正例・負例・cleanup 後の再検査がすべて成功');
