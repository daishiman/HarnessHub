// 監査 hash chain の全体検証 (security-spec §5.4.4)。
// restore 後整合検査 (restore.ts) と日次検証 cron (cron/verify-audit-chain.ts) が共用する。

import { asc, eq } from 'drizzle-orm';
import { type AuditEventRow, computeEventHash, GENESIS_HASH } from '../repository/audit';
import type { CoreAdapter } from '../repository/db';
import { auditEvents } from '../schema/core/security';

export interface ChainVerifyResult {
  readonly ok: boolean;
  readonly tenantId: string;
  readonly checked: number;
  readonly errors: readonly string[];
}

/** 1 テナント分の chain を再計算し、改竄・削除・挿入・欠番を検出する。 */
export async function verifyChainRows(tenantId: string, rows: readonly AuditEventRow[]): Promise<ChainVerifyResult> {
  const errors: string[] = [];
  let prevHash = GENESIS_HASH;
  let expectedSeq = 1;
  for (const row of rows) {
    if (row.seq !== expectedSeq) {
      errors.push(`seq 欠番/重複: expected=${expectedSeq} actual=${row.seq}`);
      break;
    }
    if (row.prevHash !== prevHash) {
      errors.push(`prev_hash 不一致 (seq=${row.seq}): 中間行の削除・挿入・改竄の疑い`);
      break;
    }
    const recomputed = await computeEventHash({
      prevHash: row.prevHash,
      tenantId: row.tenantId,
      seq: row.seq,
      actorType: row.actorType,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      summaryJson: row.summaryJson,
      createdAt: row.createdAt,
    });
    if (recomputed !== row.eventHash) {
      errors.push(`event_hash 不一致 (seq=${row.seq}): 行の内容改竄の疑い`);
      break;
    }
    prevHash = row.eventHash;
    expectedSeq += 1;
  }
  return { ok: errors.length === 0, tenantId, checked: rows.length, errors };
}

/** DB 上の全テナントの chain を検証する。 */
export async function verifyAuditChain(adapter: CoreAdapter): Promise<ChainVerifyResult[]> {
  const tenantRows = await adapter.client.selectDistinct({ tenantId: auditEvents.tenantId }).from(auditEvents);
  const results: ChainVerifyResult[] = [];
  for (const { tenantId } of tenantRows) {
    const rows = (await adapter.client
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.tenantId, tenantId))
      .orderBy(asc(auditEvents.seq))) as AuditEventRow[];
    results.push(await verifyChainRows(tenantId, rows));
  }
  return results;
}
