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
import { randomBytes } from 'node:crypto';

import { greenZip, secretZip, sha256, smokeId } from './smoke-production-publish-zip.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createSmokeFixtureLifecycle,
  normalizeSmokeRunId,
  parseSmokeFixtureTtlMinutes,
  type SmokeFixtureKind,
  type SmokeFixtureLifecycle,
  type SmokeTenantSweepCandidate,
} from '@harness-hub/db';

import type { DeviceGrant } from './smoke-production-hearing-support.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const DEFAULT_R2_BUCKET = 'harness-hub-packages';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** publish 系 action (`publish.write` / `channel.promote` など) が要求する scope。 */
const PUBLISH_SCOPE = 'publish:write';

/** 1 tenant あたりの回収試行上限。無限に粘ると job の cancel 猶予を食い潰す。 */
const DEFAULT_SWEEP_MAX_ATTEMPTS = 3;
const SWEEP_ATTEMPT_LIMIT = 5;
const SWEEP_RETRY_BASE_MS = 500;

const HELP = `Usage:
  pnpm --filter @harness-hub/hub run smoke:publish-production
  pnpm --filter @harness-hub/hub run smoke:publish-production -- --sweep [--report <path>]

--sweep runs only the interrupted-run recovery path: it lists disposable fixtures registered in
the dedicated lease ledger that are expired (or belong to this run) and deletes publish rows before
the identity tenant. It needs no HUB_PUBLIC_URL / CLOUDFLARE_API_TOKEN because it performs no HTTP
or R2 access.

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

/** sweep だけを回すときの最小設定。HTTP も R2 も使わないので DB 資格情報しか要求しない。 */
interface SweepConfig {
  readonly databaseUrl: string;
  readonly databaseToken: string;
}

/** 1 tenant の回収結果。`swept=false` の行が残留 = 観測すべき失敗。 */
interface SweepTenantResult {
  readonly tenantId: string;
  readonly slug: string;
  readonly runId: string;
  readonly kind: SmokeFixtureKind;
  readonly expiresAt: number;
  readonly attempts: number;
  readonly swept: boolean;
  readonly errors: readonly string[];
}

interface SweepAttemptEvent {
  readonly tenantId: string;
  readonly slug: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly errors: readonly string[];
}

interface SweepOutcome {
  readonly candidates: number;
  readonly swept: number;
  readonly failed: number;
  readonly maxAttempts: number;
  readonly results: readonly SweepTenantResult[];
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

/** sweep 専用の設定。通常実行の `loadConfig` と分けるのは、掃除に R2 / HTTP の資格情報が要らないため。 */
function loadSweepConfig(): SweepConfig {
  return { databaseUrl: required('TURSO_DATABASE_URL'), databaseToken: required('TURSO_AUTH_TOKEN') };
}

/**
 * この実行を一意に指す run id。
 *
 * GitHub Actions では `run_id` + `run_attempt` を使う。再実行 (attempt) は別プロセスなので、
 * attempt を混ぜないと再実行が前 attempt の生存中の fixture を自分のものとみなして消しうる。
 * CI 外では実行ごとの乱数にする — 手元実行の残骸を他の実行が掴まないため。
 */
function smokeRunId(): string {
  const runId = process.env.GITHUB_RUN_ID?.trim();
  if (runId) {
    const attempt = process.env.GITHUB_RUN_ATTEMPT?.trim() || '1';
    return normalizeSmokeRunId(`gha-${runId}-${attempt}`);
  }
  return normalizeSmokeRunId(`local-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`);
}

/** 専用 lease 台帳へ保存する共通 lifecycle。TTL の無効値は既定値へ隠さず fail-closed。 */
function smokeFixtureLifecycle(kind: SmokeFixtureKind, now: number = Date.now()): SmokeFixtureLifecycle {
  return createSmokeFixtureLifecycle({
    runId: smokeRunId(),
    kind,
    now,
    ttlMinutes: parseSmokeFixtureTtlMinutes(process.env.HUB_SMOKE_FIXTURE_TTL_MINUTES),
  });
}

/**
 * 中断後に残った使い捨て tenant を、publish 先行の順序を守ったまま上限付きで回収する。
 *
 * 再試行は「一時的な接続断」を吸収するためだけに置く。上限を持たせるのは、cancel された job に
 * 与えられる猶予が有限で、粘り続けると回収そのものが打ち切られて何も残せないため。
 * 上限に達しても消えなかった tenant は結果に残し、呼び出し側が観測可能な形 (annotation / 非 0 終了)
 * で表に出す — 静かに諦めると本番へ試験データが残ったことに誰も気付けない。
 */
async function sweepSmokeTenants(input: {
  readonly candidates: readonly SmokeTenantSweepCandidate[];
  readonly cleanupPublish: (tenantId: string) => Promise<CleanupResult>;
  readonly cleanupIdentity: (tenantId: string) => Promise<CleanupResult>;
  readonly maxAttempts?: number;
  readonly onAttempt?: (event: SweepAttemptEvent) => void;
  readonly sleep?: (ms: number) => Promise<void>;
}): Promise<SweepOutcome> {
  const requested = input.maxAttempts ?? DEFAULT_SWEEP_MAX_ATTEMPTS;
  const maxAttempts = Math.min(SWEEP_ATTEMPT_LIMIT, Math.max(1, Math.floor(requested)));
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const results: SweepTenantResult[] = [];

  for (const candidate of input.candidates) {
    let attempts = 0;
    let errors: readonly string[] = [];
    let swept = false;
    while (attempts < maxAttempts) {
      attempts += 1;
      const outcome = await cleanupPublishThenIdentity(
        candidate.tenantId,
        () => input.cleanupPublish(candidate.tenantId),
        () => input.cleanupIdentity(candidate.tenantId),
      );
      errors = outcome.errors;
      // identity まで到達し、かつ両方が残数 0 を返したときだけ回収済みとみなす。
      swept = outcome.identityAttempted && outcome.errors.length === 0;
      if (swept) break;
      input.onAttempt?.({
        tenantId: candidate.tenantId,
        slug: candidate.slug,
        attempt: attempts,
        maxAttempts,
        errors,
      });
      if (attempts < maxAttempts) await sleep(SWEEP_RETRY_BASE_MS * attempts);
    }
    results.push({
      tenantId: candidate.tenantId,
      slug: candidate.slug,
      runId: candidate.runId,
      kind: candidate.kind,
      expiresAt: candidate.expiresAt,
      attempts,
      swept,
      errors,
    });
  }

  const sweptCount = results.filter((result) => result.swept).length;
  return {
    candidates: input.candidates.length,
    swept: sweptCount,
    failed: results.length - sweptCount,
    maxAttempts,
    results,
  };
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

export type { ApiResult, SmokeConfig, SweepAttemptEvent, SweepConfig, SweepOutcome, SweepTenantResult };
export {
  apiClient,
  assert,
  cleanupPublishThenIdentity,
  DEFAULT_SWEEP_MAX_ATTEMPTS,
  downloadR2,
  expectObject,
  expectString,
  greenZip,
  HELP,
  loadConfig,
  loadSweepConfig,
  PUBLISH_SCOPE,
  secretZip,
  sha256,
  smokeFixtureLifecycle,
  smokeId,
  smokeRunId,
  sweepSmokeTenants,
};
