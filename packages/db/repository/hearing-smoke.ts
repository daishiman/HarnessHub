/**
 * feat-hearing-intake P13 production smoke 専用の DB probe。
 *
 * smoke runner が schema table を deep import すると、アプリ層が repository 境界を
 * 迂回する前例になる。この facade に fixture 準備・device 承認の代行・証跡読取・cleanup を閉じ、
 * apps/hub へは目的別の最小 API だけを公開する (publish-smoke.ts と同じ方針)。
 *
 * **なぜ device 承認を DB で代行するのか**: Device Flow の承認 (`POST /api/v1/device/approve`) だけが
 * session cookie を要求し、session は Google OIDC を通らないと得られない。CI に Google 資格情報も
 * 署名鍵も置かない方針 (smoke-production-oidc.mjs と同じ) を守ったまま本番 Worker が署名した
 * access token を得るため、承認の状態遷移だけをここで代行する。code 発行と token 交換は
 * 本番 Worker の HTTP endpoint をそのまま通すので、token の真正性は本番実装が保証する。
 */

import { and, eq } from 'drizzle-orm';

import { idpConnections, tenants, users, userWorkspaces, workspaces } from '../schema/core/identity';
import { deviceAuthorizations, publisherTokens } from '../schema/core/publish';
import { auditEvents } from '../schema/core/security';
import { aiJobs, displayCodeCounters, hearingSheets, tenantCoefficients } from '../schema/hearing-intake/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

/** smoke が本番へ作る使い捨てテナント一式。ID は呼び出し側が cleanup へそのまま渡す。 */
export interface HearingSmokeTenantFixture {
  readonly tenantId: string;
  readonly tenantSlug: string;
  readonly workspaceId: string;
  /** シート提出者 (role=member)。sheets.create の最小権限。 */
  readonly memberUserId: string;
  /** AI worker 役 (role=workspace-admin)。aijob.pull は workspace-admin を要求する。 */
  readonly workerUserId: string;
}

export interface HearingSmokeSheetSnapshot {
  readonly id: string;
  readonly code: string;
  readonly status: string;
  readonly aiJobId: string | null;
  readonly formJson: string;
  readonly estimateJson: string;
  readonly aiJobStatus: string | null;
  readonly aiJobResultJson: string | null;
}

export interface HearingSmokeJobSnapshot {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly claimedByTokenId: string | null;
  readonly refType: string;
  readonly refId: string;
}

export interface HearingSmokeDbProbe {
  /**
   * tenant / idp_connection / workspace / member / worker / 所属を 1 単位で作る。
   *
   * idp_connection を作るのは Device Flow が `tenant_slug` から接続を解決するため
   * (`resolveTenantOidcConfig`)。この接続は OIDC ログインには使えない値を入れる。
   */
  createTenantFixture(input: {
    readonly slug: string;
    readonly memberIdpSubject: string;
    readonly workerIdpSubject: string;
  }): Promise<HearingSmokeTenantFixture>;
  /**
   * `pending` の device 認可を `approved` へ進める (承認画面の代行)。
   * status が pending のままのときだけ遷移する CAS で、二重承認を作らない。
   */
  approveDeviceAuthorization(input: {
    readonly tenantId: string;
    readonly userCode: string;
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<boolean>;
  findSheet(context: RepositoryContext, sheetId: string): Promise<HearingSmokeSheetSnapshot | null>;
  findJob(context: RepositoryContext, jobId: string): Promise<HearingSmokeJobSnapshot | null>;
  /** 本 smoke が本番へ残した行を全て消す。残数を返し、0 でなければ呼び出し側が失敗にする。 */
  cleanupTenant(tenantId: string): Promise<{ readonly remainingRows: number; readonly clean: boolean }>;
}

const SMOKE_ISSUER_PREFIX = 'https://hearing-smoke.invalid/';

function transactional(adapter: CoreAdapter) {
  if (!isTransactionalAdapter(adapter)) {
    throw new RepositoryError('invalid-context', 'production hearing smoke には transaction 対応 adapter が必要です');
  }
  return adapter;
}

export function createHearingSmokeDbProbe(adapter: CoreAdapter): HearingSmokeDbProbe {
  const db = adapter.client;

  return {
    async createTenantFixture(input) {
      const now = serverNow();
      const tenantId = newUlid(now);
      const workspaceId = newUlid(now);
      const memberUserId = newUlid(now);
      const workerUserId = newUlid(now);

      // 途中の INSERT が失敗しても tenantId が呼び出し側へ返る前なので、finally の cleanup には
      // 渡せない。fixture 全体を 1 transaction にし、半端な本番データを原理的に残さない。
      await guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const txDb = tx.client as CoreDb;
          await txDb.insert(tenants).values({
            id: tenantId,
            slug: input.slug,
            name: 'P13 hearing smoke',
            plan: 'free',
            status: 'active',
            createdAt: now,
          });
          await txDb.insert(idpConnections).values({
            id: newUlid(now),
            tenantId,
            // 実在しない issuer / client を入れる。Device Flow は tenant 解決にしか使わず、
            // OIDC 認可要求はこの値では成立しないため、cleanup 前に外部から悪用できない。
            issuerUrl: `${SMOKE_ISSUER_PREFIX}${input.slug}`,
            clientId: `hearing-smoke-${input.slug}`,
            clientSecretEnc: 'hearing-smoke:not-a-credential',
            scopes: 'openid email profile',
            credentialMode: 'customer_google',
            allowedWorkspaceDomains: null,
            createdAt: now,
          });
          await txDb.insert(workspaces).values({
            id: workspaceId,
            tenantId,
            slug: `ws-${input.slug}`,
            name: 'P13 hearing smoke workspace',
            createdAt: now,
          });
          await txDb.insert(users).values([
            {
              id: memberUserId,
              tenantId,
              idpSubject: input.memberIdpSubject,
              email: `${input.memberIdpSubject}@hearing-smoke.invalid`,
              name: 'P13 smoke applicant',
              department: 'smoke',
              salary: null,
              role: 'member',
              status: 'active',
              lastLoginAt: null,
              createdAt: now,
            },
            {
              id: workerUserId,
              tenantId,
              idpSubject: input.workerIdpSubject,
              email: `${input.workerIdpSubject}@hearing-smoke.invalid`,
              name: 'P13 smoke worker',
              department: 'smoke',
              salary: null,
              role: 'workspace-admin',
              status: 'active',
              lastLoginAt: null,
              createdAt: now,
            },
          ]);
          await txDb.insert(userWorkspaces).values([
            { tenantId, userId: memberUserId, workspaceId, createdAt: now },
            { tenantId, userId: workerUserId, workspaceId, createdAt: now },
          ]);
        }),
      );

      return { tenantId, tenantSlug: input.slug, workspaceId, memberUserId, workerUserId };
    },

    async approveDeviceAuthorization(input) {
      const updated = await guardedWrite(adapter, () =>
        db
          .update(deviceAuthorizations)
          .set({ status: 'approved', userId: input.userId, workspaceId: input.workspaceId })
          .where(
            and(
              eq(deviceAuthorizations.tenantId, input.tenantId),
              eq(deviceAuthorizations.userCode, input.userCode),
              eq(deviceAuthorizations.status, 'pending'),
            ),
          )
          .returning({ id: deviceAuthorizations.id }),
      );
      return updated[0] !== undefined;
    },

    async findSheet(context, sheetId) {
      const rows = await db
        .select({
          id: hearingSheets.id,
          code: hearingSheets.code,
          status: hearingSheets.status,
          aiJobId: hearingSheets.aiJobId,
          formJson: hearingSheets.formJson,
          estimateJson: hearingSheets.estimateJson,
          aiJobStatus: aiJobs.status,
          aiJobResultJson: aiJobs.resultJson,
        })
        .from(hearingSheets)
        .leftJoin(
          aiJobs,
          and(
            eq(aiJobs.tenantId, hearingSheets.tenantId),
            eq(aiJobs.workspaceId, hearingSheets.workspaceId),
            eq(aiJobs.id, hearingSheets.aiJobId),
          ),
        )
        .where(and(eq(hearingSheets.tenantId, context.tenantId), eq(hearingSheets.id, sheetId)))
        .limit(1);
      return (rows[0] as HearingSmokeSheetSnapshot | undefined) ?? null;
    },

    async findJob(context, jobId) {
      const rows = await db
        .select({
          id: aiJobs.id,
          kind: aiJobs.kind,
          status: aiJobs.status,
          claimedByTokenId: aiJobs.claimedByTokenId,
          refType: aiJobs.refType,
          refId: aiJobs.refId,
        })
        .from(aiJobs)
        .where(and(eq(aiJobs.tenantId, context.tenantId), eq(aiJobs.id, jobId)))
        .limit(1);
      return (rows[0] as HearingSmokeJobSnapshot | undefined) ?? null;
    },

    async cleanupTenant(tenantId) {
      // 依存の子から順に消す。tenant 行を先に消すと、残った子行がどのテナントの
      // ものか追えなくなり、次回以降の cleanup が対象を特定できなくなる。
      await guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const txDb = tx.client as CoreDb;
          await txDb.delete(aiJobs).where(eq(aiJobs.tenantId, tenantId));
          await txDb.delete(hearingSheets).where(eq(hearingSheets.tenantId, tenantId));
          await txDb.delete(displayCodeCounters).where(eq(displayCodeCounters.tenantId, tenantId));
          await txDb.delete(tenantCoefficients).where(eq(tenantCoefficients.tenantId, tenantId));
          await txDb.delete(publisherTokens).where(eq(publisherTokens.tenantId, tenantId));
          await txDb.delete(deviceAuthorizations).where(eq(deviceAuthorizations.tenantId, tenantId));
          await txDb.delete(auditEvents).where(eq(auditEvents.tenantId, tenantId));
          await txDb.delete(userWorkspaces).where(eq(userWorkspaces.tenantId, tenantId));
          await txDb.delete(users).where(eq(users.tenantId, tenantId));
          await txDb.delete(workspaces).where(eq(workspaces.tenantId, tenantId));
          await txDb.delete(idpConnections).where(eq(idpConnections.tenantId, tenantId));
          await txDb.delete(tenants).where(eq(tenants.id, tenantId));
        }),
      );

      // 残数は raw SQL ではなく型付き select の件数で数える。
      // 消し漏れを 1 行でも残したまま ok を返さないことがこの smoke の後始末条件。
      const remainders = await Promise.all([
        db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId)),
        db.select({ id: idpConnections.id }).from(idpConnections).where(eq(idpConnections.tenantId, tenantId)),
        db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.tenantId, tenantId)),
        db.select({ id: users.id }).from(users).where(eq(users.tenantId, tenantId)),
        db.select({ id: userWorkspaces.userId }).from(userWorkspaces).where(eq(userWorkspaces.tenantId, tenantId)),
        db
          .select({ id: deviceAuthorizations.id })
          .from(deviceAuthorizations)
          .where(eq(deviceAuthorizations.tenantId, tenantId)),
        db.select({ id: publisherTokens.id }).from(publisherTokens).where(eq(publisherTokens.tenantId, tenantId)),
        db.select({ id: auditEvents.id }).from(auditEvents).where(eq(auditEvents.tenantId, tenantId)),
        db.select({ id: hearingSheets.id }).from(hearingSheets).where(eq(hearingSheets.tenantId, tenantId)),
        db.select({ id: aiJobs.id }).from(aiJobs).where(eq(aiJobs.tenantId, tenantId)),
        db
          .select({ id: displayCodeCounters.kind })
          .from(displayCodeCounters)
          .where(eq(displayCodeCounters.tenantId, tenantId)),
        db
          .select({ id: tenantCoefficients.tenantId })
          .from(tenantCoefficients)
          .where(eq(tenantCoefficients.tenantId, tenantId)),
      ]);
      const remaining = remainders.reduce((total, rows) => total + rows.length, 0);
      return { remainingRows: remaining, clean: remaining === 0 };
    },
  };
}
