/**
 * feat-hearing-intake P13 production smoke の設定・HTTP・Device Flow helper。
 *
 * 資格情報は環境変数だけから読み、引数・ログ・成果物へ値を出さない。
 *
 * **CI へ新しい secret を足さないことが設計制約**である。その結果、経路が 2 系統に分かれる:
 *   - `POST /api/v1/sheets` の `sheets.create` は `credential: SESSION` なので、Google OIDC を
 *     持たない CI からは HTTP で駆動できない。提出は route と同じ server code
 *     (`createHearingIntakeService`) を本番 DB へ実行して再現する。
 *   - `aijob.pull` / `aijob.complete` は `credential: TOKEN` なので、Device Flow で得た
 *     **本物の access token** で本番 Worker の HTTP を通せる。token の真正性は本番が保証する。
 *   - Device Flow のうち承認 (`POST /api/v1/device/approve`) だけが session を要求する。そこは
 *     DB probe の CAS で代替し、code 発行と token 交換は本番 HTTP を通す。
 *
 * `withAuthz` は状態変更要求に対して `Origin` を最初に検査する (`isTrustedOrigin`)。
 * 許可されていない Origin は認可判定へ到達せず `untrusted_origin` で落ちるため、
 * 変更系の要求には必ず Origin を付ける。既定値は `HUB_PUBLIC_URL` の origin。
 */

import { randomBytes } from 'node:crypto';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** AI queue worker が要求する scope。`aijob.pull` / `aijob.complete` の requiredScope と同じ値。 */
const QUEUE_SCOPE = 'aijob:process';
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

const HELP = `Usage:
  pnpm --filter @harness-hub/hub run smoke:hearing-production

Required environment:
  HUB_PUBLIC_URL           production Hub origin (for example https://harness-hub.example.workers.dev)
  TURSO_DATABASE_URL       production libSQL URL
  TURSO_AUTH_TOKEN         production libSQL auth token

Optional environment:
  HUB_SMOKE_ORIGIN         Origin header value. default: origin of HUB_PUBLIC_URL.
                           Worker の AUTH_ALLOWED_ORIGINS に含まれない値だと
                           状態変更要求が untrusted_origin (403) で落ちる。

The command creates two disposable tenants and drives the real-data hearing E2E
(submit -> HS-xxxx -> pull -> complete -> S12 detail) plus the SEC8 checks
(cross-tenant pull isolation / claim-token binding on complete) against production.
Both tenants and every row they created are deleted before the process exits.
`;

interface AccessClaims {
  readonly sub: string;
  readonly tenant_id: string;
  readonly workspace_id: string;
  readonly token_id: string;
  readonly role: string;
  readonly scope: readonly string[];
  readonly exp: number;
}

interface ApiRequest {
  readonly method: string;
  readonly path: string;
  readonly expected: number | readonly number[];
  readonly json?: unknown;
  readonly token?: string;
  readonly tenantId?: string;
  readonly workspaceId?: string;
}

interface ApiResult {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

type ApiClient = (request: ApiRequest) => Promise<ApiResult>;

interface SmokeConfig {
  readonly baseUrl: string;
  readonly origin: string;
  readonly databaseUrl: string;
  readonly databaseToken: string;
  /** tenant slug / idp subject を 1 回の実行で共有するための接尾辞。 */
  readonly suffix: string;
}

interface DeviceGrant {
  readonly accessToken: string;
  readonly claims: AccessClaims;
}

/** device 認可の承認手段。session を持てない CI では DB probe の CAS が担う。 */
type DeviceApprover = (input: {
  readonly tenantId: string;
  readonly userCode: string;
  readonly userId: string;
  readonly workspaceId: string;
}) => Promise<boolean>;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} が必要です`);
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} が JSON object ではありません`);
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} が空です`);
  return value;
}

function expectNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} が数値ではありません`);
  return value;
}

/** 応答本文の `error` code（authz 拒否と RFC 6749 で共通の形）を拾う。 */
function errorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const value = (body as Record<string, unknown>).error;
  return typeof value === 'string' ? value : null;
}

function loadConfig(): SmokeConfig {
  const baseUrl = required('HUB_PUBLIC_URL').replace(/\/+$/, '');
  let derivedOrigin: string;
  try {
    derivedOrigin = new URL(baseUrl).origin;
  } catch {
    throw new Error(`HUB_PUBLIC_URL が URL として解釈できません (${baseUrl})`);
  }
  return {
    baseUrl,
    origin: process.env.HUB_SMOKE_ORIGIN?.trim() || derivedOrigin,
    databaseUrl: required('TURSO_DATABASE_URL'),
    databaseToken: required('TURSO_AUTH_TOKEN'),
    // tenant slug の値域 (`^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`) に収まる英数字だけで作る。
    suffix: `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`,
  };
}

function decodeAccessClaims(token: string, label: string): AccessClaims {
  const segments = token.split('.');
  if (segments.length !== 3) throw new Error(`${label} が JWT 形式ではありません`);
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(segments[1] ?? '', 'base64url').toString('utf8'));
  } catch {
    throw new Error(`${label} の claims を読めません`);
  }
  const row = expectObject(value, `${label} claims`);
  const scope = Array.isArray(row.scope) ? row.scope.filter((item): item is string => typeof item === 'string') : [];
  return {
    sub: expectString(row.sub, `${label}.sub`),
    tenant_id: expectString(row.tenant_id, `${label}.tenant_id`),
    workspace_id: expectString(row.workspace_id, `${label}.workspace_id`),
    token_id: expectString(row.token_id, `${label}.token_id`),
    role: expectString(row.role, `${label}.role`),
    scope,
    exp: expectNumber(row.exp, `${label}.exp`),
  };
}

function apiClient(config: SmokeConfig): ApiClient {
  return async (request: ApiRequest): Promise<ApiResult> => {
    const headers = new Headers();
    // 変更系は Origin 検査が認可判定より前にある。付けないと必ず untrusted_origin になる。
    if (MUTATING.has(request.method.toUpperCase())) headers.set('origin', config.origin);
    if (request.token !== undefined) headers.set('authorization', `Bearer ${request.token}`);
    if (request.tenantId !== undefined) headers.set('x-harness-tenant-id', request.tenantId);
    if (request.workspaceId !== undefined) headers.set('x-harness-workspace-id', request.workspaceId);

    let body: string | undefined;
    if (request.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(request.json);
    }
    const init: RequestInit =
      body === undefined ? { method: request.method, headers } : { method: request.method, headers, body };
    const response = await fetch(`${config.baseUrl}${request.path}`, init);

    const text = await response.text();
    let parsed: unknown = {};
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`${request.method} ${request.path}: JSON でない応答 (${response.status})`);
      }
    }

    const expected = Array.isArray(request.expected) ? request.expected : [request.expected as number];
    if (!expected.includes(response.status)) {
      const safeBody = JSON.stringify(parsed).slice(0, 800);
      // 設定不備 (Origin 未許可) は本番障害と紛らわしいので、切り分け手順を添える。
      const hint =
        errorCode(parsed) === 'untrusted_origin'
          ? ` / origin=${config.origin} が Worker の AUTH_ALLOWED_ORIGINS に含まれていない。HUB_SMOKE_ORIGIN で上書きできる`
          : '';
      throw new Error(
        `${request.method} ${request.path}: expected=${expected.join('|')} actual=${response.status} body=${safeBody}${hint}`,
      );
    }
    return { status: response.status, body: expectObject(parsed, `${request.method} ${request.path}`) };
  };
}

/**
 * Device Flow で本物の access token を 1 本得る。
 *
 * code 発行と token 交換は本番 Worker の public endpoint を通す。承認だけは session が要るため
 * `approve` (DB probe の CAS) に委譲する。CAS が false を返したら token を作らずに失敗させる —
 * 「承認できていないのに token が出た」状態を smoke が見逃さないため。
 */
async function acquireDeviceToken(
  api: ApiClient,
  approve: DeviceApprover,
  input: {
    readonly tenantSlug: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly userId: string;
    readonly label: string;
  },
): Promise<DeviceGrant> {
  const code = await api({
    method: 'POST',
    path: '/api/v1/device/code',
    expected: 200,
    json: { tenant_slug: input.tenantSlug, scope: [QUEUE_SCOPE], device_label: input.label },
  });
  const deviceCode = expectString(code.body.device_code, `${input.label} device_code`);
  const userCode = expectString(code.body.user_code, `${input.label} user_code`);

  const approved = await approve({
    tenantId: input.tenantId,
    userCode,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  assert(approved, `device 認可の承認 CAS に失敗しました (${input.label})`);

  const token = await api({
    method: 'POST',
    path: '/api/v1/device/token',
    expected: 200,
    json: { grant_type: DEVICE_GRANT_TYPE, device_code: deviceCode, tenant_slug: input.tenantSlug },
  });
  const accessToken = expectString(token.body.access_token, `${input.label} access_token`);
  const claims = decodeAccessClaims(accessToken, `${input.label} access token`);

  assert(token.body.token_type === 'Bearer', `${input.label}: token_type が Bearer ではありません`);
  assert(claims.scope.includes(QUEUE_SCOPE), `${input.label}: token に ${QUEUE_SCOPE} がありません`);
  assert(claims.tenant_id === input.tenantId, `${input.label}: token の tenant_id が承認先と一致しません`);
  assert(claims.workspace_id === input.workspaceId, `${input.label}: token の workspace_id が承認先と一致しません`);
  assert(claims.sub === input.userId, `${input.label}: token の sub が承認した利用者と一致しません`);
  return { accessToken, claims };
}

export type { AccessClaims, ApiClient, ApiRequest, ApiResult, DeviceApprover, DeviceGrant, SmokeConfig };
export {
  acquireDeviceToken,
  apiClient,
  assert,
  DEVICE_GRANT_TYPE,
  errorCode,
  expectNumber,
  expectObject,
  expectString,
  HELP,
  loadConfig,
  QUEUE_SCOPE,
};
