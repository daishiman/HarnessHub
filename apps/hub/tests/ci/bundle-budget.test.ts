// HF-A2-BUNDLE-001/002: Worker bundle が gzip 後 3MiB 以内であること、およびゲート自体が超過を検出できること
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(APP_ROOT, 'scripts/check-bundle.mjs');
const WORKER_ARTIFACT = path.join(APP_ROOT, '.open-next');

/** quality_constraints: worker-bundle-budget (Cloudflare Workers Free の 3MiB / gzip 後) */
const BUDGET_BYTES = 3 * 1024 * 1024;

const workDirs: string[] = [];

function makeArtifact(sizeBytes: number): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'hub-bundle-'));
  workDirs.push(dir);
  // gzip が効きにくいよう擬似ランダムな内容にして、実サイズに近い計測をさせる
  let content = '';
  let seed = 1;
  while (content.length < sizeBytes) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    content += `const v${seed} = "${seed.toString(36)}";\n`;
  }
  writeFileSync(path.join(dir, 'worker.js'), content, 'utf8');
  return dir;
}

function runCheck(args: readonly string[]): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd: APP_ROOT,
      encoding: 'utf8',
      env: { ...process.env, HUB_BUNDLE_BUDGET_BYTES: '' },
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe('bundle 予算ゲート', () => {
  // HF-A2-BUNDLE-001。ビルド成果物が無い状態を pass にしないため、未ビルド時は skip として可視化する
  it.skipIf(!existsSync(WORKER_ARTIFACT))(
    'Worker bundle が gzip 後 3MiB 以内である',
    () => {
      const reportPath = path.join(mkdtempSync(path.join(tmpdir(), 'hub-report-')), 'report.json');
      workDirs.push(path.dirname(reportPath));

      const result = runCheck(['--artifact', WORKER_ARTIFACT, '--report', reportPath]);
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);

      const report = JSON.parse(readFileSync(reportPath, 'utf8')) as {
        totalGzipBytes: number;
        withinBudget: boolean;
      };
      expect(report.withinBudget).toBe(true);
      expect(report.totalGzipBytes).toBeLessThanOrEqual(BUDGET_BYTES);
    },
  );

  // HF-A2-BUNDLE-002: ゲートが素通りしないことの証明
  it('予算を 1 KiB に絞ると非ゼロ終了する', () => {
    const artifact = makeArtifact(64 * 1024);
    const result = runCheck(['--artifact', artifact, '--budget', String(1024)]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('予算超過');
  });

  it('予算内なら 0 で終了し、実測値を計測結果ファイルに残す', () => {
    const artifact = makeArtifact(4 * 1024);
    const reportPath = path.join(artifact, 'report.json');
    const result = runCheck(['--artifact', artifact, '--budget', String(BUDGET_BYTES), '--report', reportPath]);

    expect(result.status).toBe(0);
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as {
      totalGzipBytes: number;
      budgetBytes: number;
      withinBudget: boolean;
      fileCount: number;
    };
    expect(report.withinBudget).toBe(true);
    expect(report.budgetBytes).toBe(BUDGET_BYTES);
    expect(report.totalGzipBytes).toBeGreaterThan(0);
    expect(report.fileCount).toBeGreaterThan(0);
  });

  it('計測対象が存在しない場合は非ゼロ終了する (未ビルドを予算内と誤判定しない)', () => {
    const result = runCheck(['--artifact', path.join(tmpdir(), 'hub-bundle-does-not-exist')]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('計測対象が見つかりません');
  });

  it('環境変数 HUB_BUNDLE_BUDGET_BYTES で閾値を上書きできる', () => {
    const artifact = makeArtifact(64 * 1024);
    try {
      execFileSync(process.execPath, [SCRIPT, '--artifact', artifact], {
        cwd: APP_ROOT,
        encoding: 'utf8',
        env: { ...process.env, HUB_BUNDLE_BUDGET_BYTES: '1024' },
      });
      throw new Error('非ゼロ終了しませんでした');
    } catch (error) {
      expect((error as { status?: number }).status).toBe(1);
    }
  });
});
