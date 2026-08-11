/**
 * production publish smoke 専用の DB probe。
 *
 * smoke runner が schema table を deep import すると、アプリ層が repository 境界を
 * 迂回する前例になる。この facade に fixture 準備・証跡読取・cleanup を閉じ、
 * apps/hub へは目的別の最小 API だけを公開する。
 */

import { and, eq, inArray } from 'drizzle-orm';
import { verifyAuditChain } from '../backup/verify';
import {
  catalogEntries,
  deploymentReferences,
  packages,
  projects,
  releases,
  targetChannels,
} from '../schema/core/catalog';
import { tenants } from '../schema/core/identity';
import { idempotencyLedger, publishRequests } from '../schema/core/publish';
import { auditEvents } from '../schema/core/security';
import { smokeFixtureLeases } from '../schema/core/smoke';
import { isTransactionalAdapter } from '../src/adapter';
import { EntityNotFoundError, RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';

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
  /**
   * publish 領域が使い捨て tenant へ残した行を全て消す。残数を返し、0 でなければ呼び出し側が失敗にする。
   *
   * identity 側 (`HearingSmokeDbProbe.cleanupTenant`) は publish 領域の表を知らない。
   * 使い捨て tenant で publish smoke を回すようにした結果 (HarnessHub-pf5o)、
   * 後始末を identity 側だけに任せると projects / releases / publish_requests が
   * **孤児として本番に残ったまま `clean: true` になる**。所有する側がここで消す。
   *
   * `packages` は content-addressed で tenant 非スコープ (schema のコメント参照) のため対象外。
   * R2 実体も同じ理由で残す — 消すと同一 hash を参照する他 tenant の Release を壊しうる。
   */
  cleanupPublishTenant(tenantId: string): Promise<{ readonly remainingRows: number; readonly clean: boolean }>;
}

function transactional(adapter: CoreAdapter) {
  if (!isTransactionalAdapter(adapter)) {
    throw new RepositoryError(
      'invalid-context',
      'production publish smoke の後始末には transaction 対応 adapter が必要です',
    );
  }
  return adapter;
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

    async cleanupPublishTenant(tenantId) {
      // 依存の子から順に消す。projects を先に消すと、残った子行がどの Project のものか
      // 追えなくなり、次回以降の cleanup が対象を特定できなくなる (hearing 側と同じ理由)。
      await guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const txDb = tx.client as CoreDb;
          const [lease] = await txDb
            .select({ tenantId: smokeFixtureLeases.tenantId })
            .from(smokeFixtureLeases)
            .where(eq(smokeFixtureLeases.tenantId, tenantId))
            .limit(1);
          // tenant 名や slug は削除 authority ではない。専用台帳に登録されていない tenant の
          // publish 行は、smoke らしい名前に見えても 1 行も消さない。
          if (lease === undefined) {
            const [tenant] = await txDb
              .select({ id: tenants.id })
              .from(tenants)
              .where(eq(tenants.id, tenantId))
              .limit(1);
            // 別 sweeper が同じ command を先に完走した競合だけは冪等 success にする。
            // tenant が無いのに publish 孤児だけがある場合も、ここでは削除せず下の残数検査を赤にする。
            if (tenant === undefined) return;
            throw new RepositoryError(
              'invalid-context',
              `tenant ${tenantId} は smoke fixture lease を持たないため publish 行を物理削除できません`,
            );
          }
          await txDb.delete(catalogEntries).where(eq(catalogEntries.tenantId, tenantId));
          await txDb.delete(deploymentReferences).where(eq(deploymentReferences.tenantId, tenantId));
          await txDb.delete(publishRequests).where(eq(publishRequests.tenantId, tenantId));
          await txDb.delete(releases).where(eq(releases.tenantId, tenantId));
          await txDb.delete(targetChannels).where(eq(targetChannels.tenantId, tenantId));
          await txDb.delete(projects).where(eq(projects.tenantId, tenantId));
          // 冪等鍵は request 単位に積まれる。残すと同じ鍵の再利用検査が過去 run の行に当たる。
          await txDb.delete(idempotencyLedger).where(eq(idempotencyLedger.tenantId, tenantId));
        }),
      );

      // 消し漏れを 1 行でも残したまま clean を返さない。列は型付き select で数える。
      const remainders = await Promise.all([
        adapter.client.select({ id: projects.id }).from(projects).where(eq(projects.tenantId, tenantId)),
        adapter.client
          .select({ id: targetChannels.id })
          .from(targetChannels)
          .where(eq(targetChannels.tenantId, tenantId)),
        adapter.client.select({ id: releases.id }).from(releases).where(eq(releases.tenantId, tenantId)),
        adapter.client
          .select({ id: publishRequests.id })
          .from(publishRequests)
          .where(eq(publishRequests.tenantId, tenantId)),
        adapter.client
          .select({ id: deploymentReferences.id })
          .from(deploymentReferences)
          .where(eq(deploymentReferences.tenantId, tenantId)),
        adapter.client
          .select({ id: catalogEntries.id })
          .from(catalogEntries)
          .where(eq(catalogEntries.tenantId, tenantId)),
        adapter.client
          .select({ id: idempotencyLedger.key })
          .from(idempotencyLedger)
          .where(eq(idempotencyLedger.tenantId, tenantId)),
      ]);
      const remaining = remainders.reduce((total, rows) => total + rows.length, 0);
      return { remainingRows: remaining, clean: remaining === 0 };
    },
  };
}
