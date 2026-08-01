/**
 * feat-publish-pipeline P13 production smoke の設定・ZIP・HTTP/R2 helper。
 *
 * 必要な資格情報は環境変数だけから読み、引数・ログ・成果物へ値を出さない。
 * disposable Project/TargetChannel と Green/secret ZIP を自動生成し、API・Turso・R2・
 * audit hash chain を横断して fail-closed に検査する。Project は finally で archived
 * に戻し、非終端 request は cancel する。immutable Release/R2/audit は証跡として残す。
 */

import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const DEFAULT_R2_BUCKET = 'harness-hub-packages';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const TERMINAL = new Set(['draft', 'published', 'failed']);

const HELP = `Usage:
  pnpm --filter hub run smoke:publish-production

Required environment:
  HUB_BASE_URL             production Hub origin (for example https://hub.example.com)
  PUBLISH_ACCESS_TOKEN     short-lived owner token with publish:write
  TURSO_DATABASE_URL       production libSQL URL
  TURSO_AUTH_TOKEN         production libSQL auth token
  CLOUDFLARE_API_TOKEN     Wrangler R2 read token (not printed)

Optional environment:
  PUBLISH_R2_BUCKET        default: ${DEFAULT_R2_BUCKET}

The command creates its own disposable Project/TargetChannel and ZIP fixtures.
It verifies S1-S6, 409 serialization, R2 SHA-256, audit chain, and cleanup.
`;

interface AccessClaims {
  readonly sub: string;
  readonly tenant_id: string;
  readonly workspace_id: string;
  readonly scope: readonly string[];
  readonly exp: number;
}

interface ApiResult {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

interface SmokeConfig {
  readonly baseUrl: string;
  readonly accessToken: string;
  readonly databaseUrl: string;
  readonly databaseToken: string;
  readonly r2Bucket: string;
  readonly claims: AccessClaims;
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

function decodeAccessClaims(token: string): AccessClaims {
  const segments = token.split('.');
  if (segments.length !== 3) throw new Error('PUBLISH_ACCESS_TOKEN は JWT 形式ではありません');
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(segments[1] ?? '', 'base64url').toString('utf8'));
  } catch {
    throw new Error('PUBLISH_ACCESS_TOKEN の claims を読めません');
  }
  if (typeof value !== 'object' || value === null) throw new Error('access token claims が object ではありません');
  const row = value as Record<string, unknown>;
  const scope = Array.isArray(row.scope) ? row.scope.filter((item): item is string => typeof item === 'string') : [];
  if (
    typeof row.sub !== 'string' ||
    typeof row.tenant_id !== 'string' ||
    typeof row.workspace_id !== 'string' ||
    typeof row.exp !== 'number' ||
    !scope.includes('publish:write')
  ) {
    throw new Error('access token に sub/tenant_id/workspace_id/exp/publish:write がそろっていません');
  }
  if (row.exp <= Math.floor(Date.now() / 1000)) throw new Error('PUBLISH_ACCESS_TOKEN は期限切れです');
  return {
    sub: row.sub,
    tenant_id: row.tenant_id,
    workspace_id: row.workspace_id,
    scope,
    exp: row.exp,
  };
}

function loadConfig(): SmokeConfig {
  const accessToken = required('PUBLISH_ACCESS_TOKEN');
  required('CLOUDFLARE_API_TOKEN');
  return {
    baseUrl: required('HUB_BASE_URL').replace(/\/+$/, ''),
    accessToken,
    databaseUrl: required('TURSO_DATABASE_URL'),
    databaseToken: required('TURSO_AUTH_TOKEN'),
    r2Bucket: process.env.PUBLISH_R2_BUCKET?.trim() || DEFAULT_R2_BUCKET,
    claims: decodeAccessClaims(accessToken),
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

function apiClient(config: SmokeConfig) {
  let sequence = 0;
  return async (
    method: string,
    path: string,
    options: { readonly json?: unknown; readonly bytes?: Uint8Array; readonly expected: number | readonly number[] },
  ): Promise<ApiResult> => {
    sequence += 1;
    const headers = new Headers({
      authorization: `Bearer ${config.accessToken}`,
      'x-harness-tenant-id': config.claims.tenant_id,
      'x-harness-workspace-id': config.claims.workspace_id,
    });
    if (MUTATING.has(method)) headers.set('idempotency-key', `smoke-${Date.now()}-${sequence}`);
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
      throw new Error(`${method} ${path}: expected=${expected.join('|')} actual=${response.status} body=${safeBody}`);
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
  downloadR2,
  expectObject,
  expectString,
  greenZip,
  HELP,
  loadConfig,
  secretZip,
  sha256,
  smokeId,
  TERMINAL,
};
