/**
 * OIDC 接続管理 route (`/api/v1/admin/oidc-connections/*`) のテスト用 harness
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * **実 DB (libSQL) を使う**。この feature が守っている性質のほとんどが永続化側にしか無いため:
 *   - `UPDATE ... WHERE pending_client_secret_enc = ? RETURNING` による CAS
 *   - 封筒暗号化 (KEK/DEK) を通した保存と復号
 *   - `WHERE tenant_id = ?` によるテナント境界
 * in-memory ダブルへ置き換えると、これらが全部「そう書いたつもり」になる。
 *
 * Google への接続テストだけは差し替える (`programmableConnectionTester`)。
 * 外部 IdP へ実際に出る通信はテストの前提にできないうえ、
 * 「合格/不合格を任意に作れる」ことが rotation の失敗系検査に必要。
 */

import { createRepositoryContext } from '@harness-hub/db';

import {
  buildSessionClaims,
  createDeviceFlowService,
  type DirectoryUser,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from '../../../src/lib/auth/index.js';
import {
  createOidcAdminService,
  type OidcConnectionTester,
  type OidcConnectionTestInput,
  type OidcConnectionTestOutcome,
} from '../../../src/lib/auth/oidc-admin/index.js';
import { GOOGLE_OIDC_ISSUER } from '../../../src/lib/auth/shared-credentials.js';
import { createRevocationChecker } from '../../../src/lib/authz/revocation.js';
import type { AuthRuntime } from '../../../src/lib/authz/runtime.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../../src/shared/audit/index.js';
import { createSequentialIds, directoryUser } from './in-memory-ports.js';
import { createRealDbHarness, type RealDbHarness, type SeededTenant, seedTenant } from './real-db.js';

export const SESSION_SECRET = 'session-secret';
export const ACCESS_TOKEN_SECRET = 'access-secret';
export const ALLOWED_ORIGIN = 'https://hub.example.com';
export const CANONICAL_ORIGIN = ALLOWED_ORIGIN;

/**
 * fixture の credential。**24 文字未満**に抑えてある。
 * secret scan の `generic-assigned-secret` は `secret = "…"` 形の 24 文字以上を拾うので、
 * テスト fixture でゲートを鳴らさないため (抑制マーカーで黙らせるとゲート自体が形骸化する)。
 */
export const SEED_SECRET = 'goog-seed-0001';
export const NEW_SECRET = 'goog-rotated-0002';

/** 接続テスターの差し替え実体。呼ばれた入力を記録し、戻り値をテストから決められる。 */
export interface ProgrammableTester {
  readonly tester: OidcConnectionTester;
  /** 呼ばれた入力の記録。復号済み secret がどれだったかを突き合わせるために保持する。 */
  readonly calls: readonly OidcConnectionTestInput[];
  /** 次回以降の結果を差し替える。 */
  setOutcome(outcome: OidcConnectionTestOutcome): void;
  /**
   * テスト実行「中」に走らせる副作用を登録する (1 回だけ発火)。
   *
   * CAS 競合の検査に要る。service は `テスト → 読んだ暗号文を expected にして CAS` の順で動くので、
   * その隙間に別の更新を差し込めるのはこの位置だけ。テストの外から `setTimeout` などで
   * 割り込もうとすると、成立するかどうかがスケジューラ任せの不安定な検査になる。
   */
  setOnCall(effect: () => Promise<void>): void;
}

export function programmableConnectionTester(
  initial: OidcConnectionTestOutcome = { passed: true },
): ProgrammableTester {
  const calls: OidcConnectionTestInput[] = [];
  let outcome = initial;
  let onCall: (() => Promise<void>) | null = null;
  return {
    calls,
    setOutcome(next) {
      outcome = next;
    },
    setOnCall(effect) {
      onCall = effect;
    },
    tester: async (input) => {
      calls.push(input);
      if (onCall !== null) {
        const effect = onCall;
        onCall = null;
        await effect();
      }
      return outcome;
    },
  };
}

export interface OidcAdminHarness {
  readonly runtime: AuthRuntime;
  readonly db: RealDbHarness;
  readonly audit: ReturnType<typeof createInMemoryAuditSink>;
  readonly tester: ProgrammableTester;
  /** 顧客持ち込み方式の接続を 1 件持つテナント。 */
  readonly tenantA: SeededTenant;
  /** 越境検査用のテナント。A とは別の接続を持つ。 */
  readonly tenantB: SeededTenant;
  /**
   * **接続を 1 件も持たない**テナント。初回登録の検査用。
   *
   * `idp_connections_tenant_issuer_uq` により (tenant_id, issuer_url) は一意なので、
   * 既に Google 接続を持つ A/B に対する登録は「行の新規作成」ではなく
   * 「既存 1 行への staging」になる。初回登録の経路を通すにはこのテナントが要る。
   */
  readonly tenantFresh: { readonly tenantId: string; readonly tenantSlug: string };
  close(): void;
}

export async function createOidcAdminHarness(): Promise<OidcAdminHarness> {
  const db = await createRealDbHarness();
  const sink = createInMemoryAuditSink();
  const audit = createAuditLogger({ sink, newId: createSequentialIds('audit') });
  const tester = programmableConnectionTester();

  const tenantA = await seedTenant(db, {
    slug: 'acme',
    name: 'Acme',
    issuer: GOOGLE_OIDC_ISSUER,
    clientSecret: SEED_SECRET,
  });
  const tenantB = await seedTenant(db, {
    slug: 'globex',
    name: 'Globex',
    issuer: GOOGLE_OIDC_ISSUER,
    clientSecret: SEED_SECRET,
  });
  // `seedTenant` は必ず接続を 1 件入れるので、初回登録用は tenants だけ直接作る
  const freshTenant = await db.repositories.tenants.create({ slug: 'initech', name: 'Initech', plan: 'standard' });

  const runtime: AuthRuntime = {
    ports: db.ports,
    authz: {
      ports: db.ports,
      audit,
      revocation: createRevocationChecker(db.ports.sessionRevocations, db.ports.clock),
      sessionSecret: SESSION_SECRET,
      accessTokenSecret: ACCESS_TOKEN_SECRET,
      allowedOrigins: [ALLOWED_ORIGIN],
    },
    deviceFlow: createDeviceFlowService({
      ports: db.ports,
      audit,
      accessTokenSecret: ACCESS_TOKEN_SECRET,
      verificationUri: `${ALLOWED_ORIGIN}/device`,
      newId: createSequentialIds('rec'),
    }),
    authRoute: async () => {
      throw new Error('OIDC 管理 route から authRoute は呼ばれない');
    },
    oidcAdmin: createOidcAdminService({
      repositories: db.repositories,
      audit,
      canonicalOrigin: CANONICAL_ORIGIN,
      testConnection: tester.tester,
    }),
  };

  return {
    runtime,
    db,
    audit: sink,
    tester,
    tenantA,
    tenantB,
    tenantFresh: { tenantId: freshTenant.id, tenantSlug: freshTenant.slug },
    close: () => db.close(),
  };
}

/** 対象テナントの唯一の接続 id。seed が 1 件だけ入れているので、それを掴む。 */
export async function seededConnectionId(harness: OidcAdminHarness, tenantId: string): Promise<string> {
  const rows = await harness.db.repositories.idpConnections.list(createRepositoryContext({ tenantId }));
  const id = rows[0]?.id;
  if (id === undefined) throw new Error(`前提: テナント ${tenantId} に接続が 1 件あるはず`);
  return id;
}

export const providerAdmin = (tenantId: string): DirectoryUser =>
  directoryUser({ id: 'user-provider-admin', tenantId, role: 'provider-admin' });

export const workspaceAdmin = (tenantId: string): DirectoryUser =>
  directoryUser({ id: 'user-workspace-admin', tenantId, role: 'workspace-admin' });

export const member = (tenantId: string): DirectoryUser => directoryUser({ id: 'user-member', tenantId });

export async function sessionCookieFor(user: DirectoryUser, nowSeconds: number): Promise<string> {
  const token = await signSessionToken(buildSessionClaims(user, nowSeconds), SESSION_SECRET);
  return `${SESSION_COOKIE_NAME}=${token}`;
}
