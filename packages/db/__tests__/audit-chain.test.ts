// DMDB-T10: audit hash chain (security-spec §5.4 / T-6)。改竄・削除・挿入の検出と並行 append の直列化。

import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { verifyAuditChain } from '../backup/verify';
import type { TursoAdapter } from '../connection/turso';
import { createAuditRepo } from '../repository/audit';
import { createTenantsRepo } from '../repository/tenants';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;
let context: RepositoryContext;

async function appendSample(n: number): Promise<void> {
  const audit = createAuditRepo(asCore(adapter));
  for (let i = 0; i < n; i += 1) {
    await audit.append(context, {
      actorType: 'system',
      actorId: 'cron',
      action: `test.action.${i}`,
      entityType: 'test',
      entityId: `entity-${i}`,
      summary: { index: i, changed: true },
    });
  }
}

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
  const tenant = await createTenantsRepo(asCore(adapter)).create({ slug: 'audit', name: 'A', plan: 'free' });
  context = createRepositoryContext({ tenantId: tenant.id });
});

describe('DMDB-T10 audit hash chain', () => {
  it('AuditRepo の公開 API は append と read のみ (UPDATE/DELETE は存在しない)', () => {
    const audit = createAuditRepo(asCore(adapter));
    expect(Object.keys(audit).sort()).toStrictEqual(['append', 'read']);
  });

  it('正しい append 連鎖は chain 検証を pass する', async () => {
    await appendSample(5);
    const results = await verifyAuditChain(asCore(adapter));
    expect(results).toHaveLength(1);
    expect(results[0]?.ok).toBe(true);
    expect(results[0]?.checked).toBe(5);
  });

  it('中間行の改竄を検証が検出する', async () => {
    await appendSample(5);
    await adapter.client.run(sql`UPDATE audit_events SET action = 'forged' WHERE seq = 3`);
    const results = await verifyAuditChain(asCore(adapter));
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.errors.join(' ')).toMatch(/event_hash 不一致/);
  });

  it('中間行の削除を検証が検出する', async () => {
    await appendSample(5);
    await adapter.client.run(sql`DELETE FROM audit_events WHERE seq = 2`);
    const results = await verifyAuditChain(asCore(adapter));
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.errors.join(' ')).toMatch(/seq 欠番/);
  });

  it('偽造行の挿入を検証が検出する', async () => {
    await appendSample(3);
    await adapter.client.run(
      sql`INSERT INTO audit_events (id, tenant_id, workspace_id, actor_type, actor_id, action, entity_type, entity_id, summary_json, seq, prev_hash, event_hash, created_at)
          VALUES ('FORGED0000000000000000FAKE', ${context.tenantId}, NULL, 'system', 'attacker', 'forged.insert', 'test', 'x', '{}', 4, 'bogus-prev', 'bogus-hash', 0)`,
    );
    const results = await verifyAuditChain(asCore(adapter));
    expect(results[0]?.ok).toBe(false);
  });

  it('並行 append (8 本) で seq が重複せず chain が破綻しない', async () => {
    const audit = createAuditRepo(asCore(adapter));
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        audit.append(context, {
          actorType: 'user',
          actorId: `user-${i}`,
          action: 'parallel.append',
          entityType: 'test',
          entityId: `p-${i}`,
          summary: { i },
        }),
      ),
    );
    const rows = await audit.read(context, { limit: 100 });
    expect(rows.map((r) => r.seq)).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const results = await verifyAuditChain(asCore(adapter));
    expect(results[0]?.ok).toBe(true);
  }, 30_000);
});
