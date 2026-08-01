/**
 * publish route tests の共通 runtime と Request builder。
 *
 * 認可は本物を通し、publish runtime だけを差し替える。各 test file が同じ
 * module singleton を使うよう、mock・route import・setup をこの 1 ファイルに集約する。
 */

import { ARCHIVE_LIMITS } from '@harness-hub/inspection';
import { afterEach, beforeEach } from 'vitest';

import { TENANT_HEADER, WORKSPACE_HEADER } from '../../../src/middleware/index.js';
import { TENANT_A, TENANT_B, WORKSPACE_A1 } from '../../auth-tenancy/support/in-memory-ports.js';
import {
  ADMIN_ID,
  ALLOWED_ORIGIN,
  adminUser,
  createTokenRouteHarness,
  issuePublisherToken,
  OWNER_ID,
  STRANGER_ID,
  sessionCookieFor,
  type TokenRouteHarness,
  testUser,
} from '../../auth-tenancy/support/token-route-runtime.js';
import { createPublishHarness, type PublishHarness } from './harness.js';
import { buildTestZip, buildValidPackage, VALID_MANIFEST } from './zip.js';

export { POST as promoteRoute } from '../../../src/app/api/v1/channels/[id]/promote/route.js';
export { POST as rollbackRoute } from '../../../src/app/api/v1/channels/[id]/rollback/route.js';
export { POST as deploymentRoute } from '../../../src/app/api/v1/projects/[id]/deployment/route.js';
export { GET as projectReleasesRoute } from '../../../src/app/api/v1/projects/[id]/releases/route.js';
export { POST as approveRoute } from '../../../src/app/api/v1/publish/[id]/approve/route.js';
export { POST as cancelRoute } from '../../../src/app/api/v1/publish/[id]/cancel/route.js';
export { PUT as packageRoute } from '../../../src/app/api/v1/publish/[id]/package/route.js';
export { GET as detailRoute } from '../../../src/app/api/v1/publish/[id]/route.js';
export { POST as submitRoute } from '../../../src/app/api/v1/publish/[id]/submit/route.js';
export { GET as listRoute, POST as createRoute } from '../../../src/app/api/v1/publish/route.js';
export { POST as suspendRoute } from '../../../src/app/api/v1/releases/[id]/suspend/route.js';

import {
  createFixedWindowRateLimiter,
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_REPLAY_HEADER,
  setPublishRateLimiterForTest,
  setPublishRuntimeForTest,
} from '../../../src/lib/publish/index.js';

const BASE = 'https://hub.example.com/api/v1';
/** 冪等鍵の下限は 8 文字 (`idempotencyKeySchema`)。短い鍵は 400 になるので使い回さない。 */
const IDEMPOTENCY_KEY = 'key-00000001';

interface CallOptions {
  /** 未指定なら workspace-admin の session。null なら資格情報を載せない。 */
  readonly cookie?: string | null;
  /** Bearer。指定すると cookie より優先される (`resolveRequestPrincipal` の順序)。 */
  readonly bearer?: string;
  /** テナント申告。null なら header を送らない。 */
  readonly tenantId?: string | null;
  /** Workspace 申告。null なら header を送らない。 */
  readonly workspaceId?: string | null;
  /** Origin。null なら送らない (state-changing では 403 になる)。 */
  readonly origin?: string | null;
  /** 変更系では必須。未指定なら既定値、null なら header を送らない。 */
  readonly idempotencyKey?: string | null;
  readonly json?: unknown;
  readonly body?: Uint8Array;
  readonly headers?: Readonly<Record<string, string>>;
}

export async function buildRequest(method: string, path: string, options: CallOptions = {}): Promise<Request> {
  const headers = new Headers(options.headers);

  if (options.bearer !== undefined) headers.set('authorization', `Bearer ${options.bearer}`);
  else {
    const cookie = options.cookie === undefined ? await sessionCookieFor(adminUser()) : options.cookie;
    if (cookie !== null) headers.set('cookie', cookie);
  }

  const tenantId = options.tenantId === undefined ? TENANT_A : options.tenantId;
  if (tenantId !== null) headers.set(TENANT_HEADER, tenantId);
  const workspaceId = options.workspaceId === undefined ? WORKSPACE_A1 : options.workspaceId;
  if (workspaceId !== null) headers.set(WORKSPACE_HEADER, workspaceId);
  const origin = options.origin === undefined ? ALLOWED_ORIGIN : options.origin;
  if (origin !== null) headers.set('origin', origin);

  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  const idempotencyKey =
    options.idempotencyKey === undefined ? (mutating ? IDEMPOTENCY_KEY : null) : options.idempotencyKey;
  if (idempotencyKey !== null) headers.set(IDEMPOTENCY_HEADER, idempotencyKey);

  let body: BodyInit | undefined;
  if (options.body !== undefined) body = new Blob([new Uint8Array(options.body)]);
  else if (options.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = typeof options.json === 'string' ? options.json : JSON.stringify(options.json);
  }
  return new Request(`${BASE}${path}`, { method, headers, ...(body === undefined ? {} : { body }) });
}

export function params<T>(value: T): { readonly params: Promise<T> } {
  return { params: Promise.resolve(value) };
}

export async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

export let auth: TokenRouteHarness;
export let publish: PublishHarness;

export async function ownerBearer(): Promise<string> {
  return (await issuePublisherToken(auth, OWNER_ID)).access_token;
}

beforeEach(() => {
  auth = createTokenRouteHarness();
  publish = createPublishHarness({ tenantId: TENANT_A, workspaceId: WORKSPACE_A1, actorId: ADMIN_ID });
  publish.putProject({ id: 'proj-1', ownerUserId: OWNER_ID });
  setPublishRuntimeForTest(publish.deps);
  setPublishRateLimiterForTest(null);
});

afterEach(() => {
  setPublishRuntimeForTest(null);
  setPublishRateLimiterForTest(null);
});

export {
  ADMIN_ID,
  ARCHIVE_LIMITS as PUBLISH_ARCHIVE_LIMITS,
  buildTestZip,
  buildValidPackage,
  createFixedWindowRateLimiter,
  createPublishHarness,
  IDEMPOTENCY_KEY,
  IDEMPOTENCY_REPLAY_HEADER,
  issuePublisherToken,
  OWNER_ID,
  STRANGER_ID,
  sessionCookieFor,
  setPublishRateLimiterForTest,
  TENANT_B,
  testUser,
  VALID_MANIFEST,
};
