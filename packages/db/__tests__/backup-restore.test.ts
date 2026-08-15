// DMDB-T06 / DMDB-T12: 日次 export → 別 DB restore round-trip (acceptance A3 / qa-019)。
// salary/secret の暗号断面維持、壊れた artifact の fail-closed、CLI 経由の round-trip を含む。

import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  exportControlPlane,
  parseExportArtifact,
  restoreControlPlane,
  tenantDataTombstoneManifestFromArtifact,
} from '@harness-hub/db/backup';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTursoClient, type TursoAdapter } from '../connection/turso';
import { createTenantDataRegistry } from '../registry/tenant-data';
import { createAuditRepo } from '../repository/audit';
import { ENCRYPTED_COLUMN_PATTERN } from '../repository/crypto';
import { createTenantDataRepo } from '../repository/tenant-data';
import { createTenantsRepo } from '../repository/tenants';
import { hearingScreenshots, hearingShareTokens } from '../schema/hearing-intake/schema';
import { allTables } from '../schema/index';
import { tenantDataObjects } from '../schema/tenant-data/schema';
import { seedTwoTenants, type TwoTenantsFixture } from './fixtures/two-tenants';
import { createFakeTenantDataBucket } from './support/r2-fake';
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
  it('Studio 拡張の tenant_data と hearing共有2表を日次 export に含める', () => {
    const { header, rowsByTable } = parseExportArtifact(artifact);
    expect(Object.keys(header.tables).sort()).toStrictEqual(Object.keys(allTables).sort());
    expect(rowsByTable.get('tenant_data_objects')).toHaveLength(2);
    expect(rowsByTable.get('tenant_data_tombstones')).toHaveLength(2);
    expect(rowsByTable.get('hearing_screenshots')).toHaveLength(2);
    expect(rowsByTable.get('hearing_share_tokens')).toHaveLength(2);
  });

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
      expect(report.restoredCounts.audit_events).toBe(6); // 2 tenants × 3 events
      const restoredShareTokens = await target.client.select().from(hearingShareTokens);
      expect(restoredShareTokens).toHaveLength(2);
      expect(restoredShareTokens.every((row) => row.revokedAt !== null)).toBe(true);
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

  it('削除後の manifest を重ねると、削除前 snapshot の tenant_data object は復元されない', async () => {
    const rows = await source.client
      .select()
      .from(tenantDataObjects)
      .where(eq(tenantDataObjects.tenantId, fixture.a.tenantId));
    const deleted = rows[0];
    expect(deleted).toBeDefined();
    if (deleted === undefined) throw new Error('fixture tenant_data object がありません');

    const bucket = createFakeTenantDataBucket();
    const repo = createTenantDataRepo(
      asCore(source),
      testCipher(asCore(source)),
      createTenantDataRegistry(bucket),
      createAuditRepo(asCore(source)),
    );
    await repo.deleteTenantDataObject(fixture.a.context, deleted.id);
    const currentArtifact = await exportControlPlane(asCore(source));
    const manifest = tenantDataTombstoneManifestFromArtifact(parseExportArtifact(currentArtifact));

    const target = await createLibsqlTestDb();
    try {
      const report = await restoreControlPlane(asCore(target), artifact, { tenantDataTombstoneManifest: manifest });
      expect(report.ok).toBe(true);
      expect(report.tombstonesApplied).toBeGreaterThanOrEqual(3);
      const restored = await target.client.select().from(tenantDataObjects).where(eq(tenantDataObjects.id, deleted.id));
      expect(restored).toHaveLength(0);
      const restoredScreenshotMetadata = await target.client
        .select()
        .from(hearingScreenshots)
        .where(eq(hearingScreenshots.tenantDataObjectId, deleted.id));
      expect(restoredScreenshotMetadata).toHaveLength(0);
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

    const tombstoneManifestPath = join(workDir, 'tenant-data-tombstones.json');
    const extractOut = runCli('scripts/extract-tenant-data-tombstones.ts', [
      '--in',
      artifactPath,
      '--out',
      tombstoneManifestPath,
    ]);
    expect(JSON.parse(extractOut.trim().split('\n').at(-1) as string)).toMatchObject({ ok: true, tombstones: 2 });

    const targetPath = join(workDir, 'cli-target.db');
    const restoreOut = runCli('scripts/restore-control-plane.ts', [
      '--url',
      `file:${targetPath}`,
      '--in',
      artifactPath,
      '--tombstone-manifest',
      tombstoneManifestPath,
      '--ddl',
      ddlPath,
    ]);
    const report = JSON.parse(restoreOut.trim().split('\n').at(-1) as string);
    expect(report.ok).toBe(true);
    expect(report.chainOk).toBe(true);
  }, 120_000);
});

// 稼働直後の本番 DB は migration 済みだが全テーブル 0 行になる。旧 backup.yml は
// 「データ行 0 なら失敗」で落としており、日次 backup が 3 夜連続で赤になっていた。
// 空 DB の断面も restore すれば空 DB が再現する以上、これは採用しなければならない。
describe('vns9 export 成果物の採否 (verify-export-artifact CLI)', () => {
  const runVerify = (artifactPath: string) =>
    spawnSync(process.execPath, ['--import', 'tsx', 'scripts/verify-export-artifact.ts', '--file', artifactPath], {
      cwd: join(import.meta.dirname, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  it('全テーブル 0 行の export を採用する (稼働直後の本番 DB)', async () => {
    const emptyPath = join(workDir, 'empty.db');
    const emptyDb = await createLibsqlTestDb(`file:${emptyPath}`);
    const emptyArtifact = await exportControlPlane(asCore(emptyDb));
    emptyDb.close();

    const artifactPath = join(workDir, 'empty-export.jsonl');
    writeFileSync(artifactPath, emptyArtifact, 'utf8');

    const result = runVerify(artifactPath);
    expect(result.status).toBe(0);
    const summary = JSON.parse(result.stdout.trim().split('\n').at(-1) as string);
    expect(summary.ok).toBe(true);
    expect(summary.totalRows).toBe(0);
    expect(summary.tableCount).toBe(Object.keys(allTables).length);
    // 採用はするが、無言で通すと「バックアップは取れている」と読み違えるため警告は残す
    expect(result.stdout).toContain('::warning::');
  }, 120_000);

  it('行のある export も同じ CLI で採用される', () => {
    const artifactPath = join(workDir, 'seeded-export.jsonl');
    writeFileSync(artifactPath, artifact, 'utf8');

    const result = runVerify(artifactPath);
    expect(result.status).toBe(0);
    const summary = JSON.parse(result.stdout.trim().split('\n').at(-1) as string);
    expect(summary.totalRows).toBeGreaterThan(0);
    expect(result.stdout).not.toContain('::warning::');
  }, 60_000);

  // 検出力の裏取り。上 2 件は「通ること」しか示さず、検査が素通しになっても同じ緑になる。
  // 0 行を通すようにした結果として検査全体が緩んでいないことを、負のコントロールで押さえる。
  it('テーブルが欠けた成果物は採用しない', () => {
    const header = JSON.parse(artifact.split('\n')[0] as string) as {
      tables: Record<string, number>;
    };
    delete header.tables[Object.keys(header.tables)[0] as string];
    const brokenPath = join(workDir, 'broken-export.jsonl');
    writeFileSync(brokenPath, JSON.stringify(header), 'utf8');

    const result = runVerify(brokenPath);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('テーブル集合が不正');
  }, 60_000);
});

describe('P13 production migration / smoke CLI', () => {
  const runCli = (script: string, args: string[], env: NodeJS.ProcessEnv = process.env) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
      cwd: join(import.meta.dirname, '..'),
      encoding: 'utf8',
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error !== undefined) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `${script} exited ${result.status ?? 'without status'}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    }
    return result.stdout;
  };

  it('migration は dry-run → 初回適用 → 再適用を台帳どおり冪等に処理する', () => {
    const dbPath = join(workDir, 'p13-migration.db');
    const url = `file:${dbPath}`;
    // 件数はリテラルで書く。journal の長さを参照すると、migration を足しただけで一緒に
    // 緑になり「台帳に載っていない DDL が適用された」を検出できなくなる。
    // 0000 baseline / 0001 device flow / 0002 hearing intake / 0003 共通 Google OAuth client /
    // 0004 顧客持ち込み OAuth client の lifecycle / 0005 documents (docs-cms) /
    // 0006 tenant-data-retention (封筒暗号化拡張と tombstone 台帳) /
    // 0007 feedback/builds (feedback-loop) /
    // 0008 metrics-tracking + build-pipeline-board /
    // 0009 production smoke fixture lease 台帳 / 0010 Notion 連携 /
    // 0011 docs-cms のカード表示・自動分類列追加 (category/tags/thumbnail/excerpt/asset_summary) /
    // 0012 外部 Markdown 同期 /
    // 0013 hearing_screenshots / hearing_share_tokens (ヒアリングシート添付・受け渡しトークン) /
    // 0014 docs-cms 予約公開 (publish_at + due 検索 index) /
    // 0015 Docs / Sheets entity revision + mutation create 冪等台帳
    const dryRun = JSON.parse(runCli('scripts/migrate-deploy.ts', ['--url', url, '--dry-run']).trim());
    expect(dryRun).toMatchObject({ ok: true, dryRun: true, journal: 16, applied: 0, pending: 16 });

    const first = JSON.parse(runCli('scripts/migrate-deploy.ts', ['--url', url]).trim());
    expect(first).toMatchObject({ ok: true, appliedBefore: 0, appliedAfter: 16 });

    const second = JSON.parse(runCli('scripts/migrate-deploy.ts', ['--url', url]).trim());
    expect(second).toMatchObject({ ok: true, appliedBefore: 16, appliedAfter: 16 });
    // 既定 5s では tsx の起動 3 回だけで超過し、実装が正しくても timeout で赤くなる
    // (「落ちたら再実行」を招いてゲートの信頼性を失うため、他の CLI テストと同じ枠を与える)。
  }, 120_000);

  it('R2 バケット未指定では 6 項目を満たしたことにせず usage error で止まる', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/smoke-production.ts', '--url', `file:${join(workDir, 'missing-r2.db')}`],
      {
        cwd: join(import.meta.dirname, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--r2-bucket <name>');
  }, 60_000);

  it('6 項目を Hub workspace の R2 CLI 経由で完走し、既存データを残して検証データだけを削除する', async () => {
    const dbPath = join(workDir, 'p13-smoke.db');
    const url = `file:${dbPath}`;
    runCli('scripts/migrate-deploy.ts', ['--url', url]);

    const before = createTursoClient({ url });
    try {
      await createTenantsRepo(before).create({ slug: 'existing-production-tenant', name: 'existing', plan: 'free' });
    } finally {
      before.close();
    }

    const r2Dir = join(workDir, 'fake-r2');
    const fakeWrangler = join(workDir, 'wrangler-stub.mjs');
    writeFileSync(
      fakeWrangler,
      `#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
const operation = args[2];
const objectPath = args[3];
const store = process.env.FAKE_R2_DIR;
if (!store || !objectPath) process.exit(2);
mkdirSync(store, { recursive: true });
const stored = join(store, Buffer.from(objectPath).toString('hex'));
const fileIndex = args.indexOf('--file');
const file = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
if (operation === 'put' && file) copyFileSync(file, stored);
else if (operation === 'get' && file && existsSync(stored)) copyFileSync(stored, file);
else if (operation === 'delete') rmSync(stored, { force: true });
else process.exit(1);
`,
      'utf8',
    );
    chmodSync(fakeWrangler, 0o755);

    // CI と同じく DB package から起動しても、Hub workspace にだけ存在する wrangler を選べることを検査する。
    // pnpm 自体を stub にして、実際の R2 通信は上の Wrangler stub へ委譲する。
    const fakePnpm = join(workDir, 'pnpm');
    writeFileSync(
      fakePnpm,
      `#!/bin/sh
if [ "$PWD" != "$EXPECTED_PNPM_CWD" ]; then exit 65; fi
if [ "$1" != "--filter" ] || [ "$2" != "@harness-hub/hub" ] || [ "$3" != "exec" ] || [ "$4" != "wrangler" ]; then
  exit 66
fi
shift 4
exec "$FAKE_WRANGLER" "$@"
`,
      'utf8',
    );
    chmodSync(fakePnpm, 0o755);

    const smokeEnv: NodeJS.ProcessEnv = {
      ...process.env,
      EXPECTED_PNPM_CWD: join(import.meta.dirname, '..', '..', '..'),
      FAKE_R2_DIR: r2Dir,
      FAKE_WRANGLER: fakeWrangler,
      PATH: `${workDir}:${process.env.PATH ?? ''}`,
    };
    delete smokeEnv.WRANGLER_BIN;
    const output = runCli('scripts/smoke-production.ts', ['--url', url, '--r2-bucket', 'p13-test'], {
      ...smokeEnv,
    });
    const report = JSON.parse(output) as {
      ok: boolean;
      checks: { id: string; ok: boolean }[];
      cleanup: { clean: boolean; remainingRows: number };
    };
    expect(report.ok).toBe(true);
    expect(report.checks.map((check) => check.id)).toStrictEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    expect(report.checks.every((check) => check.ok)).toBe(true);
    expect(report.cleanup).toMatchObject({ clean: true, remainingRows: 0 });
    expect(readdirSync(r2Dir)).toStrictEqual([]);

    const after = createTursoClient({ url });
    try {
      expect((await createTenantsRepo(after).list()).map((tenant) => tenant.slug)).toStrictEqual([
        'existing-production-tenant',
      ]);
    } finally {
      after.close();
    }
  }, 120_000);
});
