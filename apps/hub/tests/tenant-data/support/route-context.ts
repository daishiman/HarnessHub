/**
 * tenant-data route tests の共通 runtime と Request builder。
 * `publish-pipeline/support/route-context.ts` と同じ方針: 認可は本物を通し、tenant-data runtime
 * だけを差し替える。
 */

import { afterEach, beforeEach } from 'vitest';

import { TENANT_HEADER, WORKSPACE_HEADER } from '../../../src/middleware/index.js';
import { TENANT_A, TENANT_B, WORKSPACE_A1 } from '../../auth-tenancy/support/in-memory-ports.js';
import {
  ADMIN_ID,
  ALLOWED_ORIGIN,
  adminUser,
  createTokenRouteHarness,
  OWNER_ID,
  STRANGER_ID,
  sessionCookieFor,
  type TokenRouteHarness,
  testUser,
} from '../../auth-tenancy/support/token-route-runtime.js';
import { createTenantDataHarness, type TenantDataHarness } from './harness.js';

export { GET as contentRoute } from '../../../src/app/api/v1/tenant-data/objects/[id]/content/route.js';
export { DELETE as deleteRoute, GET as detailRoute } from '../../../src/app/api/v1/tenant-data/objects/[id]/route.js';
export { GET as listRoute, POST as uploadRoute } from '../../../src/app/api/v1/tenant-data/objects/route.js';

import { setTenantDataRateLimiterForTest, setTenantDataRuntimeForTest } from '../../../src/lib/tenant-data/index.js';

const BASE = 'https://hub.example.com/api/v1';

interface CallOptions {
  /** 未指定なら workspace-admin の session。null なら資格情報を載せない。 */
  readonly cookie?: string | null;
  readonly tenantId?: string | null;
  readonly workspaceId?: string | null;
  readonly origin?: string | null;
  readonly json?: unknown;
  readonly formData?: FormData;
  readonly headers?: Readonly<Record<string, string>>;
}

export async function buildRequest(method: string, path: string, options: CallOptions = {}): Promise<Request> {
  const headers = new Headers(options.headers);

  const cookie = options.cookie === undefined ? await sessionCookieFor(adminUser()) : options.cookie;
  if (cookie !== null) headers.set('cookie', cookie);

  const tenantId = options.tenantId === undefined ? TENANT_A : options.tenantId;
  if (tenantId !== null) headers.set(TENANT_HEADER, tenantId);
  const workspaceId = options.workspaceId === undefined ? WORKSPACE_A1 : options.workspaceId;
  if (workspaceId !== null) headers.set(WORKSPACE_HEADER, workspaceId);
  const origin = options.origin === undefined ? ALLOWED_ORIGIN : options.origin;
  if (origin !== null) headers.set('origin', origin);

  let body: BodyInit | undefined;
  if (options.formData !== undefined) body = options.formData;
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

export function uploadForm(input: {
  readonly workspaceId?: string;
  readonly kind?: string;
  readonly title?: string;
  readonly file?: File;
}): FormData {
  const form = new FormData();
  form.set('workspaceId', input.workspaceId ?? WORKSPACE_A1);
  form.set('kind', input.kind ?? 'knowledge_doc');
  form.set('title', input.title ?? 'title');
  form.set('file', input.file ?? new File([new Uint8Array([1, 2, 3])], 'doc.bin'));
  return form;
}

export let auth: TokenRouteHarness;
export let tenantData: TenantDataHarness;

beforeEach(() => {
  auth = createTokenRouteHarness();
  tenantData = createTenantDataHarness();
  setTenantDataRuntimeForTest(tenantData.runtime);
  setTenantDataRateLimiterForTest('upload', null);
  setTenantDataRateLimiterForTest('list', null);
  setTenantDataRateLimiterForTest('read', null);
  setTenantDataRateLimiterForTest('readContent', null);
  setTenantDataRateLimiterForTest('delete', null);
});

afterEach(() => {
  setTenantDataRuntimeForTest(null);
  setTenantDataRateLimiterForTest('upload', null);
  setTenantDataRateLimiterForTest('list', null);
  setTenantDataRateLimiterForTest('read', null);
  setTenantDataRateLimiterForTest('readContent', null);
  setTenantDataRateLimiterForTest('delete', null);
});

export {
  ADMIN_ID,
  createTenantDataHarness,
  OWNER_ID,
  STRANGER_ID,
  sessionCookieFor,
  setTenantDataRateLimiterForTest,
  TENANT_B,
  testUser,
  WORKSPACE_A1,
};
