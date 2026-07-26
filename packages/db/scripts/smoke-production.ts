// リリース後スモークテスト CLI (P13 受入条件の 6 項目)。本番反映のたびに再実行できる証跡生成器。
//   TURSO_AUTH_TOKEN=<secret> pnpm --filter @harness-hub/db exec tsx scripts/smoke-production.ts \
//     --url <libsql-url> --r2-bucket harness-hub-packages [--keep]
// 検査: S1 DB 接続 / S2 ULID PK 発行 / S3 releases immutable / S4 R2 put-get /
//       S5 audit hash chain / S6 日次 export cron dry-run。1 項目でも落ちれば exit 1 (fail-closed)。
//
// 本番へ書く行は専用テナント (slug: smoke-<ulid>) に閉じ、既定では検証後に削除する。
// releases と audit_events は immutable 契約のため汎用 CRUD を持たない (repository/crud.ts の
// GENERIC_CRUD_FORBIDDEN)。後片付けだけはリポジトリ層を迂回して drizzle の delete を直接使い、
// 迂回範囲をスモークテナントの tenant_id 等値条件に限定する。--keep は DB 検証行だけを保持し、
// R2 の使い捨て検証 object は蓄積を避けるため常に削除する。

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { eq, sql } from 'drizzle-orm';
import { applyDdlStatements, splitMigrationSql } from '../backup/ddl';
import { parseExportArtifact } from '../backup/export';
import { restoreControlPlane, verifyAuditChain } from '../backup/index';
import { createTursoClient, type TursoAdapter } from '../connection/turso';
import { createDailyExportJob, dailyExportKey } from '../cron/export-daily';
import { createPackageRegistry, type R2BucketLike } from '../registry/index';
import { createAuditRepo } from '../repository/audit';
import { sha256Hex } from '../repository/bytes';
import { createTargetChannelsRepo } from '../repository/channels';
import { createScopedCrud } from '../repository/crud';
import { createReleasesRepo } from '../repository/releases';
import { createTenantsRepo } from '../repository/tenants';
import { isUlid, newUlid } from '../repository/ulid';
import { releases, targetChannels } from '../schema/core/catalog';
import { tenants } from '../schema/core/identity';
import { auditEvents } from '../schema/core/security';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';

interface CheckResult {
  readonly id: string;
  readonly name: string;
  readonly ok: boolean;
  readonly detail: Record<string, unknown>;
}

const MIGRATION_SQL = join(import.meta.dirname, '..', 'migrations', '0000_baseline-core-domain.sql');
const REQUIRED_BASELINE_TABLES = [...readFileSync(MIGRATION_SQL, 'utf8').matchAll(/CREATE TABLE `([^`]+)`/g)].map(
  (match) => match[1] as string,
);
const REPOSITORY_ROOT = join(import.meta.dirname, '..', '..', '..');

/**
 * DB package は wrangler を直接依存に持たないため、既定では依存を持つ Hub workspace 経由で起動する。
 * CI の実行 cwd や PATH に依存させず、必要な場合だけ WRANGLER_BIN でテスト用 stub 等へ差し替える。
 */
function execWrangler(args: string[]): void {
  const override = process.env.WRANGLER_BIN;
  if (override !== undefined && override !== '') {
    execFileSync(override, args, { stdio: 'pipe' });
    return;
  }
  execFileSync('pnpm', ['--filter', '@harness-hub/hub', 'exec', 'wrangler', ...args], {
    cwd: REPOSITORY_ROOT,
    stdio: 'pipe',
  });
}

/**
 * wrangler CLI を背後に置く R2BucketLike。実装 (createPackageRegistry) を一切改変せず実バケットへ通す。
 * wrangler に単独の head サブコマンドが無いため、head は get の成否で代替する
 * (put の冪等判定に必要なのは「存在するか」だけなので意味は保たれる)。
 */
function createWranglerBucket(bucketName: string, workDir: string): R2BucketLike {
  const objectPath = (key: string): string => `${bucketName}/${key}`;
  const bucket: R2BucketLike = {
    async put(key, value) {
      const file = join(workDir, 'put.bin');
      writeFileSync(file, Buffer.from(value instanceof Uint8Array ? value : new Uint8Array(value)));
      execWrangler(['r2', 'object', 'put', objectPath(key), '--file', file, '--remote']);
      return null;
    },
    async get(key) {
      const file = join(workDir, 'get.bin');
      try {
        execWrangler(['r2', 'object', 'get', objectPath(key), '--file', file, '--remote']);
      } catch {
        return null;
      }
      const bytes = new Uint8Array(readFileSync(file));
      return {
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
      };
    },
    async head(key) {
      return (await bucket.get(key)) === null ? null : {};
    },
  };
  return bucket;
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value !== undefined) chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** S1: 接続と、P13 baseline の全テーブル + 適用台帳の実在確認。後続 migration の追加は許容する。 */
async function checkConnection(adapter: TursoAdapter): Promise<CheckResult> {
  const rows = await adapter.client.all<{ name: string }>(
    sql`select name from sqlite_master where type = 'table' order by name`,
  );
  const names = rows.map((r) => r.name);
  const ledger = names.includes('__drizzle_migrations');
  const domain = names.filter((n) => !n.startsWith('__') && !n.startsWith('sqlite_'));
  const missingBaselineTables = REQUIRED_BASELINE_TABLES.filter((name) => !names.includes(name));
  return {
    id: 'S1',
    name: 'DB 接続 / スキーマ実在',
    ok: ledger && missingBaselineTables.length === 0,
    detail: {
      domainTables: domain.length,
      requiredBaselineTables: REQUIRED_BASELINE_TABLES.length,
      missingBaselineTables,
      migrationLedger: ledger,
    },
  };
}

/** S2: ULID PK が本番環境で採番される (26 文字 Crockford Base32)。 */
async function checkUlid(
  adapter: TursoAdapter,
  slug: string,
): Promise<{ readonly result: CheckResult; readonly context: RepositoryContext }> {
  const tenant = await createTenantsRepo(adapter).create({ slug, name: 'P13 smoke', plan: 'free' });
  return {
    result: {
      id: 'S2',
      name: 'ULID PK 発行',
      ok: isUlid(tenant.id) && tenant.id.length === 26,
      detail: { tenantId: tenant.id, ulid: isUlid(tenant.id) },
    },
    context: createRepositoryContext({ tenantId: tenant.id }),
  };
}

/** S3: releases immutable — 公開面の形状・汎用 CRUD 拒否・status 以外の不変性を本番 DB で再確認する。 */
async function checkReleaseImmutable(adapter: TursoAdapter, context: RepositoryContext): Promise<CheckResult> {
  const repo = createReleasesRepo(adapter);
  const apiShape = Object.keys(repo).sort();
  const shapeOk =
    JSON.stringify(apiShape) === JSON.stringify(['createRelease', 'findById', 'listByChannel', 'updateReleaseStatus']);

  let crudBlocked = false;
  try {
    createScopedCrud(adapter, releases);
  } catch (error) {
    crudBlocked = error instanceof Error && /immutable/.test(error.message);
  }

  const projectId = newUlid();
  const channel = await createTargetChannelsRepo(adapter).create(context, { projectId, target: 'skill' });
  const base = { projectId, channelId: channel.id, manifestJson: '{"smoke":true}', createdBy: 'p13-smoke' };
  const first = await repo.createRelease(context, { ...base, packageHash: 'smoke-hash-1' });
  const dup = await repo.createRelease(context, { ...base, packageHash: 'smoke-hash-1' });
  const updated = await repo.updateReleaseStatus(context, first.release.id, 'suspended');

  const dedupeOk = dup.created === false && dup.release.id === first.release.id;
  const invariantOk =
    updated.status === 'suspended' &&
    updated.version === first.release.version &&
    updated.packageHash === first.release.packageHash &&
    updated.manifestJson === first.release.manifestJson &&
    updated.createdAt === first.release.createdAt;

  return {
    id: 'S3',
    name: 'releases immutable',
    ok: shapeOk && crudBlocked && dedupeOk && invariantOk,
    detail: { apiShape, crudBlocked, dedupeOk, invariantOk, version: first.release.version },
  };
}

/** S4: R2 registry の put/get ラウンドトリップ (content-addressed key の決定性と put 冪等性を含む)。 */
async function checkR2(bucketName: string, workDir: string): Promise<CheckResult> {
  const registry = createPackageRegistry(createWranglerBucket(bucketName, workDir));
  const payload = new TextEncoder().encode(`p13-smoke-${newUlid()}`);
  const expectedHash = await sha256Hex(payload);
  let createdKey: string | null = null;
  let result: CheckResult | null = null;
  try {
    const put = await registry.putPackage(payload);
    createdKey = put.r2Key;
    const again = await registry.putPackage(payload);
    const stream = await registry.getPackage(put.contentHash);
    const fetched = stream === null ? null : await readAll(stream);
    const bytesMatch = fetched !== null && Buffer.from(fetched).equals(Buffer.from(payload));
    result = {
      id: 'S4',
      name: 'R2 registry put/get',
      ok:
        put.contentHash === expectedHash &&
        put.r2Key === `packages/${expectedHash}` &&
        bytesMatch &&
        again.r2Key === put.r2Key,
      detail: {
        r2Key: put.r2Key,
        sizeBytes: put.sizeBytes,
        bytesMatch,
        idempotent: again.r2Key === put.r2Key,
        cleanup: 'deleted',
      },
    };
  } finally {
    // 毎 deploy の smoke で検証 object を蓄積しない。削除失敗も smoke failure として扱う。
    if (createdKey !== null) {
      execWrangler(['r2', 'object', 'delete', `${bucketName}/${createdKey}`, '--remote']);
    }
  }
  if (result === null) throw new Error('R2 registry の検査結果を生成できませんでした');
  return result;
}

/** S5: audit_events への初回 append と hash chain 検証。 */
async function checkAuditChain(adapter: TursoAdapter, context: RepositoryContext): Promise<CheckResult> {
  const audit = createAuditRepo(adapter);
  for (let i = 1; i <= 3; i += 1) {
    await audit.append(context, {
      actorType: 'system',
      actorId: 'p13-smoke',
      action: 'release.smoke_test',
      entityType: 'release',
      entityId: `smoke-${i}`,
      summary: { step: i },
    });
  }
  const results = await verifyAuditChain(adapter);
  const mine = results.find((r) => r.tenantId === context.tenantId);
  return {
    id: 'S5',
    name: 'audit hash chain',
    ok: mine?.ok === true && mine.checked === 3,
    detail: { tenantsVerified: results.length, chain: mine ?? null, allTenantsOk: results.every((r) => r.ok) },
  };
}

/**
 * S6: 日次 export cron の dry-run。job を実際に走らせ、R2 put を捕捉して本番バケットへは書かない。
 * 捕捉した artifact は使い捨てのローカル DB へ restore まで通す
 * (qa-019: 復元できないバックアップを成功と数えない)。
 */
async function checkExportDryRun(adapter: TursoAdapter, workDir: string): Promise<CheckResult> {
  let capturedKey: string | null = null;
  let capturedBytes: Uint8Array | null = null;
  const capturing: R2BucketLike = {
    async put(key, value) {
      capturedKey = key;
      capturedBytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      return null;
    },
    async get() {
      return null;
    },
    async head() {
      return null;
    },
  };

  const scheduledAt = new Date();
  await createDailyExportJob({ adapter, backupsBucket: capturing }).run({
    scheduledAt,
    runKey: `p13-smoke-${scheduledAt.toISOString()}`,
  });
  const bytes: Uint8Array | null = capturedBytes;
  const key: string | null = capturedKey;
  if (bytes === null || key === null) {
    return {
      id: 'S6',
      name: '日次 export cron dry-run',
      ok: false,
      detail: { reason: 'export job が R2 put を呼びませんでした' },
    };
  }

  const artifact = new TextDecoder().decode(bytes);
  const parsed = parseExportArtifact(artifact);
  const drill = createTursoClient({ url: `file:${join(workDir, 'drill.db')}` });
  let report: Awaited<ReturnType<typeof restoreControlPlane>>;
  try {
    await applyDdlStatements(drill, splitMigrationSql(readFileSync(MIGRATION_SQL, 'utf8')));
    report = await restoreControlPlane(drill, artifact);
  } finally {
    drill.close();
  }

  return {
    id: 'S6',
    name: '日次 export cron dry-run',
    ok: report.ok && key === dailyExportKey(scheduledAt),
    detail: {
      r2KeyWouldBe: key,
      expectedKey: dailyExportKey(scheduledAt),
      exportedRows: Object.values(parsed.header.tables).reduce((a, b) => a + b, 0),
      restoreOk: report.ok,
      chainOk: report.chainOk,
      restoreErrors: report.errors,
    },
  };
}

/** スモークテナントの残留行を削除する (--keep 指定時は呼ばない)。 */
async function cleanup(adapter: TursoAdapter, tenantId: string): Promise<Record<string, unknown>> {
  const db = adapter.client;
  await db.delete(auditEvents).where(eq(auditEvents.tenantId, tenantId));
  await db.delete(releases).where(eq(releases.tenantId, tenantId));
  await db.delete(targetChannels).where(eq(targetChannels.tenantId, tenantId));
  await createTenantsRepo(adapter).deleteById(tenantId);
  const left = await db.all<{ c: number }>(
    sql`select (select count(*) from ${tenants} where ${tenants.id} = ${tenantId})
             + (select count(*) from ${releases} where ${releases.tenantId} = ${tenantId})
             + (select count(*) from ${targetChannels} where ${targetChannels.tenantId} = ${tenantId})
             + (select count(*) from ${auditEvents} where ${auditEvents.tenantId} = ${tenantId}) as c`,
  );
  const remaining = Number(left[0]?.c ?? -1);
  return { tenantId, remainingRows: remaining, clean: remaining === 0 };
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      'r2-bucket': { type: 'string' },
      keep: { type: 'boolean', default: false },
    },
  });
  const url = values.url ?? process.env.TURSO_DATABASE_URL;
  const bucketName = values['r2-bucket'];
  if (url === undefined || url === '' || bucketName === undefined || bucketName === '') {
    console.error(
      'usage: smoke-production --url <libsql-url> --r2-bucket <name> [--keep] (auth: TURSO_AUTH_TOKEN env)',
    );
    return 2;
  }

  const workDir = mkdtempSync(join(tmpdir(), 'p13-smoke-'));
  const adapter = createTursoClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  const checks: CheckResult[] = [];
  let cleanupReport: Record<string, unknown> = { skipped: true };
  try {
    checks.push(await checkConnection(adapter));
    const { result, context } = await checkUlid(adapter, `smoke-${newUlid().toLowerCase()}`);
    checks.push(result);
    try {
      checks.push(await checkReleaseImmutable(adapter, context));
      checks.push(await checkR2(bucketName, workDir));
      checks.push(await checkAuditChain(adapter, context));
      checks.push(await checkExportDryRun(adapter, workDir));
    } finally {
      // 検査が途中で落ちても本番にスモーク行を残さない。
      if (values.keep !== true) cleanupReport = await cleanup(adapter, context.tenantId);
    }
    const cleanupOk = values.keep === true || cleanupReport.clean === true;
    const ok = checks.length === 6 && checks.every((c) => c.ok) && cleanupOk;
    console.log(JSON.stringify({ ok, checks, cleanup: cleanupReport }, null, 2));
    return ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, checks, cleanup: cleanupReport, error: message }));
    return 1;
  } finally {
    adapter.close();
    rmSync(workDir, { recursive: true, force: true });
  }
}

process.exitCode = await main();
