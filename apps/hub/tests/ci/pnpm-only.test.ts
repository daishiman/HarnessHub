// HF-A1-CI-002/003: npm 混入検査が実効的であること、および packageManager が pnpm に pin されていること
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/ci/check-pnpm-only.mjs');

const workDirs: string[] = [];

/** 検査対象の最小 workspace を作る。lockfile を置くかどうかで違反状態を切り替える。 */
function makeWorkspace(options: { packageManager?: string; lockfile?: string }): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'hub-pnpm-only-'));
  workDirs.push(dir);
  const pkg: Record<string, unknown> = { name: 'fixture', private: true };
  if (options.packageManager !== undefined) pkg.packageManager = options.packageManager;
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
  if (options.lockfile) {
    mkdirSync(path.join(dir, 'apps/hub'), { recursive: true });
    writeFileSync(path.join(dir, 'apps/hub', options.lockfile), '{}', 'utf8');
  }
  return dir;
}

function runCheck(root: string): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe('HF-A1-CI-003: packageManager の pnpm pin', () => {
  it('pnpm@ で pin されていれば pass する', () => {
    const result = runCheck(makeWorkspace({ packageManager: 'pnpm@10.9.0' }));
    expect(result.status).toBe(0);
  });

  it('pin が無ければ非ゼロ終了する', () => {
    const result = runCheck(makeWorkspace({}));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('packagemanager-not-pinned');
  });

  it('pnpm 以外に pin されていれば非ゼロ終了する', () => {
    const result = runCheck(makeWorkspace({ packageManager: 'npm@10.0.0' }));
    expect(result.status).not.toBe(0);
  });
});

// ゲートが「素通り」しないことの検証。常時緑になる故障を防ぐため必須 (test-design §5)
describe('HF-A1-CI-002: 他パッケージマネージャの lockfile 混入検出', () => {
  it.each(['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lockb'])(
    '%s を混入させると非ゼロ終了する',
    (lockfile) => {
      const result = runCheck(makeWorkspace({ packageManager: 'pnpm@10.9.0', lockfile }));
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('forbidden-lockfile');
    },
  );

  it('実リポジトリの現状は違反 0 件である', () => {
    const result = runCheck(REPO_ROOT);
    expect(result.status).toBe(0);
  });
});
