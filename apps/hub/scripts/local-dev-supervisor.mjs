import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_LOG_BYTES = 5 * 1024 * 1024;
const LOG_RETENTION = 5;

function rotateLog(path, maxBytes = MAX_LOG_BYTES, retention = LOG_RETENTION) {
  if (!existsSync(path) || statSync(path).size < maxBytes) return;
  const oldest = `${path}.${retention}`;
  if (existsSync(oldest)) rmSync(oldest, { force: true });
  for (let index = retention - 1; index >= 1; index -= 1) {
    const source = `${path}.${index}`;
    if (existsSync(source)) renameSync(source, `${path}.${index + 1}`);
  }
  renameSync(path, `${path}.1`);
}

export function appendRotatedLog(path, chunk, options = {}) {
  rotateLog(path, options.maxBytes, options.retention);
  appendFileSync(path, chunk, { mode: 0o600 });
}

/**
 * sqld と Next.js の子プロセス監督だけを担当する。
 * launchd の登録、状態表示、smoke、移行は local-dev.mjs 側の責務。
 */
export async function superviseLocalRuntime({
  runtimePaths,
  config,
  env,
  repoRoot,
  hubRoot,
  sqldUrl,
  isPidAlive,
  readJson,
  writeJsonAtomic,
  fetchStatus,
  waitUntil,
}) {
  const previous = readJson(runtimePaths.runtime, {});
  try {
    mkdirSync(runtimePaths.lock);
  } catch {
    if (isPidAlive(previous.supervisorPid)) {
      throw new Error(`supervisor は既に稼働中です (PID ${previous.supervisorPid})`);
    }
    rmSync(runtimePaths.lock, { recursive: true, force: true });
    mkdirSync(runtimePaths.lock);
  }

  let stopping = false;
  const children = { sqld: undefined, next: undefined };
  const runtime = { supervisorPid: process.pid, startedAt: new Date().toISOString(), sqldPid: null, nextPid: null };

  const persist = () => writeJsonAtomic(runtimePaths.runtime, runtime);
  const spawnLogged = (name, executable, args, cwd, logPath) => {
    rotateLog(logPath);
    const appendLog = (chunk) => appendRotatedLog(logPath, chunk);
    const child = spawn(executable, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', appendLog);
    child.stderr.on('data', appendLog);
    children[name] = child;
    runtime[`${name}Pid`] = child.pid ?? null;
    persist();
    child.on('exit', (code, signal) => {
      children[name] = undefined;
      runtime[`${name}Pid`] = null;
      persist();
      if (!stopping) {
        writeFileSync(
          join(runtimePaths.stateRoot, 'supervisor.log'),
          `${new Date().toISOString()} ${name} exited code=${code} signal=${signal}; restarting\n`,
          { flag: 'a', mode: 0o600 },
        );
        setTimeout(() => startChild(name), 1_000);
      }
    });
    return child;
  };
  const startChild = async (name) => {
    if (stopping || children[name]) return;
    if (name === 'sqld') {
      spawnLogged(
        'sqld',
        config.sqldPath,
        ['-d', runtimePaths.db, '--http-listen-addr', '127.0.0.1:8081'],
        repoRoot,
        runtimePaths.sqldLog,
      );
      return;
    }
    await waitUntil(async () => (await fetchStatus(`${sqldUrl}/health`)).status === 200, 30_000, 'sqld');
    spawnLogged(
      'next',
      config.pnpmPath,
      ['exec', 'next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'],
      hubRoot,
      runtimePaths.nextLog,
    );
  };
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const childPids = Object.values(children)
      .map((child) => child?.pid)
      .filter((pid) => Number.isSafeInteger(pid));
    for (const child of Object.values(children)) {
      if (child?.pid && isPidAlive(child.pid)) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          child.kill('SIGTERM');
        }
      }
    }
    const deadline = Date.now() + 10_000;
    const finishWhenStopped = setInterval(() => {
      const alive = childPids.filter(isPidAlive);
      if (alive.length === 0) {
        clearInterval(finishWhenStopped);
        rmSync(runtimePaths.lock, { recursive: true, force: true });
        rmSync(runtimePaths.runtime, { force: true });
        process.exit(0);
      }
      if (Date.now() >= deadline) {
        for (const pid of alive) {
          try {
            process.kill(-pid, 'SIGKILL');
          } catch {
            // 直前に終了した場合は何もしない。
          }
        }
      }
    }, 100);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGHUP', shutdown);
  persist();
  await startChild('sqld');
  await startChild('next');
}
