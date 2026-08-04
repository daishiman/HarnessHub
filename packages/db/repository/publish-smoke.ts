/**
 * production publish smoke 専用の DB probe。
 *
 * smoke runner が schema table を deep import すると、アプリ層が repository 境界を
 * 迂回する前例になる。この facade に fixture 準備・証跡読取・cleanup を閉じ、
 * apps/hub へは目的別の最小 API だけを公開する。
 */

import { and, eq, inArray } from 'drizzle-orm';
import { verifyAuditChain } from '../backup/verify';
import { packages, projects, releases, targetChannels } from '../schema/core/catalog';
import { publishRequests } from '../schema/core/publish';
import { auditEvents } from '../schema/core/security';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';

export interface PublishSmokeEvidence {
  readonly stableReleaseId: string | null;
  readonly releaseRows: readonly {
    readonly id: string;
    readonly packageHash: string;
  }[];
  readonly packageRows: readonly {
    readonly contentHash: string;
    readonly r2Key: string;
  }[];
  readonly auditChain: {
    readonly checked: number;
    readonly errors: readonly string[];
    readonly ok: boolean;
  } | null;
  readonly auditActions: readonly string[];
}

export interface PublishSmokeDbProbe {
  createProjectChannelFixture(
    context: RepositoryContext,
    input: {
      readonly projectId: string;
      readonly channelId: string;
      readonly ownerUserId: string;
      readonly createdAt: number;
    },
  ): Promise<void>;
  markRequestReady(context: RepositoryContext, requestId: string): Promise<void>;
  findRequest(
    context: RepositoryContext,
    requestId: string,
  ): Promise<{ readonly status: string; readonly releaseId: string | null } | null>;
  findStableReleaseId(context: RepositoryContext, channelId: string): Promise<string | null>;
  createWebReleaseFixture(
    context: RepositoryContext,
    input: {
      readonly projectId: string;
      readonly channelId: string;
      readonly releaseId: string;
      readonly packageHash: string;
      readonly createdBy: string;
      readonly createdAt: number;
    },
  ): Promise<void>;
  collectEvidence(
    context: RepositoryContext,
    input: {
      readonly projectId: string;
      readonly channelId: string;
      readonly contentHashes: readonly string[];
      readonly entityIds: ReadonlySet<string>;
    },
  ): Promise<PublishSmokeEvidence>;
  archiveProject(context: RepositoryContext, projectId: string): Promise<void>;
}

export function createPublishSmokeDbProbe(adapter: CoreAdapter): PublishSmokeDbProbe {
  return {
    async createProjectChannelFixture(context, input) {
      const workspaceId = context.workspaceId;
      if (workspaceId === undefined || workspaceId.length === 0) {
        throw new Error('production smoke fixture には workspaceId が必要です');
      }
      await guardedWrite(adapter, () =>
        adapter.client.insert(projects).values({
          id: input.projectId,
          tenantId: context.tenantId,
          workspaceId,
          slug: input.projectId,
          name: input.projectId,
          description: 'P13 disposable production smoke',
          ownerUserId: input.ownerUserId,
          status: 'active',
          createdAt: input.createdAt,
        }),
      );
      await guardedWrite(adapter, () =>
        adapter.client.insert(targetChannels).values({
          id: input.channelId,
          tenantId: context.tenantId,
          projectId: input.projectId,
          target: 'skill',
          stableReleaseId: null,
          createdAt: input.createdAt,
        }),
      );
    },

    async markRequestReady(context, requestId) {
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(publishRequests)
          .set({ status: 'ready' })
          .where(and(eq(publishRequests.tenantId, context.tenantId), eq(publishRequests.id, requestId)))
          .returning({ id: publishRequests.id }),
      );
      if (rows[0] === undefined) throw new EntityNotFoundError('publish_requests', requestId);
    },

    async findRequest(context, requestId) {
      const rows = await adapter.client
        .select({ status: publishRequests.status, releaseId: publishRequests.releaseId })
        .from(publishRequests)
        .where(and(eq(publishRequests.tenantId, context.tenantId), eq(publishRequests.id, requestId)))
        .limit(1);
      return rows[0] ?? null;
    },

    async findStableReleaseId(context, channelId) {
      const rows = await adapter.client
        .select({ stableReleaseId: targetChannels.stableReleaseId })
        .from(targetChannels)
        .where(and(eq(targetChannels.tenantId, context.tenantId), eq(targetChannels.id, channelId)))
        .limit(1);
      return rows[0]?.stableReleaseId ?? null;
    },

    async createWebReleaseFixture(context, input) {
      await guardedWrite(adapter, () =>
        adapter.client.insert(targetChannels).values({
          id: input.channelId,
          tenantId: context.tenantId,
          projectId: input.projectId,
          target: 'web_app',
          stableReleaseId: null,
          createdAt: input.createdAt,
        }),
      );
      await guardedWrite(adapter, () =>
        adapter.client.insert(releases).values({
          id: input.releaseId,
          tenantId: context.tenantId,
          projectId: input.projectId,
          channelId: input.channelId,
          version: 'v1',
          packageHash: input.packageHash,
          manifestJson: JSON.stringify({
            v: 1,
            fixture: 'production-smoke-web-app',
            content_hash: input.packageHash,
          }),
          status: 'available',
          createdBy: input.createdBy,
          createdAt: input.createdAt,
        }),
      );
      await guardedWrite(adapter, () =>
        adapter.client
          .update(targetChannels)
          .set({ stableReleaseId: input.releaseId })
          .where(and(eq(targetChannels.tenantId, context.tenantId), eq(targetChannels.id, input.channelId))),
      );
    },

    async collectEvidence(context, input) {
      const [channelRows, releaseRows, packageRows, chainRows, auditRows] = await Promise.all([
        adapter.client
          .select({ stableReleaseId: targetChannels.stableReleaseId })
          .from(targetChannels)
          .where(and(eq(targetChannels.tenantId, context.tenantId), eq(targetChannels.id, input.channelId)))
          .limit(1),
        adapter.client
          .select({ id: releases.id, packageHash: releases.packageHash })
          .from(releases)
          .where(and(eq(releases.tenantId, context.tenantId), eq(releases.projectId, input.projectId))),
        input.contentHashes.length === 0
          ? Promise.resolve([])
          : adapter.client
              .select({ contentHash: packages.contentHash, r2Key: packages.r2Key })
              .from(packages)
              .where(inArray(packages.contentHash, [...input.contentHashes])),
        verifyAuditChain(adapter),
        adapter.client
          .select({ action: auditEvents.action, entityId: auditEvents.entityId })
          .from(auditEvents)
          .where(eq(auditEvents.tenantId, context.tenantId)),
      ]);
      const chain = chainRows.find((row) => row.tenantId === context.tenantId) ?? null;
      return {
        stableReleaseId: channelRows[0]?.stableReleaseId ?? null,
        releaseRows,
        packageRows,
        auditChain: chain === null ? null : { checked: chain.checked, errors: chain.errors, ok: chain.ok },
        auditActions: auditRows.filter((row) => input.entityIds.has(row.entityId)).map((row) => row.action),
      };
    },

    async archiveProject(context, projectId) {
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(projects)
          .set({ status: 'archived' })
          .where(and(eq(projects.tenantId, context.tenantId), eq(projects.id, projectId)))
          .returning({ id: projects.id }),
      );
      if (rows[0] === undefined) throw new EntityNotFoundError('projects', projectId);
    },
  };
}
