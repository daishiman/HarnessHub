// target_channels リポジトリ — stable pointer の正本 (I3)。
// stable_release_id の切替は単一 UPDATE 文で atomic に行う (両 driver 共通)。rollback は旧 id への同一操作。

import { and, eq } from 'drizzle-orm';
import { releases, targetChannels } from '../schema/core/catalog';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export interface TargetChannelRow {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly target: 'skill' | 'web_app';
  readonly stableReleaseId: string | null;
  readonly createdAt: number;
}

export interface TargetChannelsRepo {
  create(
    context: RepositoryContext,
    input: { readonly projectId: string; readonly target: 'skill' | 'web_app' },
  ): Promise<TargetChannelRow>;
  findById(context: RepositoryContext, id: string): Promise<TargetChannelRow | null>;
  /**
   * stable pointer の atomic 切替 (公開・更新・rollback の共通経路)。
   * releaseId は同一 tenant・同一 channel の release であることを事前検証する。
   */
  setStableRelease(context: RepositoryContext, channelId: string, releaseId: string | null): Promise<TargetChannelRow>;
}

export function createTargetChannelsRepo(adapter: CoreAdapter): TargetChannelsRepo {
  return {
    async create(context, input) {
      const rows = await adapter.client
        .insert(targetChannels)
        .values({
          id: newUlid(),
          tenantId: context.tenantId,
          projectId: input.projectId,
          target: input.target,
          stableReleaseId: null,
          createdAt: serverNow(),
        })
        .returning();
      return rows[0] as TargetChannelRow;
    },

    async findById(context, id) {
      const rows = await adapter.client
        .select()
        .from(targetChannels)
        .where(and(eq(targetChannels.tenantId, context.tenantId), eq(targetChannels.id, id)))
        .limit(1);
      return (rows[0] as TargetChannelRow | undefined) ?? null;
    },

    async setStableRelease(context, channelId, releaseId) {
      if (releaseId !== null) {
        const rel = await adapter.client
          .select({ id: releases.id })
          .from(releases)
          .where(
            and(eq(releases.tenantId, context.tenantId), eq(releases.channelId, channelId), eq(releases.id, releaseId)),
          )
          .limit(1);
        if (rel[0] === undefined) {
          throw new RepositoryError('not-found', `release ${releaseId} は channel ${channelId} に属していません`);
        }
      }
      const rows = await adapter.client
        .update(targetChannels)
        .set({ stableReleaseId: releaseId })
        .where(and(eq(targetChannels.tenantId, context.tenantId), eq(targetChannels.id, channelId)))
        .returning();
      const updated = rows[0] as TargetChannelRow | undefined;
      if (updated === undefined) throw new EntityNotFoundError('target_channels', channelId);
      return updated;
    },
  };
}
