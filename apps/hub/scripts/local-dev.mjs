#!/usr/bin/env node
/**
 * Hub ローカル開発ランタイムの単一入口。
 *
 * launchd は supervisor 自体を、supervisor は sqld / Next を監視する。
 * DB・環境変数・ログ・PID は git-ignore 済みの .local-state/hub へ固定する。
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { superviseLocalRuntime } from './local-dev-supervisor.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const hubRoot = resolve(dirname(scriptPath), '..');
const repoRoot = resolve(hubRoot, '../..');
const defaultStateRoot = join(repoRoot, '.local-state', 'hub');
const sqldUrl = 'http://127.0.0.1:8081';
const hubListenUrl = 'http://127.0.0.1:3100';
const hubBrowserUrl = 'http://localhost:3100';
const localReadinessTimeoutMs = 180_000;

export function serviceLabel(root = repoRoot) {
  const suffix = createHash('sha256').update(root).digest('hex').slice(0, 8);
  return `com.harnesshub.${basename(root).replace(/[^A-Za-z0-9.-]/g, '-')}.${suffix}.local-dev`;
}

export function parseEnvFile(source) {
  const parsed = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) throw new Error(`未対応の env 行です: ${rawLine}`);
    const [, key, rawValue = ''] = match;
    let value = rawValue.trim();
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    } else if (value.startsWith('"') && value.endsWith('"')) {
      value = JSON.parse(value);
    }
    parsed[key] = value;
  }
  return parsed;
}

export function serializeEnv(values) {
  return `${Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
    .join('\n')}\n`;
}

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function renderLaunchdPlist({ label, nodePath, stateRoot }) {
  const args = [nodePath, scriptPath, 'supervise', '--state', stateRoot];
  const pathValue = [
    dirname(nodePath),
    process.env.PATH ?? '',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ].join(':');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${xmlEscape(label)}</string>
  <key>ProgramArguments</key>
  <array>${args.map((arg) => `\n    <string>${xmlEscape(arg)}</string>`).join('')}
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ExitTimeOut</key><integer>15</integer>
  <key>LimitLoadToSessionType</key><string>Aqua</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${xmlEscape(pathValue)}</string>
    <key>SSL_CERT_FILE</key><string>/etc/ssl/cert.pem</string>
  </dict>
  <key>StandardOutPath</key><string>${xmlEscape(join(stateRoot, 'supervisor.log'))}</string>
  <key>StandardErrorPath</key><string>${xmlEscape(join(stateRoot, 'supervisor.log'))}</string>
</dict>
</plist>
`;
}

function paths(stateRoot) {
  return {
    stateRoot,
    db: join(stateRoot, 'hub-local.sqld'),
    env: join(stateRoot, 'hub-local.env'),
    config: join(stateRoot, 'runtime-config.json'),
    runtime: join(stateRoot, 'runtime.json'),
    lock: join(stateRoot, 'supervisor.lock'),
    plist: join(stateRoot, `${serviceLabel()}.plist`),
    sqldLog: join(stateRoot, 'sqld.log'),
    nextLog: join(stateRoot, 'next-dev.log'),
  };
}

function parseCli(argv) {
  const command = argv[0] ?? 'help';
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (!arg?.startsWith('--')) throw new Error(`不明な引数です: ${arg}`);
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${arg} の値が必要です`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function commandPath(name) {
  const result = spawnSync('/usr/bin/which', [name], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${name} が PATH にありません`);
  return result.stdout.trim();
}

function writeJsonAtomic(path, value, mode = 0o600) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode });
  renameSync(temporary, path);
}

function isPidAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readJson(path, fallback = undefined) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fetchStatus(url, timeoutMs = 30_000) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => undefined) };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function waitUntil(check, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  }
  throw new Error(`${description} が ${timeoutMs / 1000} 秒以内に ready になりませんでした`);
}

function ensurePrepared(runtimePaths) {
  if (!existsSync(runtimePaths.db) || !existsSync(runtimePaths.env)) {
    throw new Error('先に migrate を実行し、固定DBと環境変数を .local-state/hub へ配置してください');
  }
}

async function migrate(runtimePaths, options) {
  const fromDb = options['from-db'];
  const fromEnv = options['from-env'];
  if (!fromDb || !fromEnv) throw new Error('migrate --from-db <絶対path> --from-env <絶対path> が必要です');
  if (!fromDb.startsWith('/') || !fromEnv.startsWith('/')) throw new Error('移行元は絶対 path で指定してください');
  if (!existsSync(fromDb) || !existsSync(fromEnv)) throw new Error('移行元DBまたはenvが存在しません');
  if (existsSync(runtimePaths.db) || existsSync(runtimePaths.env)) {
    throw new Error('移行先は既に存在します。上書きしません');
  }
  mkdirSync(runtimePaths.stateRoot, { recursive: true, mode: 0o700 });
  chmodSync(runtimePaths.stateRoot, 0o700);
  cpSync(fromDb, runtimePaths.db, { recursive: true, errorOnExist: true, force: false });
  const oldEnv = parseEnvFile(readFileSync(fromEnv, 'utf8'));
  oldEnv.TURSO_DATABASE_URL = sqldUrl;
  writeFileSync(runtimePaths.env, serializeEnv(oldEnv), { mode: 0o600, flag: 'wx' });
  chmodSync(runtimePaths.env, 0o600);
  console.log(JSON.stringify({ ok: true, stateRoot: runtimePaths.stateRoot, sourcePreserved: true }, null, 2));
}

function launchctl(args, { allowFailure = false } = {}) {
  const result = spawnSync('/bin/launchctl', args, { encoding: 'utf8' });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`launchctl ${args[0]} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result;
}

function listenersOccupied() {
  const db = spawnSync('/usr/sbin/lsof', ['-nP', '-iTCP:8081', '-sTCP:LISTEN'], { encoding: 'utf8' });
  const hub = spawnSync('/usr/sbin/lsof', ['-nP', '-iTCP:3100', '-sTCP:LISTEN'], { encoding: 'utf8' });
  return db.status === 0 || hub.status === 0;
}

async function start(runtimePaths) {
  ensurePrepared(runtimePaths);
  mkdirSync(runtimePaths.stateRoot, { recursive: true, mode: 0o700 });
  // node_modules の optional native package は、install を実行した Node の architecture に揃う。
  // 別 architecture の Node へ勝手に切り替えると SWC を再取得するため、現在の executable を固定する。
  const nodePath = process.execPath;
  const config = {
    repoRoot,
    hubRoot,
    stateRoot: runtimePaths.stateRoot,
    nodePath,
    sqldPath: commandPath('sqld'),
    pnpmPath: commandPath('pnpm'),
    sqldUrl,
    hubListenUrl,
    hubBrowserUrl,
  };
  writeJsonAtomic(runtimePaths.config, config);
  const label = serviceLabel();
  const domain = `gui/${process.getuid()}`;
  const alreadyLoaded = launchctl(['print', `${domain}/${label}`], { allowFailure: true }).status === 0;
  if (alreadyLoaded) await stop();
  if (listenersOccupied()) {
    throw new Error('8081 または 3100 は launchd 管理外のプロセスが使用中です。所有PIDを確認してください');
  }
  const plist = renderLaunchdPlist({ label, nodePath, stateRoot: runtimePaths.stateRoot });
  writeFileSync(runtimePaths.plist, plist, { mode: 0o600 });
  const launchAgents = join(homedir(), 'Library', 'LaunchAgents');
  mkdirSync(launchAgents, { recursive: true });
  const installedPlist = join(launchAgents, `${label}.plist`);
  copyFileSync(runtimePaths.plist, installedPlist);
  chmodSync(installedPlist, 0o600);
  launchctl(['bootstrap', domain, installedPlist]);
  await waitUntil(
    async () => (await fetchStatus(`${hubListenUrl}/health`, localReadinessTimeoutMs)).status === 200,
    localReadinessTimeoutMs,
    'Hub /health',
  );
  await waitUntil(
    async () => (await fetchStatus(`${hubListenUrl}/`, localReadinessTimeoutMs)).status === 200,
    localReadinessTimeoutMs,
    'Hub /',
  );
  const report = await status(runtimePaths, true);
  if (!report.ok) throw new Error('起動後の local:status が不合格です');
  return report;
}

async function stop() {
  const label = serviceLabel();
  const domain = `gui/${process.getuid()}`;
  const result = launchctl(['bootout', `${domain}/${label}`], { allowFailure: true });
  const absent = result.status !== 0 && /Could not find service|No such process/i.test(result.stderr || result.stdout);
  if (result.status !== 0 && !absent) throw new Error((result.stderr || result.stdout).trim());
  if (!absent) {
    await waitUntil(
      async () =>
        launchctl(['print', `${domain}/${label}`], { allowFailure: true }).status !== 0 && !listenersOccupied(),
      20_000,
      'launchd job とローカル listener の停止',
    );
  }
  console.log(JSON.stringify({ ok: true, stopped: !absent, dataPreserved: true }, null, 2));
}

async function restart(runtimePaths) {
  ensurePrepared(runtimePaths);
  await stop();
  return start(runtimePaths);
}

async function status(runtimePaths, print = true) {
  const runtime = readJson(runtimePaths.runtime, {});
  const label = serviceLabel();
  const launchd = launchctl(['print', `gui/${process.getuid()}/${label}`], { allowFailure: true });
  // Next dev の初回コンパイルを競合させない。並列に叩くと低資源環境では
  // 各リクエストが互いを待ち、正常でも timeout と誤判定しうる。
  const dbHealth = await fetchStatus(`${sqldUrl}/health`, localReadinessTimeoutMs);
  const hubHealth = await fetchStatus(`${hubListenUrl}/health`, localReadinessTimeoutMs);
  const root = await fetchStatus(`${hubListenUrl}/`, localReadinessTimeoutMs);
  const report = {
    ok:
      launchd.status === 0 &&
      isPidAlive(runtime.supervisorPid) &&
      isPidAlive(runtime.sqldPid) &&
      isPidAlive(runtime.nextPid) &&
      dbHealth.status === 200 &&
      hubHealth.status === 200 &&
      root.status === 200,
    label,
    stateRoot: runtimePaths.stateRoot,
    launchdLoaded: launchd.status === 0,
    processes: {
      supervisor: { pid: runtime.supervisorPid ?? null, alive: isPidAlive(runtime.supervisorPid) },
      sqld: { pid: runtime.sqldPid ?? null, alive: isPidAlive(runtime.sqldPid) },
      next: { pid: runtime.nextPid ?? null, alive: isPidAlive(runtime.nextPid) },
    },
    endpoints: {
      sqldHealth: { url: `${sqldUrl}/health`, status: dbHealth.status },
      hubHealth: { url: `${hubListenUrl}/health`, status: hubHealth.status, appStatus: hubHealth.body?.status },
      hubRoot: { url: `${hubListenUrl}/`, browserUrl: hubBrowserUrl, status: root.status },
    },
  };
  if (print) console.log(JSON.stringify(report, null, 2));
  return report;
}

function loadRuntimeEnv(runtimePaths) {
  const values = parseEnvFile(readFileSync(runtimePaths.env, 'utf8'));
  return { ...process.env, ...values, TURSO_DATABASE_URL: sqldUrl };
}

function runSessionCommand(runtimePaths, account, stdio = 'pipe') {
  const config = readJson(runtimePaths.config);
  if (!config?.pnpmPath) throw new Error('runtime-config.json がありません。local:start を実行してください');
  const result = spawnSync(
    join(repoRoot, 'node_modules', '.bin', 'tsx'),
    [join(repoRoot, 'packages', 'db', 'scripts', 'issue-local-session.ts'), '--account', account],
    {
      cwd: repoRoot,
      env: {
        ...loadRuntimeEnv(runtimePaths),
        PATH: `${dirname(config.nodePath ?? process.execPath)}:${process.env.PATH ?? ''}`,
      },
      encoding: 'utf8',
      stdio,
    },
  );
  if (result.status !== 0) throw new Error(`session 発行に失敗しました: ${result.stderr?.trim() ?? ''}`);
  return result.stdout;
}

async function smoke(runtimePaths) {
  const currentStatus = await status(runtimePaths, false);
  if (!currentStatus.ok) throw new Error('local:status が不合格です');
  const issued = JSON.parse(runSessionCommand(runtimePaths, 'admin'));
  const token = issued.session_cookies?.admin;
  if (!token) throw new Error('admin session cookie が発行されませんでした');
  const response = await fetch(`${hubListenUrl}/api/v1/sheets`, {
    headers: {
      cookie: `${issued.session_cookie_name}=${token}`,
      'x-harness-tenant-id': issued.tenant.id,
      'x-harness-workspace-id': issued.workspace.id,
    },
    // clean な Next dev はこの route の依存 graph を初回だけコンパイルする。
    // 高負荷な共有開発機でも「失敗」と誤判定しないよう、初回のみ最大5分待つ。
    signal: AbortSignal.timeout(300_000),
  });
  const body = await response.json().catch(() => undefined);
  const count = Array.isArray(body?.items) ? body.items.length : -1;
  if (response.status !== 200 || count !== 3) {
    throw new Error(`認証付き sheets smoke が不合格です (HTTP ${response.status}, count=${count})`);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        health: currentStatus.endpoints,
        authenticatedSheets: { status: response.status, count },
        sessionExpiresAt: issued.session_expires_at,
        secretsPrinted: false,
      },
      null,
      2,
    ),
  );
}

async function supervise(runtimePaths) {
  ensurePrepared(runtimePaths);
  mkdirSync(runtimePaths.stateRoot, { recursive: true, mode: 0o700 });
  const config = readJson(runtimePaths.config);
  if (!config?.sqldPath || !config?.pnpmPath) throw new Error('runtime-config.json が不正です');
  const env = loadRuntimeEnv(runtimePaths);
  return superviseLocalRuntime({
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
  });
}

function printHelp() {
  console.log(`Hub local runtime

  migrate --from-db <absolute> --from-env <absolute>  固定stateへ初回コピー（移行元は保持）
  start | status | stop | restart | smoke             launchd 管理と検証
  cookie [--account admin|member|all]                  DBを変更せずcookie発行
  paths                                                secretを含まない保存先表示
`);
}

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseCli(argv);
  const stateRoot = resolve(options.state ?? defaultStateRoot);
  const runtimePaths = paths(stateRoot);
  if (command === 'migrate') return migrate(runtimePaths, options);
  if (command === 'start') return start(runtimePaths);
  if (command === 'status') {
    const report = await status(runtimePaths);
    if (!report.ok) process.exitCode = 1;
    return;
  }
  if (command === 'stop') return stop();
  if (command === 'restart') return restart(runtimePaths);
  if (command === 'smoke') return smoke(runtimePaths);
  if (command === 'cookie') {
    ensurePrepared(runtimePaths);
    const output = runSessionCommand(runtimePaths, options.account ?? 'all');
    process.stdout.write(output);
    return;
  }
  if (command === 'paths') {
    console.log(
      JSON.stringify(
        { stateRoot, db: runtimePaths.db, env: runtimePaths.env, logs: [runtimePaths.sqldLog, runtimePaths.nextLog] },
        null,
        2,
      ),
    );
    return;
  }
  if (command === 'supervise') return supervise(runtimePaths);
  printHelp();
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
