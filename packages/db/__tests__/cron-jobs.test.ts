// cron ジョブ (日次 export / 監査 chain 検証)。
// export・verify の中身は backup 側のテストが持つため、ここは「ジョブが依存を正しく呼び分けているか」だけを見る。

import { sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseExportArtifact } from '../backup/export';
import type { TursoAdapter } from '../connection/turso';
import { createDailyExportJob, dailyExportKey } from '../cron/export-daily';
import { AuditChainBrokenError, createVerifyAuditChainJob } from '../cron/verify-audit-chain';
import { createAuditRepo } from '../repository/audit';
import { createTenantsRepo } from '../repository/tenants';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { createFakeR2Bucket } from './support/r2-fake';
import { asCore, createLibsqlTestDb } from './support/test-db';

const SCHEDULED_AT = new Date('2026-07-28T02:00:00.000Z');
const JOB_CONTEXT = { scheduledAt: SCHEDULED_AT, runKey: 'cron-2026-07-28T02:00' };

let adapter: TursoAdapter;
let context: RepositoryContext;
let tenantId: string;

async function appendSample(n: number): Promise<void> {
  const audit = createAuditRepo(asCore(adapter));
  for (let i = 0; i < n; i += 1) {
    await audit.append(context, {
      actorType: 'system',
      actorId: 'cron',
      action: `cron.sample.${i}`,
      entityType: 'test',
      entityId: `entity-${i}`,
      summary: { index: i },
    });
  }
}

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
  const tenant = await createTenantsRepo(asCore(adapter)).create({ slug: 'cron', name: 'Cron', plan: 'free' });
  tenantId = tenant.id;
  context = createRepositoryContext({ tenantId });
});

afterEach(() => adapter.close());

describe('dailyExportKey', () => {
  it('db-export/<YYYY>/<YYYY-MM-DD>.jsonl の形で key を組み立てる', () => {
    expect(dailyExportKey(SCHEDULED_AT)).toBe('db-export/2026/2026-07-28.jsonl');
  });

  it('年をまたぐと prefix の年も切り替わる (判定は UTC 基準)', () => {
    expect(dailyExportKey(new Date('2025-12-31T23:59:59.999Z'))).toBe('db-export/2025/2025-12-31.jsonl');
    expect(dailyExportKey(new Date('2026-01-01T00:00:00.000Z'))).toBe('db-export/2026/2026-01-01.jsonl');
  });
});

describe('createDailyExportJob', () => {
  it('scheduledAt に対応する key で export 成果物を R2 へ 1 度だけ書き込む', async () => {
    const backupsBucket = createFakeR2Bucket();
    const job = createDailyExportJob({ adapter: asCore(adapter), backupsBucket });
    expect(job.id).toBe('db.export-daily');

    await job.run(JOB_CONTEXT);

    const key = dailyExportKey(SCHEDULED_AT);
    expect(backupsBucket.putCalls).toStrictEqual([key]);

    const stored = backupsBucket.objects.get(key);
    expect(stored?.length ?? 0).toBeGreaterThan(0);

    // 書き込まれたのが exportControlPlane の成果物そのものであることを、artifact として parse して確かめる
    const parsed = parseExportArtifact(new TextDecoder().decode(stored));
    expect(parsed.header.tables.tenants).toBe(1);
    expect(parsed.rowsByTable.get('tenants')?.[0]?.id).toBe(tenantId);
  });
});

describe('createVerifyAuditChainJob', () => {
  it('健全な監査 chain では例外を投げずに完了する', async () => {
    await appendSample(3);
    const job = createVerifyAuditChainJob({ adapter: asCore(adapter) });
    expect(job.id).toBe('db.verify-audit-chain');

    await expect(job.run(JOB_CONTEXT)).resolves.toBeUndefined();
  });

  it('改竄された chain では AuditChainBrokenError を投げ、壊れた tenant id を持つ', async () => {
    await appendSample(3);
    await adapter.client.run(sql`UPDATE audit_events SET action = 'forged' WHERE seq = 2`);
    const job = createVerifyAuditChainJob({ adapter: asCore(adapter) });

    const error = await job.run(JOB_CONTEXT).then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AuditChainBrokenError);
    expect((error as AuditChainBrokenError).tenants).toStrictEqual([tenantId]);
  });
});
