// device_authorizations / publisher_tokens リポジトリ — Device Authorization Grant の永続化 (§2.2, qa-008)。
//
// **この 2 表の状態遷移は compare-and-swap (CAS = 期待した現在値と一致したときだけ更新) で行う。**
// 「読んで → 判定して → 書く」を分けると、libSQL/D1 が並行 HTTP 要求を捌く分だけ隙間ができ、
// 同じ device_code で 2 本の token を発行したり、同じ refresh token を 2 回 rotate できてしまう。
// 判定条件を UPDATE の WHERE 句へ埋め込めば、直列化は SQLite の書き込みロックが担う。
// 更新行数 (returning の件数) が「自分が遷移させた側かどうか」の唯一の証拠になる。
//
// 書き込みは全て `guardedWrite` を通す。並走する監査 append が別接続で `BEGIN IMMEDIATE` を
// 握っている間、素の書き込みは `SQLITE_BUSY` で落ちるだけでなく **その接続が壊れて書き込みが
// 無かったことになる** (機序と実測は conflict.ts)。ゲートを通さないと「同じ device_code /
// 同じ refresh token を並行提示した」ケースが CAS の判定ではなくドライバのロックで壊れ、
// 呼び出し側には invalid_grant ではなく 500 か、成功応答なのに行が無い状態が見える。

import { and, eq, isNull } from 'drizzle-orm';
import { deviceAuthorizations, publisherTokens } from '../schema/core/publish';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import { serverNow } from './time';

/** 期限切れは expires_at から導出する派生状態なので、列としては持たない。 */
export type DeviceAuthorizationStatus = 'pending' | 'approved' | 'denied' | 'consumed';

export interface DeviceAuthorizationRow {
  readonly id: string;
  readonly tenantId: string;
  /** device_code は SHA-256 ハッシュのみ保存する (平文は発行応答にしか存在しない)。 */
  readonly deviceCodeHash: string;
  readonly userCode: string;
  readonly userId: string | null;
  readonly workspaceId: string | null;
  /** `PublisherTokenScope[]` の JSON 文字列。語彙の検証は apps/hub 側が行う。 */
  readonly scopesJson: string;
  readonly deviceName: string | null;
  readonly status: DeviceAuthorizationStatus;
  readonly attempts: number;
  readonly intervalSec: number;
  readonly lastPolledAt: number | null;
  readonly expiresAt: number;
  readonly createdAt: number;
}

/** 状態遷移を伴わない更新分 (polling 進行と user_code 照合の失敗計数)。 */
export interface DeviceAuthorizationProgress {
  readonly attempts?: number;
  readonly intervalSec?: number;
  readonly lastPolledAt?: number | null;
}

/** CAS で書き込む遷移後の値。status は必須 (何へ遷移するかを省略させない)。 */
export interface DeviceAuthorizationTransition {
  readonly status: DeviceAuthorizationStatus;
  readonly userId?: string | null;
  readonly workspaceId?: string | null;
  readonly attempts?: number;
  readonly intervalSec?: number;
  readonly lastPolledAt?: number | null;
}

export interface DeviceAuthorizationsRepo {
  create(
    context: RepositoryContext,
    input: Omit<DeviceAuthorizationRow, 'tenantId' | 'createdAt'>,
  ): Promise<DeviceAuthorizationRow>;
  findById(context: RepositoryContext, id: string): Promise<DeviceAuthorizationRow | null>;
  findByDeviceCodeHash(context: RepositoryContext, deviceCodeHash: string): Promise<DeviceAuthorizationRow | null>;
  findByUserCode(context: RepositoryContext, userCode: string): Promise<DeviceAuthorizationRow | null>;
  /** polling 進行の記録。競合しても後書きが残るだけで、認可の可否は変えない。 */
  updateProgress(context: RepositoryContext, id: string, patch: DeviceAuthorizationProgress): Promise<void>;
  /**
   * status が `expectedStatus` のままなら遷移させる CAS。遷移できたときだけ true。
   * 並行要求のうち **1 本しか true を得られない**ことが device_code 使い捨ての保証になる。
   */
  transitionStatus(
    context: RepositoryContext,
    input: {
      readonly id: string;
      readonly expectedStatus: DeviceAuthorizationStatus;
      readonly expectedAttempts: number;
      readonly next: DeviceAuthorizationTransition;
    },
  ): Promise<boolean>;
}

export function createDeviceAuthorizationsRepo(adapter: CoreAdapter): DeviceAuthorizationsRepo {
  const scopeById = (context: RepositoryContext, id: string) =>
    and(eq(deviceAuthorizations.tenantId, context.tenantId), eq(deviceAuthorizations.id, id));

  return {
    async create(context, input) {
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .insert(deviceAuthorizations)
          .values({ ...input, tenantId: context.tenantId, createdAt: serverNow() })
          .returning(),
      );
      return rows[0] as DeviceAuthorizationRow;
    },

    async findById(context, id) {
      const rows = await adapter.client.select().from(deviceAuthorizations).where(scopeById(context, id)).limit(1);
      return (rows[0] as DeviceAuthorizationRow | undefined) ?? null;
    },

    async findByDeviceCodeHash(context, deviceCodeHash) {
      const rows = await adapter.client
        .select()
        .from(deviceAuthorizations)
        .where(
          and(
            eq(deviceAuthorizations.tenantId, context.tenantId),
            eq(deviceAuthorizations.deviceCodeHash, deviceCodeHash),
          ),
        )
        .limit(1);
      return (rows[0] as DeviceAuthorizationRow | undefined) ?? null;
    },

    async findByUserCode(context, userCode) {
      const rows = await adapter.client
        .select()
        .from(deviceAuthorizations)
        .where(and(eq(deviceAuthorizations.tenantId, context.tenantId), eq(deviceAuthorizations.userCode, userCode)))
        .limit(1);
      return (rows[0] as DeviceAuthorizationRow | undefined) ?? null;
    },

    async updateProgress(context, id, patch) {
      const values: Record<string, unknown> = {};
      if (patch.attempts !== undefined) values.attempts = patch.attempts;
      if (patch.intervalSec !== undefined) values.intervalSec = patch.intervalSec;
      if (patch.lastPolledAt !== undefined) values.lastPolledAt = patch.lastPolledAt;
      if (Object.keys(values).length === 0) return;
      await guardedWrite(adapter, () =>
        adapter.client.update(deviceAuthorizations).set(values).where(scopeById(context, id)),
      );
    },

    async transitionStatus(context, input) {
      const values: Record<string, unknown> = { status: input.next.status };
      if (input.next.userId !== undefined) values.userId = input.next.userId;
      if (input.next.workspaceId !== undefined) values.workspaceId = input.next.workspaceId;
      if (input.next.attempts !== undefined) values.attempts = input.next.attempts;
      if (input.next.intervalSec !== undefined) values.intervalSec = input.next.intervalSec;
      if (input.next.lastPolledAt !== undefined) values.lastPolledAt = input.next.lastPolledAt;

      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(deviceAuthorizations)
          .set(values)
          // expectedStatus / expectedAttempts を WHERE へ入れることが CAS の本体。
          // 先に遷移・計数した要求があればどちらかが変わっており、ここで 0 行になる。
          // (再試行しても WHERE が再評価されるだけなので、勝者が 2 本になることはない)
          .where(
            and(
              scopeById(context, input.id),
              eq(deviceAuthorizations.status, input.expectedStatus),
              eq(deviceAuthorizations.attempts, input.expectedAttempts),
            ),
          )
          .returning({ id: deviceAuthorizations.id }),
      );
      return rows.length === 1;
    },
  };
}

export interface PublisherTokenRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly deviceName: string | null;
  /** refresh token は SHA-256 ハッシュのみ保存する。DB 流出から平文を復元できない。 */
  readonly refreshTokenHash: string;
  readonly scopesJson: string;
  /** rotation の系列 ID。再利用検知時はこの単位でまとめて失効させる。 */
  readonly familyId: string;
  readonly lastUsedAt: number | null;
  readonly expiresAt: number;
  readonly revokedAt: number | null;
  readonly createdAt: number;
}

export interface PublisherTokensRepo {
  /**
   * `createdAt` は省略時 `serverNow()`。
   * 明示指定を許すのは、TTL (expiresAt) を決めた時計と created_at を **同一の時計に揃える**ため。
   * ここが揃わないと `expiresAt - createdAt` が TTL と一致せず、決定論的な TTL 検査ができない。
   * 受け取るのはリモートのクライアント申告値ではなく apps/hub のサーバー時計なので qa-032 に反しない。
   */
  create(
    context: RepositoryContext,
    input: Omit<PublisherTokenRow, 'tenantId' | 'createdAt'> & { readonly createdAt?: number },
  ): Promise<PublisherTokenRow>;
  findById(context: RepositoryContext, id: string): Promise<PublisherTokenRow | null>;
  findByRefreshTokenHash(context: RepositoryContext, refreshTokenHash: string): Promise<PublisherTokenRow | null>;
  listByFamilyId(context: RepositoryContext, familyId: string): Promise<PublisherTokenRow[]>;
  listByUserId(context: RepositoryContext, userId: string): Promise<PublisherTokenRow[]>;
  listByWorkspaceId(context: RepositoryContext, workspaceId: string): Promise<PublisherTokenRow[]>;
  /**
   * まだ失効していない場合だけ失効させる CAS。true を得た 1 本だけが rotation を続行できる。
   * refresh token の「1 回しか使えない」を DB の条件で保証する要点。
   */
  revokeIfActive(
    context: RepositoryContext,
    input: { readonly id: string; readonly revokedAt: number; readonly lastUsedAt?: number },
  ): Promise<boolean>;
  /** family 一括失効 (再利用検知 / 利用者による失効)。実際に失効させた件数を返す。 */
  revokeFamily(
    context: RepositoryContext,
    input: { readonly familyId: string; readonly revokedAt: number },
  ): Promise<number>;
}

export function createPublisherTokensRepo(adapter: CoreAdapter): PublisherTokensRepo {
  const scopeById = (context: RepositoryContext, id: string) =>
    and(eq(publisherTokens.tenantId, context.tenantId), eq(publisherTokens.id, id));

  return {
    async create(context, input) {
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .insert(publisherTokens)
          .values({ ...input, tenantId: context.tenantId, createdAt: input.createdAt ?? serverNow() })
          .returning(),
      );
      return rows[0] as PublisherTokenRow;
    },

    async findById(context, id) {
      const rows = await adapter.client.select().from(publisherTokens).where(scopeById(context, id)).limit(1);
      return (rows[0] as PublisherTokenRow | undefined) ?? null;
    },

    async findByRefreshTokenHash(context, refreshTokenHash) {
      const rows = await adapter.client
        .select()
        .from(publisherTokens)
        .where(
          and(eq(publisherTokens.tenantId, context.tenantId), eq(publisherTokens.refreshTokenHash, refreshTokenHash)),
        )
        .limit(1);
      return (rows[0] as PublisherTokenRow | undefined) ?? null;
    },

    async listByFamilyId(context, familyId) {
      const rows = await adapter.client
        .select()
        .from(publisherTokens)
        .where(and(eq(publisherTokens.tenantId, context.tenantId), eq(publisherTokens.familyId, familyId)))
        .orderBy(publisherTokens.createdAt);
      return rows as PublisherTokenRow[];
    },

    async listByUserId(context, userId) {
      const rows = await adapter.client
        .select()
        .from(publisherTokens)
        .where(and(eq(publisherTokens.tenantId, context.tenantId), eq(publisherTokens.userId, userId)))
        .orderBy(publisherTokens.createdAt);
      return rows as PublisherTokenRow[];
    },

    async listByWorkspaceId(context, workspaceId) {
      const rows = await adapter.client
        .select()
        .from(publisherTokens)
        .where(and(eq(publisherTokens.tenantId, context.tenantId), eq(publisherTokens.workspaceId, workspaceId)))
        .orderBy(publisherTokens.createdAt);
      return rows as PublisherTokenRow[];
    },

    async revokeIfActive(context, input) {
      const values: Record<string, unknown> = { revokedAt: input.revokedAt };
      if (input.lastUsedAt !== undefined) values.lastUsedAt = input.lastUsedAt;
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(publisherTokens)
          .set(values)
          // `revoked_at IS NULL` が CAS の条件。先に rotate した要求があればここで 0 行になる。
          .where(and(scopeById(context, input.id), isNull(publisherTokens.revokedAt)))
          .returning({ id: publisherTokens.id }),
      );
      return rows.length === 1;
    },

    async revokeFamily(context, input) {
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(publisherTokens)
          .set({ revokedAt: input.revokedAt })
          .where(
            and(
              eq(publisherTokens.tenantId, context.tenantId),
              eq(publisherTokens.familyId, input.familyId),
              isNull(publisherTokens.revokedAt),
            ),
          )
          .returning({ id: publisherTokens.id }),
      );
      return rows.length;
    },
  };
}
