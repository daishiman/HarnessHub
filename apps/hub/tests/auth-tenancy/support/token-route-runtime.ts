/**
 * token 系 route handler (`/api/v1/token/*` / `/api/v1/tokens/*` / `/api/auth/*`) の
 * テスト用 runtime。
 *
 * route は `authRuntime()` から本番結線 (Turso 接続) を取りに行くため、各テスト file が
 * `vi.mock` でここで組んだ in-memory runtime を差し込む。
 *
 * **差し替えるのは port だけ**。認可判定 (`withAuthz` / `decide`) と device flow の状態遷移は
 * 本物の実装を通す。ここをモックすると「200 が返ったこと」から意味が消える。
 */

import type { TokenResponse } from '@harness-hub/schemas';

import {
  type AuthRouteHandler,
  buildSessionClaims,
  createDeviceFlowService,
  type DirectoryUser,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from '../../../src/lib/auth/index.js';
// `authz/runtime.js` からではなく実体 module から取る (device-route-runtime.ts と同じ理由)。
import { createUnavailableOidcAdminService } from '../../../src/lib/auth/oidc-admin/index.js';
import { createRevocationChecker } from '../../../src/lib/authz/revocation.js';
import type { AuthRuntime } from '../../../src/lib/authz/runtime.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  directoryUser,
  oidcConnection,
  TENANT_A,
  type TestPorts,
  WORKSPACE_A1,
} from './in-memory-ports.js';

export const NOW = 1_800_000_000;
export const SESSION_SECRET = 'session-secret';
export const ACCESS_TOKEN_SECRET = 'access-secret';
/** `AUTH_ALLOWED_ORIGINS` 相当。state-changing 要求の Origin 検査で使う。 */
export const ALLOWED_ORIGIN = 'https://hub.example.com';
export const TENANT_SLUG = 'acme';

export const OWNER_ID = 'user-owner';
export const ADMIN_ID = 'user-admin';
export const STRANGER_ID = 'user-stranger';

/** 同一テナント・同一 Workspace に属する検査用の利用者。role だけを差し替えて使う。 */
export function testUser(id: string, overrides: Partial<DirectoryUser> = {}): DirectoryUser {
  return directoryUser({ id, tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1], ...overrides });
}

export const adminUser = () => testUser(ADMIN_ID, { role: 'workspace-admin' });

export interface TokenRouteHarness {
  readonly runtime: AuthRuntime;
  readonly ports: TestPorts;
  readonly audit: ReturnType<typeof createInMemoryAuditSink>;
}

export function createTokenRouteHarness(options: { readonly authRoute?: AuthRouteHandler } = {}): TokenRouteHarness {
  const ports = createTestPorts({
    users: [testUser(OWNER_ID), adminUser(), testUser(STRANGER_ID)],
    oidcConnections: [
      oidcConnection({
        tenantId: TENANT_A,
        tenantSlug: TENANT_SLUG,
        clientId: 'client-acme',
        displayName: 'Acme ID',
      }),
    ],
  });
  ports.clock.set(NOW);

  const sink = createInMemoryAuditSink();
  const audit = createAuditLogger({
    sink,
    now: () => new Date(ports.clock.nowSeconds() * 1000),
    newId: createSequentialIds('audit'),
  });

  return {
    ports,
    audit: sink,
    runtime: {
      ports,
      authz: {
        ports,
        audit,
        revocation: createRevocationChecker(ports.sessionRevocations, ports.clock),
        sessionSecret: SESSION_SECRET,
        accessTokenSecret: ACCESS_TOKEN_SECRET,
        allowedOrigins: [ALLOWED_ORIGIN],
      },
      deviceFlow: createDeviceFlowService({
        ports,
        audit,
        accessTokenSecret: ACCESS_TOKEN_SECRET,
        verificationUri: `${ALLOWED_ORIGIN}/device`,
        newId: createSequentialIds('rec'),
      }),
      // token 系 route は authRoute を使わない。誤って到達したら気付けるよう例外にしておく
      authRoute:
        options.authRoute ??
        (() => {
          throw new Error('この route は authRoute を使わないはず');
        }),
      // 同上。OIDC 接続管理は token 系 route の検査対象外
      oidcAdmin: createUnavailableOidcAdminService(),
    },
  };
}

/** device flow を一巡して publisher token を 1 本発行する。多くのテストがここから始まる。 */
export async function issuePublisherToken(
  harness: TokenRouteHarness,
  userId: string = OWNER_ID,
  workspaceId: string = WORKSPACE_A1,
): Promise<TokenResponse> {
  const issued = await harness.runtime.deviceFlow.requestCode({
    tenantId: TENANT_A,
    scope: ['publish:write'],
    deviceLabel: 'macbook',
  });
  const approval = await harness.runtime.deviceFlow.approve({
    tenantId: TENANT_A,
    userCode: issued.user_code,
    userId,
    workspaceId,
  });
  if (!approval.ok) throw new Error(`前提: 承認できるはず (${approval.reason})`);

  const exchanged = await harness.runtime.deviceFlow.exchangeToken({
    tenantId: TENANT_A,
    deviceCode: issued.device_code,
  });
  if (!exchanged.ok) throw new Error(`前提: 交換できるはず (${exchanged.error.error})`);
  return exchanged.value;
}

/** `Cookie` ヘッダ値。本物の署名鍵で署名するので、検証経路もそのまま通る。 */
export async function sessionCookieFor(user: DirectoryUser, nowSeconds: number = NOW): Promise<string> {
  const token = await signSessionToken(buildSessionClaims(user, nowSeconds), SESSION_SECRET);
  return `${SESSION_COOKIE_NAME}=${token}`;
}
