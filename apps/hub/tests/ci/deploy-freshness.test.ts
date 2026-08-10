// deploy 鮮度検査 (check-deploy-freshness.mjs) の「挙動」を検査する。
//
// 由来: 2026-08-03 に着地先を直した commit が 2026-08-07 まで 4 日間本番へ反映されていなかった。
// deploy は success を返し続け /health も 200 を返し続けたため、誰も気づけなかった。
//
// ここで固定したいのは「しきい値を超えた状態を再現したとき、検査が **実際に落ちる**」ことである。
// workflow の文言だけを見る検査 (production-auth-gates.test.ts) では、判定式を書き間違えて
// 常に通過するようになっても緑のままになる。そのため本物の module と本物の CLI を動かす。
//
// TS から `.mjs` を直接 import すると tsconfig の `allowJs: false` で typecheck が落ちるため、
// 判定関数の網羅は `node -e` の子プロセス内で import させ、結果を JSON で受け取る形にしている
// (tests/ci の既存テストが全て subprocess 経由なのと同じ理由)。

import { execFile, execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = path.join(APP_ROOT, 'scripts/check-deploy-freshness.mjs');

const HEAD = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);

interface Verdict {
  readonly outcome: string;
  readonly ok: boolean;
  readonly lagMinutes: number | null;
  readonly reason: string;
}

/** 本物の evaluateFreshness を子プロセスで呼び、判定結果を受け取る */
function evaluate(input: {
  servedCommit?: string | undefined;
  headCommit?: string;
  headCommittedAtIso?: string;
  nowIso?: string;
  maxLagMinutes?: number;
}): Verdict {
  const payload = JSON.stringify({
    servedCommit: input.servedCommit,
    headCommit: input.headCommit ?? HEAD,
    headCommittedAt: input.headCommittedAtIso ?? '2026-08-07T00:00:00.000Z',
    now: input.nowIso ?? '2026-08-07T00:00:00.000Z',
    maxLagMinutes: input.maxLagMinutes ?? 30,
  });

  const source = [
    `const m = await import(${JSON.stringify(SCRIPT)});`,
    `const i = JSON.parse(process.argv[1]);`,
    `i.headCommittedAt = new Date(i.headCommittedAt);`,
    `i.now = new Date(i.now);`,
    `process.stdout.write(JSON.stringify(m.evaluateFreshness(i)));`,
  ].join('\n');

  const out = execFileSync(process.execPath, ['--input-type=module', '-e', source, payload], {
    encoding: 'utf8',
  });
  return JSON.parse(out) as Verdict;
}

describe('evaluateFreshness', () => {
  it('稼働版と HEAD が一致していれば up-to-date で通す', () => {
    const verdict = evaluate({ servedCommit: HEAD });
    expect(verdict.outcome).toBe('up-to-date');
    expect(verdict.ok).toBe(true);
    expect(verdict.lagMinutes).toBe(0);
  });

  it('HEAD 更新直後の乖離は猶予内として通す (deploy には数分かかる)', () => {
    const verdict = evaluate({
      servedCommit: OTHER,
      headCommittedAtIso: '2026-08-07T00:00:00.000Z',
      nowIso: '2026-08-07T00:05:00.000Z',
      maxLagMinutes: 30,
    });
    expect(verdict.outcome).toBe('lagging-within-grace');
    expect(verdict.ok).toBe(true);
    expect(verdict.lagMinutes).toBeCloseTo(5);
  });

  // acceptance: しきい値を超えた状態を再現する fixture で検査が実際に落ちること
  it('しきい値を超えて古いままなら stale で落とす', () => {
    const verdict = evaluate({
      servedCommit: OTHER,
      headCommittedAtIso: '2026-08-07T00:00:00.000Z',
      nowIso: '2026-08-07T01:00:00.000Z',
      maxLagMinutes: 30,
    });
    expect(verdict.outcome).toBe('stale');
    expect(verdict.ok).toBe(false);
    expect(verdict.lagMinutes).toBeCloseTo(60);
  });

  it('本件と同じ 4 日間の放置を再現しても stale で落とす', () => {
    const verdict = evaluate({
      servedCommit: OTHER,
      headCommittedAtIso: '2026-08-03T00:00:00.000Z',
      nowIso: '2026-08-07T00:00:00.000Z',
    });
    expect(verdict.outcome).toBe('stale');
    expect(verdict.ok).toBe(false);
  });

  it('境界 (乖離 = しきい値ちょうど) は stale 側に倒す', () => {
    const verdict = evaluate({
      servedCommit: OTHER,
      headCommittedAtIso: '2026-08-07T00:00:00.000Z',
      nowIso: '2026-08-07T00:30:00.000Z',
      maxLagMinutes: 30,
    });
    expect(verdict.outcome).toBe('stale');
  });

  it.each([
    ['未埋込 (undefined)', undefined],
    ['空文字', ''],
    ['短縮 sha', 'a'.repeat(7)],
    ['大文字', 'A'.repeat(40)],
    ['branch 名', 'main'],
  ])('commit が %s なら commit-unavailable で落とす (fail-open にしない)', (_label, servedCommit) => {
    const verdict = evaluate({ servedCommit });
    expect(verdict.outcome).toBe('commit-unavailable');
    expect(verdict.ok).toBe(false);
  });

  it('埋込が壊れていても「一致しているから通す」にはならない', () => {
    // servedCommit が空で headCommit も空、という壊れ方で `===` が成立しても通さないこと
    const verdict = evaluate({ servedCommit: '', headCommit: '' });
    expect(verdict.ok).toBe(false);
  });
});

describe('check-deploy-freshness.mjs (CLI)', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((done) => server?.close(() => done()));
      server = undefined;
    }
  });

  /** /health を模したサーバを立て、その URL を返す */
  async function serveHealth(body: unknown): Promise<string> {
    server = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    });
    await new Promise<void>((ready) => server?.listen(0, '127.0.0.1', () => ready()));
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}/health`;
  }

  /**
   * CLI を **非同期で** 起動する。execFileSync だとテストプロセスのイベントループが止まり、
   * 同じプロセスに立てた /health サーバが接続を受け付けられず必ず到達不能になる
   */
  async function run(
    healthUrl: string,
    extraArgs: string[] = [],
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((done) => {
      execFile(
        process.execPath,
        [SCRIPT, '--health-url', healthUrl, ...extraArgs],
        { cwd: APP_ROOT, encoding: 'utf8' },
        (error, stdout, stderr) => {
          done({ code: (error as { code?: number } | null)?.code ?? 0, stdout, stderr });
        },
      );
    });
  }

  it('稼働版が HEAD と一致していれば exit 0 で通る', async () => {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: APP_ROOT, encoding: 'utf8' }).trim();
    const url = await serveHealth({ status: 'ok', version: 'v', commit: head });
    const result = await run(url);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).outcome).toBe('up-to-date');
  });

  // 「落ちること」を exit code で固定する。ここが 0 に化けると本番の遅延を誰も検知できなくなる
  it('しきい値を超えた古い版を配信していれば exit 1 で落ちる', async () => {
    const url = await serveHealth({ status: 'ok', version: 'v', commit: OTHER });
    const result = await run(url, ['--max-lag-minutes', '0']);

    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout).outcome).toBe('stale');
    expect(result.stderr).toContain('::error::');
  });

  it('commit を申告しない版を配信していれば exit 1 で落ちる', async () => {
    const url = await serveHealth({ status: 'ok', version: 'v' });
    const result = await run(url);

    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout).outcome).toBe('commit-unavailable');
  });

  it('/health へ到達できなければ exit 1 で落ちる (検査できなかったを成功と混同しない)', async () => {
    // listen していない port へ向ける
    const result = await run('http://127.0.0.1:9/health');
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout).outcome).toBe('health-unreachable');
  });

  it('--health-url も HUB_HEALTH_URL も無ければ引数不備 (exit 2) で止まる', () => {
    // HUB_HEALTH_URL だけを取り除く。env 全体を差し替えると PATH 等が消えて別の理由で落ちうる
    const { HUB_HEALTH_URL: _unset, ...envWithoutHealthUrl } = process.env;
    try {
      execFileSync(process.execPath, [SCRIPT], { cwd: APP_ROOT, encoding: 'utf8', env: envWithoutHealthUrl });
      expect.unreachable('引数不備で終了しなかった');
    } catch (error) {
      expect((error as { status?: number }).status).toBe(2);
    }
  });
});
