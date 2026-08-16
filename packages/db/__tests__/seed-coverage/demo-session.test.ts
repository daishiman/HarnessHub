import { spawnSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTursoClient } from '../../connection/turso';
import { seedDemoCoverage } from '../../scripts/demo-coverage/seed';
import { asCore, createLibsqlTestDb } from '../support/test-db';
import { digestDatabase } from './support/db-digest';
import { DB_PACKAGE_ROOT } from './support/pending-module';

const CLI = path.join(DB_PACKAGE_ROOT, 'scripts/issue-demo-coverage-session.ts');
const TSX_CLI = createRequire(import.meta.url).resolve('tsx/cli');
const TEST_SECRET = 'demo-session-test-secret-with-more-than-32-bytes';
const ACTORS = ['member', 'workspace-admin', 'provider-admin'] as const;
// tsx 子プロセスの起動は全DB suiteのCPU競合下で5秒を超える。CLI自身の30秒上限と揃える。
const CLI_TEST_TIMEOUT_MS = 30_000;

interface SessionOutput {
  readonly ok: boolean;
  readonly tenant: { readonly id: string; readonly slug: string };
  readonly workspace: { readonly id: string; readonly slug: string };
  readonly accounts: ReadonlyArray<{
    readonly key: (typeof ACTORS)[number];
    readonly userId: string;
    readonly email: string;
    readonly role: (typeof ACTORS)[number];
  }>;
  readonly session_cookie_name: string;
  readonly session_cookies: Readonly<Record<(typeof ACTORS)[number], string>>;
  readonly session_expires_at: string;
}

interface CliResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

let workDir: string;
let databaseUrl: string;
let schemaReady = false;

function runCli(url: string, secret = TEST_SECRET): CliResult {
  const result = spawnSync(process.execPath, [TSX_CLI, CLI, '--url', url], {
    cwd: DB_PACKAGE_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      TURSO_DATABASE_URL: '',
      TURSO_AUTH_TOKEN: '',
      AUTH_SESSION_SECRET: secret,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function decodePayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1] ?? '', 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasValidSignature(token: string): boolean {
  const [head, body, signature, ...rest] = token.split('.');
  if (head === undefined || body === undefined || signature === undefined || rest.length !== 0) return false;
  return createHmac('sha256', TEST_SECRET).update(`${head}.${body}`).digest('base64url') === signature;
}

async function resetDemoCoverage(): Promise<Awaited<ReturnType<typeof digestDatabase>>> {
  const adapter = schemaReady ? createTursoClient({ url: databaseUrl }) : await createLibsqlTestDb(databaseUrl);
  schemaReady = true;
  try {
    await seedDemoCoverage({ adapter: asCore(adapter) });
    return await digestDatabase(adapter);
  } finally {
    adapter.close();
  }
}

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), 'demo-coverage-session-'));
  databaseUrl = `file:${path.join(workDir, 'coverage.db')}`;
});

afterAll(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

describe('demo coverage session CLI', () => {
  it('issues independently verifiable, expiring sessions for all three seeded actors without mutating the DB', async () => {
    const beforeDigest = await resetDemoCoverage();
    const result = runCli(databaseUrl);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');

    const output = JSON.parse(result.stdout) as SessionOutput;
    expect(output.ok).toBe(true);
    expect(output.tenant.slug).toBe('demo');
    expect(output.workspace.slug).toBe('main');
    expect(output.session_cookie_name).toBe('__Host-harness-hub.session');
    expect(output.accounts.map((account) => account.key)).toEqual(ACTORS);
    expect(Object.keys(output.session_cookies)).toEqual(ACTORS);

    const violations: string[] = [];
    for (const actor of ACTORS) {
      const account = output.accounts.find((candidate) => candidate.key === actor);
      const token = output.session_cookies[actor];
      const claims = decodePayload(token);
      if (account === undefined) {
        violations.push(`${actor}: account missing`);
        continue;
      }
      if (!hasValidSignature(token)) violations.push(`${actor}: invalid signature`);
      if (claims?.sub !== account.userId) violations.push(`${actor}: subject mismatch`);
      if (claims?.tenant_id !== output.tenant.id) violations.push(`${actor}: tenant mismatch`);
      if (claims?.role !== actor) violations.push(`${actor}: role mismatch`);
      if (claims?.status !== 'active') violations.push(`${actor}: inactive session`);
      if (JSON.stringify(claims?.workspace_ids) !== JSON.stringify([output.workspace.id])) {
        violations.push(`${actor}: workspace mismatch`);
      }
      if (
        typeof claims?.iat !== 'number' ||
        typeof claims.exp !== 'number' ||
        claims.exp - claims.iat !== 8 * 60 * 60
      ) {
        violations.push(`${actor}: expiry mismatch`);
      }
    }
    expect(violations).toEqual([]);

    const reader = createTursoClient({ url: databaseUrl });
    try {
      expect(await digestDatabase(reader)).toEqual(beforeDigest);
    } finally {
      reader.close();
    }
  }, 60_000);

  it(
    'fails closed before issuing any session when one required actor is absent',
    async () => {
      await resetDemoCoverage();
      const writer = createTursoClient({ url: databaseUrl });
      try {
        await writer.client.run(sql`
        DELETE FROM user_workspaces
         WHERE user_id = (
           SELECT id FROM users WHERE email = 'workspace-admin@demo.example.com' LIMIT 1
         )
      `);
      } finally {
        writer.close();
      }

      const result = runCli(databaseUrl);
      expect(result.status).toBe(1);
      expect(result.stdout.length).toBe(0);
      expect(result.stderr).toContain('demo coverage actor');
    },
    CLI_TEST_TIMEOUT_MS,
  );

  it(
    'fails closed before issuing any session when a seeded actor role does not match',
    async () => {
      await resetDemoCoverage();
      const writer = createTursoClient({ url: databaseUrl });
      try {
        await writer.client.run(sql`
        UPDATE users
           SET role = 'member'
         WHERE email = 'workspace-admin@demo.example.com'
      `);
      } finally {
        writer.close();
      }

      const result = runCli(databaseUrl);
      expect(result.status).toBe(1);
      expect(result.stdout.length).toBe(0);
      expect(result.stderr).toContain('demo coverage actor');
    },
    CLI_TEST_TIMEOUT_MS,
  );

  it(
    'rejects a non-local database before attempting to connect',
    () => {
      const result = runCli('libsql://example.turso.io');
      expect(result.status).toBe(2);
      expect(result.stdout.length).toBe(0);
      expect(result.stderr).toContain('ローカル DB 専用');
    },
    CLI_TEST_TIMEOUT_MS,
  );

  it(
    'requires the session secret from the environment',
    () => {
      const result = runCli(databaseUrl, '');
      expect(result.status).toBe(2);
      expect(result.stdout.length).toBe(0);
      expect(result.stderr).toContain('AUTH_SESSION_SECRET');
    },
    CLI_TEST_TIMEOUT_MS,
  );
});
