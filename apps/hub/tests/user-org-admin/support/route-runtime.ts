/**
 * feat-user-org-admin の route acceptance test 用 harness。
 *
 * `apps/hub/tests/auth-tenancy/support/oidc-admin-runtime.ts` と同じ形: 実 DB (real-db.ts) の上に
 * `AuthRuntime` (authz 判定用) と `UserOrgAdminRuntime` (この feature の service/repository) を組み立て、
 * それぞれ `lib/authz/index.js` の `authRuntime()` と `features/user-org-admin/runtime.js` の
 * `userOrgAdminRuntime()` を差し替えるテストで使う。
 *
 * `AuthRuntime` の組み立ては `createAuthRuntime` (`lib/authz/runtime.ts`) をそのまま呼ぶ
 * (device flow / oidcAdmin を自前で再実装しない — この route 群はどちらも呼ばないが、
 * 独自の劣化版を harness に持つと本番の結線と乖離する)。
 */

import { createRepositoryContext } from '@harness-hub/db';
import { createUserOrgAdminRuntime, type UserOrgAdminRuntime } from '../../../src/features/user-org-admin/runtime.js';
import {
  buildSessionClaims,
  createDeviceFlowService,
  type DirectoryUser,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from '../../../src/lib/auth/index.js';
import { createUnavailableOidcAdminService } from '../../../src/lib/auth/oidc-admin/index.js';
import { createRevocationChecker } from '../../../src/lib/authz/revocation.js';
import type { AuthRuntime } from '../../../src/lib/authz/runtime.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../../src/shared/audit/index.js';
import type { NotificationDispatcher } from '../../../src/shared/notification/index.js';
import { createSequentialIds } from '../../auth-tenancy/support/in-memory-ports.js';
import { createRealDbHarness, type RealDbHarness, type SeededUser, seedUserOrgAdminTenant } from './real-db.js';

export const SESSION_SECRET = 'session-secret';
export const ACCESS_TOKEN_SECRET = 'access-secret';
export const ALLOWED_ORIGIN = 'https://hub.example.com';

export interface UserOrgAdminHarness {
  readonly authRuntime: AuthRuntime;
  readonly userOrgAdminRuntime: UserOrgAdminRuntime;
  readonly db: RealDbHarness;
  readonly audit: ReturnType<typeof createInMemoryAuditSink>;
  readonly tenantId: string;
  readonly providerAdmin: SeededUser;
  readonly workspaceAdmin: SeededUser;
  readonly member: SeededUser;
  close(): void;
}

export async function createUserOrgAdminHarness(
  options: { readonly dispatcher?: NotificationDispatcher } = {},
): Promise<UserOrgAdminHarness> {
  const db = await createRealDbHarness();
  const audit = createInMemoryAuditSink();
  const auditLogger = createAuditLogger({ sink: audit, newId: createSequentialIds('audit') });
  const seeded = await seedUserOrgAdminTenant(db, { slug: 'acme', name: 'Acme' });

  const authRuntime: AuthRuntime = {
    ports: db.ports,
    authz: {
      ports: db.ports,
      audit: auditLogger,
      revocation: createRevocationChecker(db.ports.sessionRevocations, db.ports.clock),
      sessionSecret: SESSION_SECRET,
      accessTokenSecret: ACCESS_TOKEN_SECRET,
      allowedOrigins: [ALLOWED_ORIGIN],
    },
    deviceFlow: createDeviceFlowService({
      ports: db.ports,
      audit: auditLogger,
      accessTokenSecret: ACCESS_TOKEN_SECRET,
      verificationUri: `${ALLOWED_ORIGIN}/device`,
      newId: createSequentialIds('rec'),
    }),
    authRoute: async () => {
      throw new Error('user-org-admin route から authRoute は呼ばれない');
    },
    oidcAdmin: createUnavailableOidcAdminService(),
  };

  const userOrgAdminRuntime = createUserOrgAdminRuntime(
    { users: db.repositories.users, userSettings: db.repositories.userSettings, audit: db.repositories.audit },
    db.hearingIntake,
    options.dispatcher,
  );

  return {
    authRuntime,
    userOrgAdminRuntime,
    db,
    audit,
    tenantId: seeded.tenantId,
    providerAdmin: seeded.providerAdmin,
    workspaceAdmin: seeded.workspaceAdmin,
    member: seeded.member,
    close: () => db.close(),
  };
}

export function directoryUserFor(user: SeededUser): DirectoryUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    idpSubject: `idp-${user.email}`,
    name: '',
    email: user.email,
    role: user.role,
    status: 'active',
    workspaceIds: [],
  };
}

export async function sessionCookieFor(user: SeededUser, nowSeconds: number): Promise<string> {
  const token = await signSessionToken(buildSessionClaims(directoryUserFor(user), nowSeconds), SESSION_SECRET);
  return `${SESSION_COOKIE_NAME}=${token}`;
}

/** repository を直接読むときの context。 */
export function contextFor(tenantId: string, actorId?: string) {
  return createRepositoryContext({ tenantId, actorId });
}
