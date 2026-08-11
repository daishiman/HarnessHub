/**
 * production smoke 共用の DB probe (発端は feat-hearing-intake P13、現在は
 * feedback-loop / docs-cms の本番 smoke も同じ fixture・後始末を使う)。
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

import { and, eq, lte, or } from 'drizzle-orm';

import { builds } from '../schema/builds/schema';
import { idpConnections, tenants, users, userWorkspaces, workspaces } from '../schema/core/identity';
import { deviceAuthorizations, publisherTokens } from '../schema/core/publish';
import { auditEvents } from '../schema/core/security';
import { smokeFixtureLeases } from '../schema/core/smoke';
import { documents } from '../schema/docs-cms/schema';
import { feedbacks } from '../schema/feedback-loop/schema';
import { aiJobs, displayCodeCounters, hearingSheets, tenantCoefficients } from '../schema/hearing-intake/schema';
import { isTransactionalAdapter } from '../src/adapter';
import { RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter, CoreDb } from './db';
import { normalizeSmokeRunId, type SmokeFixtureLifecycle, type SmokeTenantSweepCandidate } from './smoke-lifecycle';
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
  /**
   * provider-admin 役。`providerAdminIdpSubject` を渡したときだけ作られる (既定は null)。
   * route 層 (`withAuthz`) は provider-admin の越境を許して監査する契約になっているため、
   * その契約が edge middleware 込みの本番でも成立するのかを実測するために要る (HarnessHub-p0lr)。
   */
  readonly providerAdminUserId: string | null;
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
    /** 渡したときだけ provider-admin を 1 名作る。既定では作らない (最小権限の fixture を保つ)。 */
    readonly providerAdminIdpSubject?: string;
    /** tenant と同じ transaction で専用 lease 台帳へ登録する。production fixture は省略不可。 */
    readonly lifecycle: SmokeFixtureLifecycle;
  }): Promise<HearingSmokeTenantFixture>;
  /**
   * 専用 lease 台帳を持つ使い捨て tenant のうち、いま回収してよいものを列挙する。
   *
   * `finally` が完走しない中断 (cancel-in-progress / runner 強制終了) の後でも、これだけが
   * 残骸を一意に特定する経路になる。lease が無い tenant は候補にしない。期限内でも
   * `runId` 一致なら候補にするので、自分の run の後始末は待たずに行える。
   */
  listSweepableTenants(input: {
    readonly now: number;
    readonly runId?: string;
  }): Promise<readonly SmokeTenantSweepCandidate[]>;
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
  /**
   * 対象 tenant / workspace / actor / requested action に一致する、許可済み
   * `provider.cross_tenant_access` 監査の件数。
   *
   * 総件数だけでは過去runの行を今回の証拠と誤認できる。S8はこの絞り込みで実行前後を数え、
   * 1要求につきdelta=1を要求する。HTTP statusだけではedge通過と監査永続化を同時に証明できない。
   */
  countCrossTenantAuditEvents(input: {
    readonly tenantId: string;
    readonly actorId: string;
    readonly workspaceId: string;
    readonly requestedAction: string;
  }): Promise<number>;
  findSheet(context: RepositoryContext, sheetId: string): Promise<HearingSmokeSheetSnapshot | null>;
  findJob(context: RepositoryContext, jobId: string): Promise<HearingSmokeJobSnapshot | null>;
  /** 本 smoke が本番へ残した行を全て消す。残数を返し、0 でなければ呼び出し側が失敗にする。 */
  cleanupTenant(tenantId: string): Promise<{ readonly remainingRows: number; readonly clean: boolean }>;
}

const SMOKE_ISSUER_PREFIX = 'https://hearing-smoke.invalid/';
// OIDC には使わない fixture だが、日次 export/restore の暗号断面検査を壊さないよう
// 保存形式だけは本物と同じ `{version}:{iv}:{ciphertext}:{tag}` にする。固定値なので資格情報ではない。
const SMOKE_NON_CREDENTIAL_CIPHERTEXT = '1:AAAAAAAAAAAAAAAA:AA==:AAAAAAAAAAAAAAAAAAAAAA==';

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
      const providerAdminUserId = input.providerAdminIdpSubject === undefined ? null : newUlid(now);

      // 途中の INSERT が失敗しても tenantId が呼び出し側へ返る前なので、finally の cleanup には
      // 渡せない。fixture 全体を 1 transaction にし、半端な本番データを原理的に残さない。
      await guardedWrite(adapter, () =>
        transactional(adapter).transaction(async (tx) => {
          const txDb = tx.client as CoreDb;
          await txDb.insert(tenants).values({
            id: tenantId,
            slug: input.slug,
            // 表示名は人間向けのまま保つ。物理削除 authority は下の専用 lease 行だけ。
            name: 'P13 hearing smoke',
            plan: 'free',
            status: 'active',
            createdAt: now,
          });
          await txDb.insert(smokeFixtureLeases).values({
            tenantId,
            runId: normalizeSmokeRunId(input.lifecycle.runId),
            kind: input.lifecycle.kind,
            expiresAt: input.lifecycle.expiresAt,
            createdAt: now,
          });
          await txDb.insert(idpConnections).values({
            id: newUlid(now),
            tenantId,
            // 実在しない issuer / client を入れる。Device Flow は tenant 解決にしか使わず、
            // OIDC 認可要求はこの値では成立しないため、cleanup 前に外部から悪用できない。
            issuerUrl: `${SMOKE_ISSUER_PREFIX}${input.slug}`,
            clientId: `hearing-smoke-${input.slug}`,
            clientSecretEnc: SMOKE_NON_CREDENTIAL_CIPHERTEXT,
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
          if (providerAdminUserId !== null && input.providerAdminIdpSubject !== undefined) {
            await txDb.insert(users).values({
              id: providerAdminUserId,
              tenantId,
              idpSubject: input.providerAdminIdpSubject,
              email: `${input.providerAdminIdpSubject}@hearing-smoke.invalid`,
              name: 'P13 smoke provider admin',
              department: 'smoke',
              salary: null,
              role: 'provider-admin',
              status: 'active',
              lastLoginAt: null,
              createdAt: now,
            });
          }
          await txDb
            .insert(userWorkspaces)
            .values([
              { tenantId, userId: memberUserId, workspaceId, createdAt: now },
              { tenantId, userId: workerUserId, workspaceId, createdAt: now },
              ...(providerAdminUserId === null
                ? []
                : [{ tenantId, userId: providerAdminUserId, workspaceId, createdAt: now }]),
            ]);
        }),
      );

      return { tenantId, tenantSlug: input.slug, workspaceId, memberUserId, workerUserId, providerAdminUserId };
    },

    async listSweepableTenants(input) {
      if (!Number.isSafeInteger(input.now) || input.now < 0) {
        throw new RepositoryError('invalid-context', `smoke fixture sweep の now が不正です (${input.now})`);
      }
      const runId = input.runId === undefined ? undefined : normalizeSmokeRunId(input.runId);
      // inner join が重要。tenant の名前・slug が smoke らしく見えても、専用 lease が無ければ
      // 物理削除候補にはならない。期限切れか同一 run だけを DB 述語で絞る。
      const rows = await db
        .select({
          tenantId: smokeFixtureLeases.tenantId,
          slug: tenants.slug,
          runId: smokeFixtureLeases.runId,
          kind: smokeFixtureLeases.kind,
          expiresAt: smokeFixtureLeases.expiresAt,
        })
        .from(smokeFixtureLeases)
        .innerJoin(tenants, eq(tenants.id, smokeFixtureLeases.tenantId))
        .where(
          runId === undefined
            ? lte(smokeFixtureLeases.expiresAt, input.now)
            : or(lte(smokeFixtureLeases.expiresAt, input.now), eq(smokeFixtureLeases.runId, runId)),
        );
      const candidates = rows as SmokeTenantSweepCandidate[];
      // 古い残骸から消す。途中で打ち切られても、より長く残っている行が先に片付く。
      return candidates.sort((left, right) => left.expiresAt - right.expiresAt);
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

    async countCrossTenantAuditEvents(input) {
      const rows = await db
        .select({ id: auditEvents.id, summaryJson: auditEvents.summaryJson })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.tenantId, input.tenantId),
            eq(auditEvents.workspaceId, input.workspaceId),
            eq(auditEvents.actorId, input.actorId),
            eq(auditEvents.action, 'provider.cross_tenant_access'),
          ),
        );
      return rows.filter((row) => {
        try {
          const summary = JSON.parse(row.summaryJson) as Record<string, unknown>;
          return summary.requested_action === input.requestedAction && summary.allowed === true;
        } catch {
          // 壊れた summary を「条件に合う監査」として数えない。smoke 側の delta=1 が失敗して可視化する。
          return false;
        }
      }).length;
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
          const [lease] = await txDb
            .select({ tenantId: smokeFixtureLeases.tenantId })
            .from(smokeFixtureLeases)
            .where(eq(smokeFixtureLeases.tenantId, tenantId))
            .limit(1);
          if (lease === undefined) {
            const [tenant] = await txDb
              .select({ id: tenants.id })
              .from(tenants)
              .where(eq(tenants.id, tenantId))
              .limit(1);
            // 既に前回の同一 transaction が完了していた場合だけ冪等 success。実在 tenant に
            // lease が無ければ通常データなので、1 行も消す前に fail-closed で拒否する。
            if (tenant === undefined) return;
            throw new RepositoryError(
              'invalid-context',
              `tenant ${tenantId} は smoke fixture lease を持たないため物理削除できません`,
            );
          }
          await txDb.delete(aiJobs).where(eq(aiJobs.tenantId, tenantId));
          await txDb.delete(hearingSheets).where(eq(hearingSheets.tenantId, tenantId));
          // feedback-loop / docs-cms を smoke が触るようになったので後始末対象へ含める
          // (HarnessHub-p0lr)。builds は現状 route から書かれないが、`builds_feedback_id_uq` が
          // feedback 行を参照する設計なので、後から書き込みが繋がったときに取りこぼさないよう
          // feedbacks より先に消す。documents は workspace を持たない tenant 単位資源。
          await txDb.delete(builds).where(eq(builds.tenantId, tenantId));
          await txDb.delete(feedbacks).where(eq(feedbacks.tenantId, tenantId));
          await txDb.delete(documents).where(eq(documents.tenantId, tenantId));
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
          // tenant を含む全 identity 行が消えたあと、最後に authority を消す。transaction 途中で
          // 失敗すれば lease も tenant も残るため、次の sweeper が同じ tenant を再試行できる。
          await txDb.delete(smokeFixtureLeases).where(eq(smokeFixtureLeases.tenantId, tenantId));
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
        db.select({ id: feedbacks.id }).from(feedbacks).where(eq(feedbacks.tenantId, tenantId)),
        db.select({ id: documents.id }).from(documents).where(eq(documents.tenantId, tenantId)),
        db.select({ id: builds.id }).from(builds).where(eq(builds.tenantId, tenantId)),
        db
          .select({ id: smokeFixtureLeases.tenantId })
          .from(smokeFixtureLeases)
          .where(eq(smokeFixtureLeases.tenantId, tenantId)),
      ]);
      const remaining = remainders.reduce((total, rows) => total + rows.length, 0);
      return { remainingRows: remaining, clean: remaining === 0 };
    },
  };
}
