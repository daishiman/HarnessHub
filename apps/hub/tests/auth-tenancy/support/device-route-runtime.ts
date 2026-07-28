/**
 * device 系 route handler (`/api/v1/device/{code,approve,token}`) のテスト用 harness。
 *
 * route は合成点 `authRuntime()` 越しにしか依存を取らないので、テストは **その 1 点だけ**を
 * in-memory の `AuthRuntime` へ差し替える。DeviceFlowService は本物を組み立てるため、
 * pending → approved → consumed の状態遷移は本番と同じコードを通る
 * (ここを stub にすると「route が status を正しく写しているか」しか見られなくなる)。
 */

import { SESSION_COOKIE_NAME } from '../../../src/lib/auth/config.js';
import { createDeviceFlowService } from '../../../src/lib/auth/device-flow/service.js';
import type { DirectoryUser } from '../../../src/lib/auth/index.js';
import { buildSessionClaims, signSessionToken } from '../../../src/lib/auth/index.js';
import type { AuthRuntime } from '../../../src/lib/authz/runtime.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  directoryUser,
  TENANT_A,
  type TestPorts,
  WORKSPACE_A1,
} from './in-memory-ports.js';

export const NOW = 1_800_000_000;
export const USER_ID = 'user-approver';
export const TENANT_SLUG = 'acme';
export const ALLOWED_ORIGIN = 'https://hub.example.com';
export const VERIFICATION_URI = 'https://hub.example.com/device';
export const SESSION_SECRET = 'session-secret';
export const ACCESS_TOKEN_SECRET = 'access-secret';
/** device_code の TTL (10 分)。仕様書のリテラルを書く (実装定数を参照しない)。 */
export const DEVICE_CODE_TTL_SECONDS = 600;
/** user_code の試行上限。ここに達した認可は `denied` へ落ちる。 */
export const USER_CODE_MAX_ATTEMPTS = 5;

export interface DeviceRouteHarness {
  readonly runtime: AuthRuntime;
  readonly ports: TestPorts;
  readonly sink: ReturnType<typeof createInMemoryAuditSink>;
}

export function createDeviceRouteHarness(): DeviceRouteHarness {
  const ports = createTestPorts({
    users: [directoryUser({ id: USER_ID, tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1] })],
    oidcConnections: [
      {
        tenantId: TENANT_A,
        tenantSlug: TENANT_SLUG,
        issuer: 'https://idp.example.com',
        clientId: 'client-a',
        displayName: 'Acme IdP',
        enabled: true,
      },
    ],
  });
  ports.clock.set(NOW);

  const sink = createInMemoryAuditSink();
  const audit = createAuditLogger({
    sink,
    now: () => new Date(ports.clock.nowSeconds() * 1000),
    newId: createSequentialIds('audit'),
  });

  const runtime: AuthRuntime = {
    ports,
    authz: {
      ports,
      audit,
      revocation: { isRevoked: async () => false },
      sessionSecret: SESSION_SECRET,
      accessTokenSecret: ACCESS_TOKEN_SECRET,
      allowedOrigins: [ALLOWED_ORIGIN],
    },
    deviceFlow: createDeviceFlowService({
      ports,
      audit,
      accessTokenSecret: ACCESS_TOKEN_SECRET,
      verificationUri: VERIFICATION_URI,
      newId: createSequentialIds('rec'),
    }),
    // device 系 route は OIDC の route handler を使わない。誤って結線したら気付けるよう落とす
    authRoute: async () => {
      throw new Error('device route から authRoute は呼ばれない');
    },
  };

  return { runtime, ports, sink };
}

/** `Cookie` ヘッダ値。session token の署名は本物を使う (検証が通ることの意味を残すため)。 */
export async function sessionCookieHeader(user: DirectoryUser, nowSeconds = NOW): Promise<string> {
  const token = await signSessionToken(buildSessionClaims(user, nowSeconds), SESSION_SECRET);
  return `${SESSION_COOKIE_NAME}=${token}`;
}

/** JSON body の POST 要求。body は既に直列化済みの文字列として渡す (壊れた JSON も送れるようにする)。 */
export function postRequest(url: string, serializedBody: string, headers: HeadersInit = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...Object.fromEntries(new Headers(headers)) },
    body: serializedBody,
  });
}
