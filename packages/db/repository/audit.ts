// AuditRepo — append() と read() のみを公開する (S-D6 / security-spec §5.1)。
// UPDATE/DELETE 関数は実装しない (存在しないものは呼べない)。CI-2 が出現を禁止検査する。
// hash chain はテナント単位 (§5.4)。本 feature が owner で、他 feature はこの repo を消費するのみ。

import { and, asc, desc, eq, gte } from 'drizzle-orm';
import { auditEvents } from '../schema/core/security';
import { isTransactionalAdapter } from '../src/adapter';
import type { RepositoryContext } from '../src/types';
import { canonicalJson, sha256Hex } from './bytes';
import type { CoreAdapter, CoreDb } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export const GENESIS_HASH = 'genesis';

export interface AuditEventInput {
  readonly workspaceId?: string | undefined;
  readonly actorType: 'user' | 'publisher_token' | 'system';
  readonly actorId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  /** 値そのもの (salary 金額・secret・token) を含めないこと (§5.2)。変更の事実のみを書く。 */
  readonly summary: Record<string, unknown>;
}

export interface AuditEventRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly actorType: 'user' | 'publisher_token' | 'system';
  readonly actorId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly summaryJson: string;
  readonly seq: number;
  readonly prevHash: string;
  readonly eventHash: string;
  readonly createdAt: number;
}

/** security-spec §5.4.3 の計算式。検証側 (backup/verify) と同一実装を共有する。 */
export async function computeEventHash(row: {
  prevHash: string;
  tenantId: string;
  seq: number;
  actorType: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  summaryJson: string;
  createdAt: number;
}): Promise<string> {
  // summary_json は保存時点で canonical 済みだが、検証と同一の正規化を通して安定させる。
  const canonicalSummary = canonicalJson(JSON.parse(row.summaryJson));
  return sha256Hex(
    [
      row.prevHash,
      row.tenantId,
      String(row.seq),
      row.actorType,
      row.actorId,
      row.action,
      row.entityType,
      row.entityId,
      canonicalSummary,
      String(row.createdAt),
    ].join('\n'),
  );
}

const APPEND_MAX_RETRY = 25;

/**
 * 並行 append の競合として再試行してよい失敗:
 * UNIQUE(tenant_id, seq) 違反 (両 driver の直列化検出) と、
 * BEGIN IMMEDIATE 同士のロック競合 (SQLITE_BUSY / locked)。
 */
function isRetryableConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = `${error.message} ${(error as { code?: string }).code ?? ''}`;
  return /unique|busy|locked/i.test(text);
}

function backoff(attempt: number): Promise<void> {
  // ジッタ付き線形バックオフ。同時到着した writer 同士が再衝突し続けるのを避ける。
  const jitter = Math.floor(Math.random() * 20);
  return new Promise((resolve) => setTimeout(resolve, attempt * 10 + jitter));
}

export interface AuditRepo {
  append(context: RepositoryContext, event: AuditEventInput): Promise<AuditEventRow>;
  read(
    context: RepositoryContext,
    options?: { readonly fromSeq?: number; readonly limit?: number },
  ): Promise<AuditEventRow[]>;
}

export function createAuditRepo(adapter: CoreAdapter): AuditRepo {
  async function appendOnce(db: CoreDb, context: RepositoryContext, event: AuditEventInput) {
    const last = await db
      .select({ seq: auditEvents.seq, eventHash: auditEvents.eventHash })
      .from(auditEvents)
      .where(eq(auditEvents.tenantId, context.tenantId))
      .orderBy(desc(auditEvents.seq))
      .limit(1);

    const seq = (last[0]?.seq ?? 0) + 1;
    const prevHash = last[0]?.eventHash ?? GENESIS_HASH;
    const summaryJson = canonicalJson(event.summary);
    const createdAt = serverNow();
    const base = {
      tenantId: context.tenantId,
      seq,
      actorType: event.actorType,
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      summaryJson,
      createdAt,
    };
    const eventHash = await computeEventHash({ ...base, prevHash });
    const rows = await db
      .insert(auditEvents)
      .values({
        id: newUlid(),
        workspaceId: event.workspaceId ?? null,
        prevHash,
        eventHash,
        ...base,
      })
      .returning();
    return rows[0] as AuditEventRow;
  }

  return {
    /**
     * libSQL では BEGIN IMMEDIATE トランザクションで read-modify-write を直列化する (ADR §7)。
     * D1 には interactive transaction が無いため UNIQUE(tenant_id, seq) の競合検出 + 再試行で直列化する。
     * どちらの経路でも UNIQUE 制約が最終防衛線。
     */
    async append(context, event) {
      for (let attempt = 1; ; attempt += 1) {
        try {
          if (isTransactionalAdapter(adapter)) {
            return await adapter.transaction((tx) => appendOnce(tx.client, context, event));
          }
          return await appendOnce(adapter.client, context, event);
        } catch (error) {
          if (!isRetryableConflict(error) || attempt >= APPEND_MAX_RETRY) throw error;
          await backoff(attempt);
        }
      }
    },

    async read(context, options) {
      const fromSeq = options?.fromSeq ?? 1;
      const limit = options?.limit ?? 100;
      const rows = await adapter.client
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.tenantId, context.tenantId), gte(auditEvents.seq, fromSeq)))
        .orderBy(asc(auditEvents.seq))
        .limit(limit);
      return rows as AuditEventRow[];
    },
  };
}
