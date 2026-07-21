/**
 * G8 ゲートの実効性検証。drift 検査が「乖離を実際に検出できる」ことを実測で担保する。
 *
 * 検査本体 (contract-drift.test.ts) が通ることだけを見ていると、比較が壊れて
 * 常に一致と報告する空ゲートになっても気づけない。ここでは意図的に乖離を仕込み、
 * `check:drift` と同じコマンドが非ゼロで終わることを確認する。
 * duplicate detector の HF-A4-DUP-002 と同じ考え方。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderContractDocument } from './contract-registry.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const committedSnapshot = join(packageRoot, 'openapi', 'components.json');

/** vitest の実体を辿る。pnpm workspace では bin が root へ hoist されるため PATH に頼らない。 */
const vitestEntry = (): string => {
  const require = createRequire(import.meta.url);
  return join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
};

/**
 * `check:drift` と同一のコマンドを、指定した snapshot に対して実行する。
 * `CI=true` は vitest の snapshot 自動更新を止めるため (これが無いと乖離が黙って書き潰される)。
 */
function runDriftCheck(snapshotPath: string): number {
  const result = spawnSync(process.execPath, [vitestEntry(), 'run', 'src/contract-drift.test.ts'], {
    cwd: packageRoot,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', HH_OPENAPI_SNAPSHOT: snapshotPath },
  });
  return result.status ?? 1;
}

describe('G8 drift 検査の実効性', () => {
  it('commit 済み snapshot と一致していれば exit 0', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'hh-drift-ok-'));
    const intact = join(workDir, 'components.json');
    writeFileSync(intact, readFileSync(committedSnapshot, 'utf8'));

    expect(runDriftCheck(intact)).toBe(0);
  }, 120_000);

  it('snapshot が生成物と食い違えば非ゼロ終了する (fail-closed)', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'hh-drift-ng-'));
    const drifted = join(workDir, 'components.json');

    // zod 側を変えて snapshot を更新し忘れた状態を模す (制約値を 1 つずらす)
    const original = readFileSync(committedSnapshot, 'utf8');
    const mutated = original.replace('"maxLength": 64', '"maxLength": 65');
    expect(mutated, '乖離を仕込めていない (置換対象が snapshot に無い)').not.toBe(original);
    writeFileSync(drifted, mutated);

    expect(runDriftCheck(drifted)).not.toBe(0);
  }, 120_000);

  it('snapshot が欠けていても黙って通さない', () => {
    const workDir = mkdtempSync(join(tmpdir(), 'hh-drift-missing-'));

    // CI では未作成 snapshot の自動生成も失敗扱いになる (新規契約の追加漏れを通さない)
    expect(runDriftCheck(join(workDir, 'not-created.json'))).not.toBe(0);
  }, 120_000);
});

describe('生成物の決定性', () => {
  it('同じ入力からは常に同じテキストが出る (差分が乖離だけを表す)', () => {
    expect(renderContractDocument()).toBe(renderContractDocument());
  });
});
