// P10 G-04: pnpm の script 不在時 fail-open を required status check の前段で防ぐ。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/ci/check-required-package-script.mjs');
const workDirs: string[] = [];

function runCheck(packageJson: unknown, scriptName = 'required'): { status: number; output: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'hub-required-script-'));
  workDirs.push(dir);
  const packageJsonPath = path.join(dir, 'package.json');
  writeFileSync(packageJsonPath, typeof packageJson === 'string' ? packageJson : JSON.stringify(packageJson), 'utf8');

  try {
    const output = execFileSync(process.execPath, [SCRIPT, packageJsonPath, scriptName], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output };
  } catch (error) {
    const result = error as { status?: number; stdout?: string; stderr?: string };
    return { status: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
  }
}

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe('required package script の存在検査', () => {
  it('非空の script があれば成功する', () => {
    expect(runCheck({ name: 'fixture', scripts: { required: 'echo ok' } })).toMatchObject({ status: 0 });
  });

  it('script が無ければ非ゼロ終了する', () => {
    const result = runCheck({ name: 'fixture', scripts: {} });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('script "required" がありません');
  });

  it('空文字の script も非ゼロ終了する', () => {
    expect(runCheck({ name: 'fixture', scripts: { required: '  ' } }).status).not.toBe(0);
  });

  it('壊れた package.json を黙って通さない', () => {
    expect(runCheck('{').status).not.toBe(0);
  });
});
