// DMDB-T06 / DMDB-T12: 日次 export → 別 DB restore round-trip (acceptance A3 / qa-019)。
// salary/secret の暗号断面維持、壊れた artifact の fail-closed、CLI 経由の round-trip を含む。

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportControlPlane, parseExportArtifact, restoreControlPlane } from '@harness-hub/db/backup';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { ENCRYPTED_COLUMN_PATTERN } from '../repository/crypto';
import { seedTwoTenants, type TwoTenantsFixture } from './fixtures/two-tenants';
import { schemaDdl } from './support/schema-harness';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

let source: TursoAdapter;
let fixture: TwoTenantsFixture;
let artifact: string;
let workDir: string;

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'dmdb-backup-'));
  source = await createLibsqlTestDb();
  fixture = await seedTwoTenants(asCore(source), testCipher(asCore(source)));
  artifact = await exportControlPlane(asCore(source));
}, 60_000);

afterAll(() => {
  source.close();
  rmSync(workDir, { recursive: true, force: true });
});

describe('DMDB-T06 export artifact の暗号断面', () => {
  it('export 成果物に salary / client_secret の平文が一切現れない (常にマスク相当)', () => {
    expect(artifact).not.toContain(String(fixture.a.salary));
    expect(artifact).not.toContain(String(fixture.b.salary));
    expect(artifact).not.toContain('super-secret-alpha');
    expect(artifact).not.toContain('super-secret-beta');
  });

  it('salary / client_secret_enc は暗号文形式 {v}:{iv}:{ct}:{tag} を維持する', () => {
    const { rowsByTable } = parseExportArtifact(artifact);
    const users = rowsByTable.get('users') ?? [];
    expect(users.length).toBeGreaterThan(0);
    for (const row of users) {
      expect(String(row.salary)).toMatch(ENCRYPTED_COLUMN_PATTERN);
    }
    const idp = rowsByTable.get('idp_connections') ?? [];
    expect(idp.length).toBeGreaterThan(0);
    for (const row of idp) {
      expect(String(row.clientSecretEnc)).toMatch(ENCRYPTED_COLUMN_PATTERN);
    }
  });

  it('同一 DB 状態からの export は決定論的 (同一バイト列)', async () => {
    const again = await exportControlPlane(asCore(source));
    // exported_at のみ異なりうるため header を除いた行部分を比較する
    const body = (s: string) => s.split('\n').slice(1).join('\n');
    expect(body(again)).toBe(body(artifact));
  });
});

describe('DMDB-T06 restore round-trip', () => {
  it('別 DB へ restore し、行数一致 + audit chain + 暗号断面の整合検査が通る', async () => {
    const target = await createLibsqlTestDb();
    try {
      const report = await restoreControlPlane(asCore(target), artifact);
      expect(report.errors).toStrictEqual([]);
      expect(report.ok).toBe(true);
      expect(report.chainOk).toBe(true);
      expect(report.header?.tables.users).toBe(2);
      expect(report.restoredCounts.audit_events).toBe(4); // 2 tenants × 2 events
    } finally {
      target.close();
    }
  });

  it('行が欠落した artifact の restore は失敗と判定される (復元できないバックアップを成功と数えない)', async () => {
    const lines = artifact.split('\n');
    const dropIndex = lines.findIndex((l) => l.includes('"table":"audit_events"'));
    const broken = lines.filter((_, i) => i !== dropIndex).join('\n');
    const target = await createLibsqlTestDb();
    try {
      const report = await restoreControlPlane(asCore(target), broken);
      expect(report.ok).toBe(false);
      expect(report.errors.join(' ')).toMatch(/行数不一致|chain/);
    } finally {
      target.close();
    }

    const [headerLine, ...rowLines] = artifact.split('\n');
    const header = JSON.parse(headerLine as string) as { tables: Record<string, number> };
    delete header.tables.packages;
    const missingTable = [
      JSON.stringify(header),
      ...rowLines.filter((line) => !line.includes('"table":"packages"')),
    ].join('\n');
    const otherTarget = await createLibsqlTestDb();
    try {
      const report = await restoreControlPlane(asCore(otherTarget), missingTable);
      expect(report.ok).toBe(false);
      expect(report.errors.join(' ')).toMatch(/テーブル集合が不正/);
    } finally {
      otherTarget.close();
    }
  });

  it('改竄された audit 行を含む artifact の restore は chain 検証で失敗する', async () => {
    const tampered = artifact.replace('"action":"release.publish"', '"action":"release.tampered"');
    expect(tampered).not.toBe(artifact);
    const target = await createLibsqlTestDb();
    try {
      const report = await restoreControlPlane(asCore(target), tampered);
      expect(report.ok).toBe(false);
      expect(report.chainOk).toBe(false);
    } finally {
      target.close();
    }
  });
});

describe('DMDB-T12 CLI 経由の round-trip (executable-export-restore-ci-fixture)', () => {
  it('export CLI → restore CLI が exit 0 で完走する', async () => {
    for (const script of ['scripts/export-control-plane.ts', 'scripts/restore-control-plane.ts']) {
      const source = readFileSync(join(import.meta.dirname, '..', script), 'utf8');
      expect(source).not.toContain("'auth-token'");
      expect(source).toContain('process.env.TURSO_AUTH_TOKEN');
    }

    // fixture を file DB へ構築 (CLI は URL 越しにしか DB を見ない)
    const srcPath = join(workDir, 'cli-src.db');
    const srcDb = await createLibsqlTestDb(`file:${srcPath}`);
    await seedTwoTenants(asCore(srcDb), testCipher(asCore(srcDb)));
    srcDb.close();

    // P06 契約: P08 canonical migration を前提にせず schema harness の DDL を渡す
    const ddlPath = join(workDir, 'schema.sql');
    writeFileSync(ddlPath, (await schemaDdl()).join('\n--> statement-breakpoint\n'), 'utf8');

    const artifactPath = join(workDir, 'export.jsonl');
    const runCli = (script: string, args: string[]) =>
      execFileSync(process.execPath, ['--import', 'tsx', script, ...args], {
        cwd: join(import.meta.dirname, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

    const exportOut = runCli('scripts/export-control-plane.ts', ['--url', `file:${srcPath}`, '--out', artifactPath]);
    expect(JSON.parse(exportOut.trim().split('\n').at(-1) as string).ok).toBe(true);
    expect(readFileSync(artifactPath, 'utf8')).toContain('harness-hub-control-plane-export');

    const targetPath = join(workDir, 'cli-target.db');
    const restoreOut = runCli('scripts/restore-control-plane.ts', [
      '--url',
      `file:${targetPath}`,
      '--in',
      artifactPath,
      '--ddl',
      ddlPath,
    ]);
    const report = JSON.parse(restoreOut.trim().split('\n').at(-1) as string);
    expect(report.ok).toBe(true);
    expect(report.chainOk).toBe(true);
  }, 120_000);
});
