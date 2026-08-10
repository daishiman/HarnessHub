// smoke 直前の配信版再確認 (scripts/ci/assert-served-version.mjs) の「挙動」を検査する。
//
// production-auth-gates.test.ts は workflow に step が正しく結線されているかを見る。
// こちらは script 本体を実プロセスとして起動し、本物の HTTP 応答を返すサーバへ当てて
// 「一致しない状況で本当に exit 1 になるか」を exit code で確かめる。
//
// 由来 (HarnessHub-u9zq): version_gate を通したあとも、smoke が始まるまでに鮮度検査が挟まる。
// その間に別 colo の旧版へ smoke が当たる窓が残っていた。run 31221676748 で実際に起きた事象。

import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/ci/assert-served-version.mjs');
const DEPLOYED = 'new-af5778f5';
const OLD = 'old-2e4a6c5b';

/** 応答の作り方をテストごとに差し替えるためのフック。attempt は 1 始まり */
type Responder = (attempt: number) => { status: number; body: string; delayMs?: number };

let server: Server;
let origin: string;
let responder: Responder;
let attempts: number;
let workDir: string;

function healthBody(version: string): string {
  return JSON.stringify({ status: 'ok', version });
}

/** script を実行し、exit code と標準出力/標準エラーを返す (throw させない) */
async function runRecheck(extra: string[] = []): Promise<{ code: number; stdout: string; stderr: string }> {
  const args = [
    SCRIPT,
    '--health-url',
    `${origin}/health`,
    '--expect',
    DEPLOYED,
    '--interval-seconds',
    '0',
    '--timeout-seconds',
    '2',
    ...extra,
  ];
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, args, { encoding: 'utf8' });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? -1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

beforeAll(async () => {
  workDir = mkdtempSync(path.join(tmpdir(), 'smoke-version-recheck-'));
  server = createServer((_request, response) => {
    attempts += 1;
    const { status, body, delayMs } = responder(attempts);
    // cf-ray を返して、観測した colo が証跡へ残ることまで確かめられるようにする
    const send = () => {
      response.writeHead(status, { 'content-type': 'application/json', 'cf-ray': `ray${attempts}-NRT` });
      response.end(body);
    };
    if (delayMs) setTimeout(send, delayMs);
    else send();
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('test server の port を取得できない');
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((done) => server.close(() => done()));
});

describe('smoke 直前の配信版再確認の実挙動', () => {
  beforeAll(() => {
    attempts = 0;
  });

  it('配信版が安定して一致していれば通過する', async () => {
    attempts = 0;
    responder = () => ({ status: 200, body: healthBody(DEPLOYED) });
    const { code, stdout } = await runRecheck();
    expect(code).toBe(0);
    expect(stdout).toContain('streak=3/3');
    expect(stdout).toContain('flapped=false');
  });

  // ここが本件で塞いだ窓そのもの。ゲート通過後も colo によって新旧が混ざる状態を検出する
  it('新旧が混ざる状況では通過させない (伝播ムラを flapped として報告する)', async () => {
    attempts = 0;
    responder = (attempt) => ({ status: 200, body: healthBody(attempt % 3 === 0 ? OLD : DEPLOYED) });
    const { code, stdout, stderr } = await runRecheck();
    expect(code).toBe(1);
    expect(stdout).toContain('flapped=true');
    expect(stderr).toContain('colo 間の伝播が完了していない');
  });

  it('配信版が旧版のままなら期限切れで失敗する (待っただけで通さない)', async () => {
    attempts = 0;
    responder = () => ({ status: 200, body: healthBody(OLD) });
    const { code, stderr } = await runRecheck();
    expect(code).toBe(1);
    expect(stderr).toContain('配信版が入れ替わっていない');
  });

  it('/health が 5xx を返す状況を「変化なし」と読み替えず失敗する', async () => {
    attempts = 0;
    responder = () => ({ status: 500, body: '{}' });
    const { code, stdout } = await runRecheck();
    expect(code).toBe(1);
    expect(stdout).toContain('error=HTTP 500');
  });

  it('/health が応答を返さない場合も全体期限内に失敗する', async () => {
    attempts = 0;
    responder = () => ({ status: 200, body: healthBody(DEPLOYED), delayMs: 1_500 });
    const { code, stdout } = await runRecheck(['--timeout-seconds', '1']);
    expect(code).toBe(1);
    expect(stdout).toContain('colo=unreachable');
  });

  it('version フィールドが欠けた応答を一致とみなさない', async () => {
    attempts = 0;
    responder = () => ({ status: 200, body: JSON.stringify({ status: 'ok' }) });
    const { code, stdout } = await runRecheck();
    expect(code).toBe(1);
    expect(stdout).toContain('version フィールドが空');
  });

  it('接続そのものができない場合も success へ倒れない', async () => {
    const { code, stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        SCRIPT,
        '--health-url',
        'http://127.0.0.1:1/health',
        '--expect',
        DEPLOYED,
        '--interval-seconds',
        '0',
        '--timeout-seconds',
        '1',
      ],
      { encoding: 'utf8' },
    ).then(
      (ok) => ({ code: 0, ...ok }),
      (error: { code?: number; stdout?: string; stderr?: string }) => ({
        code: error.code ?? -1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
      }),
    );
    expect(code).toBe(1);
    expect(stdout).toContain('colo=unreachable');
    expect(stderr).toContain('::error::');
  });

  it('判定根拠 (観測ごとの colo と一致状況) を JSON 証跡へ残す', async () => {
    attempts = 0;
    responder = () => ({ status: 200, body: healthBody(DEPLOYED) });
    const jsonPath = path.join(workDir, 'evidence.json');
    const { code } = await runRecheck(['--json', jsonPath]);
    expect(code).toBe(0);

    const evidence = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
      status: string;
      required_consecutive: number;
      achieved_consecutive: number;
      observed_colos: string[];
      observations: { colo: string; matched: boolean }[];
    };
    expect(evidence.status).toBe('pass');
    expect(evidence.achieved_consecutive).toBe(evidence.required_consecutive);
    expect(evidence.observed_colos).toContain('NRT');
    expect(evidence.observations.every((o) => o.matched)).toBe(true);
  });
});
