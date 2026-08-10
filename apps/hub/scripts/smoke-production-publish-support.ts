/**
 * feat-publish-pipeline P13 production smoke の設定・ZIP・HTTP/R2 helper。
 *
 * 必要な資格情報は環境変数だけから読み、引数・ログ・成果物へ値を出さない。
 * disposable Tenant/Project/TargetChannel と Green/secret ZIP を自動生成し、API・Turso・R2・
 * audit hash chain を横断して fail-closed に検査する。作った行は finally で全て消す。
 *
 * **CI へ新しい secret を足さないことが設計制約**である (HarnessHub-pf5o)。
 * 以前は長命の `PUBLISH_ACCESS_TOKEN` を前提にしていたため、台帳に無い secret を要求する
 * = CI から一度も動かせない runner になっていた。publish は本 Hub で最も権限の強い操作
 * (`minRole: owner` + `publish:write`) なので、その token を CI へ常置するのが最も危険でもある。
 * hearing / coverage smoke が確立した無人 Device Flow に揃え、**実行のたびに使い捨て tenant を作り、
 * 本番 Worker が署名した短命 access token を取り直す**。承認 (`POST /api/v1/device/approve`) だけが
 * session を要求するので、そこは DB probe の CAS が代行する。
 *
 * `withAuthz` は状態変更要求に対して `Origin` を最初に検査する。許可されていない Origin は
 * 認可判定へ到達せず `untrusted_origin` で落ちるため、変更系には必ず Origin を付ける。
 */

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DeviceGrant } from './smoke-production-hearing-support.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const DEFAULT_R2_BUCKET = 'harness-hub-packages';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** publish 系 action (`publish.write` / `channel.promote` など) が要求する scope。 */
const PUBLISH_SCOPE = 'publish:write';

const HELP = `Usage:
  pnpm --filter @harness-hub/hub run smoke:publish-production

Required environment:
  HUB_PUBLIC_URL           production Hub origin (for example https://harness-hub.example.workers.dev)
  TURSO_DATABASE_URL       production libSQL URL
  TURSO_AUTH_TOKEN         production libSQL auth token
  CLOUDFLARE_API_TOKEN     Wrangler R2 read token (not printed)

Optional environment:
  PUBLISH_R2_BUCKET        default: ${DEFAULT_R2_BUCKET}
  HUB_SMOKE_ORIGIN         Origin header value. default: origin of HUB_PUBLIC_URL.

The command creates a disposable tenant, obtains a short-lived ${PUBLISH_SCOPE} access token
through the production Device Flow, and generates its own Project/TargetChannel and ZIP fixtures.
It verifies S1-S6, 409 serialization, R2 SHA-256, audit chain, and cleanup.
`;

interface ApiResult {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

interface SmokeConfig {
  readonly baseUrl: string;
  readonly origin: string;
  readonly databaseUrl: string;
  readonly databaseToken: string;
  readonly r2Bucket: string;
  /** tenant slug / idp subject を 1 回の実行で共有するための接尾辞。 */
  readonly suffix: string;
}

interface CleanupResult {
  readonly remainingRows: number;
  readonly clean: boolean;
}

interface TenantCleanupOutcome {
  readonly remainingRows: Readonly<Record<string, number>>;
  readonly errors: readonly string[];
  readonly identityAttempted: boolean;
}

interface ZipEntry {
  readonly path: string;
  readonly content: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} が必要です`);
  return value;
}

function loadConfig(): SmokeConfig {
  const baseUrl = required('HUB_PUBLIC_URL').replace(/\/+$/, '');
  let derivedOrigin: string;
  try {
    derivedOrigin = new URL(baseUrl).origin;
  } catch {
    throw new Error(`HUB_PUBLIC_URL が URL として解釈できません (${baseUrl})`);
  }
  required('CLOUDFLARE_API_TOKEN');
  return {
    baseUrl,
    origin: process.env.HUB_SMOKE_ORIGIN?.trim() || derivedOrigin,
    databaseUrl: required('TURSO_DATABASE_URL'),
    databaseToken: required('TURSO_AUTH_TOKEN'),
    r2Bucket: process.env.PUBLISH_R2_BUCKET?.trim() || DEFAULT_R2_BUCKET,
    // tenant slug の値域 (`^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`) に収まる英数字だけで作る。
    suffix: `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`,
  };
}

function smokeId(kind: string): string {
  return `smoke_${kind}_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

/** packages/inspection の展開経路が受理する stored ZIP を fixture file 無しで作る。 */
function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.content);
    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, data.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    local.set(data, 30 + name.byteLength);
    locals.push(local);

    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(38, 0o100644 << 16, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.byteLength;
  }

  const directory = concat(centrals);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directory.byteLength, true);
  endView.setUint32(16, offset, true);
  return concat([...locals, directory, end]);
}

function greenZip(version: string): Uint8Array {
  return buildZip([
    {
      path: 'plugin.json',
      content: JSON.stringify({
        name: `production-smoke-${version}`,
        version,
        description: 'P13 production smoke fixture',
        owner: 'harness-hub-smoke',
        visibility: 'workspace',
        summary: 'Disposable production smoke package',
      }),
    },
    { path: 'skills/smoke/SKILL.md', content: `# smoke ${version}\n\nproduction smoke fixture\n` },
  ]);
}

function secretZip(): Uint8Array {
  // リポジトリ自体の secret scan は通し、生成した ZIP の中だけで検知対象を作る。
  const syntheticAwsAccessKeyId = ['AKIA', '0123456789ABCDEF'].join('');
  return buildZip([
    {
      path: 'plugin.json',
      content: JSON.stringify({
        name: 'production-smoke-secret',
        version: '1.0.0',
        description: 'P13 rejection fixture',
        owner: 'harness-hub-smoke',
        visibility: 'workspace',
        summary: 'Must be rejected by secret scan',
      }),
    },
    { path: 'skills/smoke/SKILL.md', content: `# reject\n\nAWS_ACCESS_KEY_ID=${syntheticAwsAccessKeyId}\n` },
  ]);
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/**
 * publish 領域を消し切った tenant だけ identity 領域を削除する。
 *
 * tenant を先に消すと、残った publish 行の所属を辿れず復旧しにくくなる。そのため
 * publish cleanup の throw と `clean: false` はどちらも identity cleanup を遮断する。
 */
async function cleanupPublishThenIdentity(
  tenantId: string,
  cleanupPublish: () => Promise<CleanupResult>,
  cleanupIdentity: () => Promise<CleanupResult>,
): Promise<TenantCleanupOutcome> {
  const remainingRows: Record<string, number> = {};
  const errors: string[] = [];

  let publishClean = false;
  try {
    const result = await cleanupPublish();
    remainingRows[`${tenantId}:publish`] = result.remainingRows;
    publishClean = result.clean;
    if (!result.clean) errors.push(`tenant ${tenantId} (publish): ${result.remainingRows} 行が残りました`);
  } catch (error) {
    errors.push(`tenant ${tenantId} (publish): ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!publishClean) return { remainingRows, errors, identityAttempted: false };

  try {
    const result = await cleanupIdentity();
    remainingRows[`${tenantId}:identity`] = result.remainingRows;
    if (!result.clean) errors.push(`tenant ${tenantId} (identity): ${result.remainingRows} 行が残りました`);
  } catch (error) {
    errors.push(`tenant ${tenantId} (identity): ${error instanceof Error ? error.message : String(error)}`);
  }

  return { remainingRows, errors, identityAttempted: true };
}

/**
 * Device Flow で得た grant に束ねた publish API client。
 *
 * token は実行のたびに取り直すので、client は grant を受け取ってから作る。tenant/workspace
 * header も grant の claims から引く — 環境変数由来の値と食い違うと、smoke が「自分が思っている
 * tenant」ではない先を叩いていることに気付けないため。
 */
function apiClient(config: SmokeConfig, grant: DeviceGrant) {
  let sequence = 0;
  return async (
    method: string,
    path: string,
    options: { readonly json?: unknown; readonly bytes?: Uint8Array; readonly expected: number | readonly number[] },
  ): Promise<ApiResult> => {
    sequence += 1;
    const headers = new Headers({
      authorization: `Bearer ${grant.accessToken}`,
      'x-harness-tenant-id': grant.claims.tenant_id,
      'x-harness-workspace-id': grant.claims.workspace_id,
    });
    if (MUTATING.has(method)) {
      // 変更系は Origin 検査が認可判定より前にある。付けないと必ず untrusted_origin になる。
      headers.set('origin', config.origin);
      headers.set('idempotency-key', `smoke-${Date.now()}-${sequence}`);
    }
    let body: BodyInit | undefined;
    if (options.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(options.json);
    } else if (options.bytes !== undefined) {
      headers.set('content-type', 'application/zip');
      const ownedBytes = new Uint8Array(options.bytes.byteLength);
      ownedBytes.set(options.bytes);
      body = new Blob([ownedBytes]);
    }
    const requestInit: RequestInit = body === undefined ? { method, headers } : { method, headers, body };
    const response = await fetch(`${config.baseUrl}${path}`, requestInit);
    const text = await response.text();
    let parsed: unknown = {};
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`${method} ${path}: JSON でない応答 (${response.status})`);
      }
    }
    const expected = Array.isArray(options.expected) ? options.expected : [options.expected];
    if (!expected.includes(response.status)) {
      const safeBody = JSON.stringify(parsed).slice(0, 800);
      // 設定不備 (Origin 未許可) は本番障害と紛らわしいので、切り分け手順を添える。
      const hint = safeBody.includes('"untrusted_origin"')
        ? ` / origin=${config.origin} が Worker の AUTH_ALLOWED_ORIGINS に含まれていない。HUB_SMOKE_ORIGIN で上書きできる`
        : '';
      throw new Error(
        `${method} ${path}: expected=${expected.join('|')} actual=${response.status} body=${safeBody}${hint}`,
      );
    }
    return { status: response.status, body: expectObject(parsed, `${method} ${path}`) };
  };
}

function downloadR2(bucket: string, key: string, destination: string): void {
  const result = spawnSync(
    'pnpm',
    [
      '--filter',
      'hub',
      'exec',
      'wrangler',
      'r2',
      'object',
      'get',
      `${bucket}/${key}`,
      '--remote',
      '--file',
      destination,
      '--config',
      'apps/hub/wrangler.jsonc',
    ],
    { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (result.status !== 0) {
    throw new Error(`R2 get failed for ${key}: ${(result.stderr || result.stdout).trim()}`);
  }
}

export type { ApiResult, SmokeConfig };
export {
  apiClient,
  assert,
  cleanupPublishThenIdentity,
  downloadR2,
  expectObject,
  expectString,
  greenZip,
  HELP,
  loadConfig,
  PUBLISH_SCOPE,
  secretZip,
  sha256,
  smokeId,
};
