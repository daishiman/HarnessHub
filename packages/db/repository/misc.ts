// session_revocations (緊急失効, §2.1) と idempotency_ledger (再試行安全化) の小さな専用リポジトリ。
// どちらも自然キー PK のため汎用 scoped CRUD (id PK 前提) の対象外。

import { and, eq } from 'drizzle-orm';
import { idempotencyLedger } from '../schema/core/publish';
import { sessionRevocations } from '../schema/core/security';
import type { RepositoryContext } from '../src/types';
import type { CoreAdapter } from './db';
import { serverNow } from './time';

export interface SessionRevocationsRepo {
  /** テナント全 session の緊急失効。JWT.iat < revoked_at が拒否対象になる。 */
  revokeAll(context: RepositoryContext): Promise<{ tenantId: string; revokedAt: number }>;
  get(context: RepositoryContext): Promise<{ tenantId: string; revokedAt: number } | null>;
}

export function createSessionRevocationsRepo(adapter: CoreAdapter): SessionRevocationsRepo {
  return {
    async revokeAll(context) {
      const revokedAt = serverNow();
      await adapter.client
        .insert(sessionRevocations)
        .values({ tenantId: context.tenantId, revokedAt })
        .onConflictDoUpdate({ target: sessionRevocations.tenantId, set: { revokedAt } });
      return { tenantId: context.tenantId, revokedAt };
    },

    async get(context) {
      const rows = await adapter.client
        .select()
        .from(sessionRevocations)
        .where(eq(sessionRevocations.tenantId, context.tenantId))
        .limit(1);
      return rows[0] ?? null;
    },
  };
}

export interface IdempotencyRecord {
  readonly scope: string;
  readonly key: string;
  readonly tenantId: string;
  readonly requestHash: string;
  readonly responseStatus: number;
  readonly responseBodyJson: string | null;
  readonly expiresAt: number;
}

export interface IdempotencyLedgerRepo {
  put(context: RepositoryContext, record: Omit<IdempotencyRecord, 'tenantId'>): Promise<IdempotencyRecord>;
  get(context: RepositoryContext, scope: string, key: string): Promise<IdempotencyRecord | null>;
}

export function createIdempotencyLedgerRepo(adapter: CoreAdapter): IdempotencyLedgerRepo {
  return {
    async put(context, record) {
      const rows = await adapter.client
        .insert(idempotencyLedger)
        .values({ ...record, tenantId: context.tenantId })
        .onConflictDoNothing()
        .returning();
      return (rows[0] as IdempotencyRecord | undefined) ?? { ...record, tenantId: context.tenantId };
    },

    async get(context, scope, key) {
      const rows = await adapter.client
        .select()
        .from(idempotencyLedger)
        .where(
          and(
            eq(idempotencyLedger.tenantId, context.tenantId),
            eq(idempotencyLedger.scope, scope),
            eq(idempotencyLedger.key, key),
          ),
        )
        .limit(1);
      return (rows[0] as IdempotencyRecord | undefined) ?? null;
    },
  };
}
