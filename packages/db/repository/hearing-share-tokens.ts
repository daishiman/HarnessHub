// hearing_share_tokens の owner 実装。
//
// `repository/device-flow.ts` の publisherTokens と同じ CAS 方針をそのまま踏襲する:
// token 本体は SHA-256 ハッシュのみ保存し (平文は発行応答にしか存在しない)、失効は
// `revoked_at IS NULL` を条件にした compare-and-swap で行う。並行してユーザーが「失効」ボタンを
// 2 回叩いても、公開エンドポイントが同時にアクセスしても、二重に失効・二重に有効のままにはならない。

import { and, eq, isNull, sql } from 'drizzle-orm';
import { hearingShareTokens } from '../schema/hearing-intake/schema';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import { serverNow } from './time';

export type HearingShareTokenAudience = 'harness_creator' | 'system_orchestrator';

export interface HearingShareTokenRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly sheetId: string;
  readonly audience: HearingShareTokenAudience;
  readonly tokenHash: string;
  readonly expiresAt: number;
  readonly revokedAt: number | null;
  readonly lastAccessedAt: number | null;
  readonly accessCount: number;
  readonly createdByUserId: string;
  readonly createdAt: number;
}

export interface HearingShareTokenCreateInput {
  readonly id: string;
  readonly workspaceId: string;
  readonly sheetId: string;
  readonly audience: HearingShareTokenAudience;
  readonly tokenHash: string;
  readonly expiresAt: number;
  readonly createdByUserId: string;
}

export interface HearingShareTokensRepo {
  create(context: RepositoryContext, input: HearingShareTokenCreateInput): Promise<HearingShareTokenRow>;
  listBySheetId(context: RepositoryContext, sheetId: string): Promise<readonly HearingShareTokenRow[]>;
  /**
   * トークン検証の唯一の入口。**tenant/workspace スコープを一切引数に取らない** —
   * 公開エンドポイント (セッション無し) から呼ばれるので、この呼び出しが解決する
   * tenantId/workspaceId/sheetId こそが以降の処理で使う正本になる (呼び出し元の申告値は使わない)。
   * 失効済み・期限切れは見つからなかったのと同じ扱いで null を返す (存在有無を外部から区別させない)。
   */
  findValidByTokenHash(tokenHash: string, nowMs: number): Promise<HearingShareTokenRow | null>;
  /** アクセスのたびに呼ぶ軽量アクセスログ (last_accessed_at / access_count)。失敗しても呼び出し元の処理は止めない想定。 */
  recordAccess(id: string, accessedAtMs: number): Promise<void>;
  /**
   * 依頼者が手動で無効化するボタンの実体。`revoked_at IS NULL` の CAS。
   * true を返すのは実際に自分が失効させた 1 回だけ (既に失効済みなら false)。
   */
  revokeIfActive(
    context: RepositoryContext,
    input: { readonly id: string; readonly revokedAt: number },
  ): Promise<boolean>;
}

export function createHearingShareTokensRepo(adapter: CoreAdapter): HearingShareTokensRepo {
  const scopeById = (context: RepositoryContext, id: string) =>
    and(eq(hearingShareTokens.tenantId, context.tenantId), eq(hearingShareTokens.id, id));

  return {
    async create(context, input) {
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .insert(hearingShareTokens)
          .values({
            id: input.id,
            tenantId: context.tenantId,
            workspaceId: input.workspaceId,
            sheetId: input.sheetId,
            audience: input.audience,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            revokedAt: null,
            lastAccessedAt: null,
            accessCount: 0,
            createdByUserId: input.createdByUserId,
            createdAt: serverNow(),
          })
          .returning(),
      );
      return rows[0] as HearingShareTokenRow;
    },

    async listBySheetId(context, sheetId) {
      const rows = await adapter.client
        .select()
        .from(hearingShareTokens)
        .where(and(eq(hearingShareTokens.tenantId, context.tenantId), eq(hearingShareTokens.sheetId, sheetId)))
        .orderBy(hearingShareTokens.createdAt);
      return rows as HearingShareTokenRow[];
    },

    async findValidByTokenHash(tokenHash, nowMs) {
      const rows = await adapter.client
        .select()
        .from(hearingShareTokens)
        .where(and(eq(hearingShareTokens.tokenHash, tokenHash), isNull(hearingShareTokens.revokedAt)))
        .limit(1);
      const row = rows[0] as HearingShareTokenRow | undefined;
      if (row === undefined) return null;
      if (row.expiresAt <= nowMs) return null;
      return row;
    },

    async recordAccess(id, accessedAtMs) {
      // read-modify-write にすると Workers の別要求が同じ値を読み、増分を取りこぼす。
      // 1 UPDATE の列式へ閉じることで DB 側に原子的に加算させる。last_accessed_at も
      // 遅れて到着した古い要求で巻き戻らないよう、現在値との大きい方だけを保存する。
      await guardedWrite(adapter, () =>
        adapter.client
          .update(hearingShareTokens)
          .set({
            accessCount: sql<number>`${hearingShareTokens.accessCount} + 1`,
            lastAccessedAt: sql<number>`CASE
              WHEN ${hearingShareTokens.lastAccessedAt} IS NULL
                OR ${hearingShareTokens.lastAccessedAt} < ${accessedAtMs}
              THEN ${accessedAtMs}
              ELSE ${hearingShareTokens.lastAccessedAt}
            END`,
          })
          .where(eq(hearingShareTokens.id, id)),
      );
    },

    async revokeIfActive(context, input) {
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(hearingShareTokens)
          .set({ revokedAt: input.revokedAt })
          .where(and(scopeById(context, input.id), isNull(hearingShareTokens.revokedAt)))
          .returning({ id: hearingShareTokens.id }),
      );
      return rows.length === 1;
    },
  };
}
