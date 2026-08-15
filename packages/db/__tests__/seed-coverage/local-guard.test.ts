// T4: ローカル専用ガード (test-design.md §3.4)。
//
// ガードは「実行を拒む」ことが仕様なので、関数を呼んで真偽を見るのではなく
// CLI を子プロセスで動かして終了コードと副作用の不在を見る。
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DB_PACKAGE_ROOT } from './support/pending-module';

const CLI = path.join(DB_PACKAGE_ROOT, 'scripts/seed-coverage.ts');
// tsx は @harness-hub/db 自身の devDependency。repo 直下の .bin に固定すると、
// pnpm のクリーンな isolated install では root package が tsx を持たないため CI だけ失敗する。
// package export を解決し、OS ごとの .bin wrapper にも依存せず Node から直接起動する。
const TSX_CLI = createRequire(import.meta.url).resolve('tsx/cli');

/** ADR §8.2 が拒否すると定めた形。 */
const REMOTE_URLS = ['libsql://example.turso.io', 'https://example.turso.io', 'http://192.0.2.1:8080'];
/** 既存 `isLocalDatabaseUrl` が受理する 3 種 (ADR §8.1)。 */
const LOCAL_URL_FORMS = ['http://127.0.0.1:8080', 'http://localhost:8080'];

const REJECTION_MARKER = 'ローカル DB 専用';

let workDir: string;

function runCli(url: string, timeout = 60_000): Promise<{ status: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [TSX_CLI, CLI, '--url', url],
      {
        cwd: DB_PACKAGE_ROOT,
        encoding: 'utf8',
        timeout,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, TURSO_DATABASE_URL: '', AUTH_SESSION_SECRET: 'test-secret' },
      },
      (error, stdout, stderr) => {
        // CLI が仕様どおり非 0 で拒否した場合も、終了コードと文言を assertion 側で検査する。
        // spawn 自体の失敗だけは status を持たないため、実行環境の故障として明示的に落とす。
        if (error !== null && error.code === undefined) {
          reject(error);
          return;
        }
        resolve({
          status: error === null ? 0 : typeof error.code === 'number' ? error.code : null,
          stderr: `${stderr}${stdout}`,
        });
      },
    );
  });
}

beforeAll(() => {
  if (!existsSync(TSX_CLI)) {
    throw new Error(`tsx が見つからない: ${TSX_CLI}。pnpm install 後に実行すること。`);
  }
  workDir = mkdtempSync(path.join(tmpdir(), 'seed-coverage-guard-'));
});

afterAll(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe('T4: ローカル専用ガード', () => {
  it('T4-1: 非ローカル URL の実行が終了コード 2 で終わる', async () => {
    const failures: string[] = [];
    for (const url of REMOTE_URLS) {
      const { status, stderr } = await runCli(url);
      if (status !== 2) failures.push(`${url}: exit=${status}`);
      // 終了コードだけでは、引数不足など別の理由で 2 になった場合と区別できない。
      if (!stderr.includes(REJECTION_MARKER)) failures.push(`${url}: 拒否の文言なし`);
    }
    expect(failures).toEqual([]);
    // 子プロセスを 3 本起こすため、vitest 既定の 5 秒では足りない。
  }, 120_000);

  it('T4-2: 拒否された実行が対象 DB を変更しない', async () => {
    const dbPath = path.join(workDir, 'guard-probe.db');
    // 中身のある DB を用意し、拒否実行の前後で 1 byte も動かないことを見る。
    const seeded = await runCli(`file:${dbPath}`, 120_000);
    expect(seeded.status).toBe(0);

    const before = {
      size: statSync(dbPath).size,
      digest: createHash('sha256').update(readFileSync(dbPath)).digest('hex'),
    };
    for (const url of REMOTE_URLS) {
      await runCli(url);
    }
    expect({
      size: statSync(dbPath).size,
      digest: createHash('sha256').update(readFileSync(dbPath)).digest('hex'),
    }).toEqual(before);
  }, 180_000);

  it('T4-3: ローカル URL が URL 形式を理由に拒否されない', async () => {
    const rejected: string[] = [];
    // 127.0.0.1 / localhost は接続先が無いため実行そのものは失敗しうる。
    // ここで見るのは「URL の形を理由に弾いていないこと」だけである。
    for (const url of LOCAL_URL_FORMS) {
      const { stderr } = await runCli(url);
      if (stderr.includes(REJECTION_MARKER)) rejected.push(url);
    }

    const filePath = path.join(workDir, 'accepted.db');
    const { status, stderr } = await runCli(`file:${filePath}`);
    if (stderr.includes(REJECTION_MARKER)) rejected.push(`file:${filePath}`);
    expect(rejected).toEqual([]);
    expect(status).toBe(0);
  }, 180_000);

  it('T4-4: CLI が isLocalDatabaseUrl を再実装していない', () => {
    const source = readFileSync(CLI, 'utf8');
    expect(source).toMatch(/import\s*\{[^}]*isLocalDatabaseUrl[^}]*\}\s*from\s*'\.\/local-session'/);

    // 判定が二重化すると片方だけ緩む余地が生まれる (ADR §8.2 の G4)。
    // 拒否メッセージやコメントには許可 URL の例が現れてよいので、それらの行は検査から除く。
    // 「文言として書く」ことと「判定として書く」ことの区別が付かないと、正しい実装まで落ちる。
    const patterns = [/libsql:/, /https?:\/\//, /127\.0\.0\.1/, /localhost/, /['"`]file:/];
    const offenders = source
      .split('\n')
      .map((line, index) => ({ line, lineNo: index + 1 }))
      .filter(({ line }) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false;
        if (/console\.(error|warn|log)/.test(line)) return false;
        return patterns.some((pattern) => pattern.test(line));
      })
      .map(({ line, lineNo }) => `${lineNo}: ${line.trim()}`);
    expect(offenders).toEqual([]);
  });
});
