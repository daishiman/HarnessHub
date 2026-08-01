import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN_ENV = 'BETTER_STACK_TEST_TOKEN';
const BACKUP_SECRET_NAME = 'BACKUP_HEARTBEAT_URL';
const WORKER_SECRET_NAME = 'CRON_HEARTBEAT_URL';
const BACKUP_URL = 'https://uptime.betterstack.com/api/v1/heartbeat/test-backup-secret';
const CLI_SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../scripts/better-stack-monitoring-cli.mjs',
);

interface CliModule {
  describePlan(config: Record<string, unknown>, heartbeatConfigKeys: string[]): string;
  putGitHubSecret(url: string, options: { cwd: string; backupSecretName: string; command?: string }): Promise<boolean>;
  runMonitoringCli(argv: string[], dependencies: Record<string, unknown>): Promise<number>;
}

let workDir = '';
let monitorsPath = '';
let dashboardPath = '';
let cli: CliModule;

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function configFixture(): Record<string, unknown> {
  return {
    application_state: 'applied',
    monitor: {
      local_id: 'hub-health',
      external_id: '1',
      request: { method: 'POST', endpoint: '/api/v2/monitors' },
    },
    heartbeat: {
      local_id: 'hub-cron-daily',
      external_id: '2',
      request: { method: 'POST', endpoint: '/api/v2/heartbeats' },
    },
    backup_heartbeat: {
      local_id: 'hub-backup-daily',
      external_id: null,
      provisioning_state: 'pending_credentials',
      request: { method: 'POST', endpoint: '/api/v2/heartbeats' },
    },
    status_page: {
      local_id: 'harness-hub-status',
      external_id: '3',
      request: { method: 'POST', endpoint: '/api/v2/status-pages' },
      resource_request: { method: 'POST', endpoint_template: '/api/v2/status-pages/{id}/resources' },
    },
  };
}

function dependencies(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    apiBase: 'https://uptime.betterstack.com',
    applyBackupHeartbeat: vi.fn(async ({ config }: { config: Record<string, unknown> }) => ({
      config: {
        ...config,
        backup_heartbeat: {
          ...(config.backup_heartbeat as Record<string, unknown>),
          external_id: '44',
          provisioning_state: 'applied',
        },
      },
      dashboard: null,
      heartbeatUrl: null,
      heartbeatUrls: { [BACKUP_SECRET_NAME]: BACKUP_URL },
      actions: [{ kind: 'heartbeat', action: 'created', external_id: '44' }],
    })),
    applyMonitoring: vi.fn(),
    backupSecretName: BACKUP_SECRET_NAME,
    createUptimeClient: vi.fn(() => ({ client: 'fake' })),
    dashboardPath,
    heartbeatConfigKeys: ['heartbeat', 'backup_heartbeat'],
    hubRoot: workDir,
    monitorsConfigPath: monitorsPath,
    redactSecrets: (value: unknown, token?: string) =>
      String(value)
        .split(BACKUP_URL)
        .join('[REDACTED_URL]')
        .split(token ?? '')
        .join('[REDACTED_TOKEN]'),
    repoRoot: workDir,
    secretName: WORKER_SECRET_NAME,
    tokenEnv: TOKEN_ENV,
    ...overrides,
  };
}

beforeAll(async () => {
  cli = (await import(pathToFileURL(CLI_SCRIPT).href)) as CliModule;
});

beforeEach(() => {
  workDir = mkdtempSync(path.join(tmpdir(), 'better-stack-cli-'));
  monitorsPath = path.join(workDir, 'monitors.json');
  dashboardPath = path.join(workDir, 'dashboard.json');
  writeJson(monitorsPath, configFixture());
  writeJson(dashboardPath, { verdict: { status: 'collection_blocked' } });
  process.env[TOKEN_ENV] = 'test-token';
});

afterEach(() => {
  delete process.env[TOKEN_ENV];
  delete process.env.CAPTURE_PATH;
  vi.restoreAllMocks();
  rmSync(workDir, { recursive: true, force: true });
});

describe('Better Stack monitoring CLI', () => {
  it('backup 限定 dry-run は対象外資源と秘密値を表示しない', () => {
    const output = cli.describePlan({ backup_heartbeat: configFixture().backup_heartbeat }, [
      'heartbeat',
      'backup_heartbeat',
    ]);

    expect(output).toContain('backup_heartbeat: POST /api/v2/heartbeats');
    expect(output).not.toContain('hub-health');
    expect(output).not.toContain(BACKUP_URL);
  });

  it('backup 限定適用は GitHub secret 配送まで成功してから設定を書き戻す', async () => {
    const putGitHubSecretImpl = vi.fn(async () => true);
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const result = await cli.runMonitoringCli(
      ['--only-backup-heartbeat', '--put-github-secret', '--json', 'evidence.json'],
      dependencies({ putGitHubSecretImpl }),
    );

    expect(result).toBe(0);
    expect(putGitHubSecretImpl).toHaveBeenCalledWith(BACKUP_URL, {
      cwd: workDir,
      backupSecretName: BACKUP_SECRET_NAME,
    });
    expect(readJson(monitorsPath).backup_heartbeat).toMatchObject({
      external_id: '44',
      provisioning_state: 'applied',
    });
    expect(readJson(dashboardPath)).toStrictEqual({ verdict: { status: 'collection_blocked' } });
    const evidence = readFileSync(path.join(workDir, 'evidence.json'), 'utf8');
    expect(evidence).toContain('"backup_heartbeat_secret": "delivered"');
    expect(evidence).not.toContain(BACKUP_URL);
    expect(evidence).not.toContain('test-token');
    expect(consoleLog.mock.calls.flat().join('\n')).not.toContain(BACKUP_URL);
  });

  it('GitHub secret 配送に失敗したら pending 設定を維持する', async () => {
    const before = readFileSync(monitorsPath, 'utf8');
    const putGitHubSecretImpl = vi.fn(async () => {
      throw new Error('delivery failed');
    });

    await expect(
      cli.runMonitoringCli(['--only-backup-heartbeat', '--put-github-secret'], dependencies({ putGitHubSecretImpl })),
    ).rejects.toThrow('delivery failed');
    expect(readFileSync(monitorsPath, 'utf8')).toBe(before);
  });

  it('GitHub secret 配送は値を引数へ置かず stdin だけで渡す', async () => {
    const helper = path.join(workDir, 'capture-secret.mjs');
    const capturePath = path.join(workDir, 'capture.json');
    writeFileSync(
      helper,
      [
        '#!/usr/bin/env node',
        "import { writeFileSync } from 'node:fs';",
        "let stdin = '';",
        "process.stdin.setEncoding('utf8');",
        "process.stdin.on('data', (chunk) => { stdin += chunk; });",
        "process.stdin.on('end', () => writeFileSync(process.env.CAPTURE_PATH, JSON.stringify({ argv: process.argv.slice(2), stdin })));",
      ].join('\n'),
      'utf8',
    );
    chmodSync(helper, 0o700);
    process.env.CAPTURE_PATH = capturePath;

    await cli.putGitHubSecret(BACKUP_URL, {
      cwd: workDir,
      backupSecretName: BACKUP_SECRET_NAME,
      command: helper,
    });

    const captured = readJson(capturePath) as { argv: string[]; stdin: string };
    expect(captured.argv).toStrictEqual(['secret', 'set', BACKUP_SECRET_NAME]);
    expect(captured.argv).not.toContain(BACKUP_URL);
    expect(captured.stdin).toBe(BACKUP_URL);
  });
});
