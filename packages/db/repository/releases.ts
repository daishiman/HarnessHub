// releases リポジトリ — immutable 強制 (I3)。
// 公開するのは createRelease / updateReleaseStatus / 読取系のみ。
// status 以外のフィールドを更新する関数を提供しない (存在しないものは呼べない)。

import { and, desc, eq } from 'drizzle-orm';
import { releases } from '../schema/core/catalog';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type ReleaseStatus = 'available' | 'suspended' | 'deprecated';

export interface ReleaseRow {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly version: string;
  readonly packageHash: string;
  readonly manifestJson: string;
  readonly status: ReleaseStatus;
  readonly createdBy: string;
  readonly createdAt: number;
}

export interface CreateReleaseInput {
  readonly projectId: string;
  readonly channelId: string;
  readonly packageHash: string;
  readonly manifestJson: string;
  readonly createdBy: string;
}

const VERSION_PATTERN = /^v(\d+)$/;
const CREATE_MAX_RETRY = 5;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /unique/i.test(error.message);
}

export interface ReleasesRepo {
  /**
   * version の自動採番 (差分 + content hash):
   * 直前 release と package_hash が同一なら新規採番せず既存を返す (created=false)。
   * 差分があれば直前 version + 1 を `v{N}` で採番する (初回は v1)。
   * UNIQUE(channel_id, version) が並行採番を検出し、競合時は再試行する。
   */
  createRelease(
    context: RepositoryContext,
    input: CreateReleaseInput,
  ): Promise<{ release: ReleaseRow; created: boolean }>;
  /** immutable 契約の唯一の更新口。status 以外は変更できない。 */
  updateReleaseStatus(context: RepositoryContext, id: string, status: ReleaseStatus): Promise<ReleaseRow>;
  findById(context: RepositoryContext, id: string): Promise<ReleaseRow | null>;
  listByChannel(context: RepositoryContext, channelId: string): Promise<ReleaseRow[]>;
}

export function createReleasesRepo(adapter: CoreAdapter): ReleasesRepo {
  async function latestForChannel(context: RepositoryContext, channelId: string): Promise<ReleaseRow | undefined> {
    // ULID PK は時系列単調のため id 降順 = 作成順降順 (同一 ms でも安定)。
    const rows = await adapter.client
      .select()
      .from(releases)
      .where(and(eq(releases.tenantId, context.tenantId), eq(releases.channelId, channelId)))
      .orderBy(desc(releases.id))
      .limit(1);
    return rows[0] as ReleaseRow | undefined;
  }

  return {
    async createRelease(context, input) {
      for (let attempt = 1; ; attempt += 1) {
        const latest = await latestForChannel(context, input.channelId);
        if (latest !== undefined && latest.packageHash === input.packageHash) {
          return { release: latest, created: false };
        }
        const lastN = latest === undefined ? 0 : Number(VERSION_PATTERN.exec(latest.version)?.[1] ?? 0);
        try {
          const rows = await adapter.client
            .insert(releases)
            .values({
              id: newUlid(),
              tenantId: context.tenantId,
              projectId: input.projectId,
              channelId: input.channelId,
              version: `v${lastN + 1}`,
              packageHash: input.packageHash,
              manifestJson: input.manifestJson,
              status: 'available',
              createdBy: input.createdBy,
              createdAt: serverNow(),
            })
            .returning();
          return { release: rows[0] as ReleaseRow, created: true };
        } catch (error) {
          if (!isUniqueViolation(error) || attempt >= CREATE_MAX_RETRY) throw error;
        }
      }
    },

    async updateReleaseStatus(context, id, status) {
      const rows = await adapter.client
        .update(releases)
        .set({ status })
        .where(and(eq(releases.tenantId, context.tenantId), eq(releases.id, id)))
        .returning();
      const updated = rows[0] as ReleaseRow | undefined;
      if (updated === undefined) throw new EntityNotFoundError('releases', id);
      return updated;
    },

    async findById(context, id) {
      const rows = await adapter.client
        .select()
        .from(releases)
        .where(and(eq(releases.tenantId, context.tenantId), eq(releases.id, id)))
        .limit(1);
      return (rows[0] as ReleaseRow | undefined) ?? null;
    },

    async listByChannel(context, channelId) {
      const rows = await adapter.client
        .select()
        .from(releases)
        .where(and(eq(releases.tenantId, context.tenantId), eq(releases.channelId, channelId)))
        .orderBy(desc(releases.id));
      return rows as ReleaseRow[];
    },
  };
}
