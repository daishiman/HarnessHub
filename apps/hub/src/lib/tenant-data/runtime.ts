/**
 * tenant-data-retention の合成点 (composition root)。
 *
 * `lib/publish/runtime.ts` と同じ方針: 「実体をどこから取るか」を知るのはこの file だけ。
 * repository を持たない (`createTenantDataRepository`) 別合成単位として独立させているのは、
 * publish が落ちても tenant-data は生きていてほしい (逆も同じ) から。
 *
 * **in-memory 実装をここへ差さない**。差すと未結線が 200 応答で隠れる (ADR AD-8)。
 */

import {
  createCoreRepositories,
  createTenantDataRepository,
  createTursoWebClient,
  type TenantDataBucketLike,
  type TenantDataRepo,
} from '@harness-hub/db';
import { createAuditLogger } from '../../shared/audit/index.js';
import { createDbAuditSink } from '../authz/runtime.js';

/**
 * tenant-data が必要とする binding。`TENANT_DATA_BUCKET` は infrastructure-spec §2 の
 * 台帳にある R2 binding 名で、ここで別名を作らない。
 */
export interface TenantDataRuntimeEnv {
  readonly TENANT_DATA_BUCKET?: unknown;
  readonly [key: string]: unknown;
}

function isTenantDataRuntimeEnv(value: unknown): value is TenantDataRuntimeEnv {
  return value !== null && typeof value === 'object';
}

/** `lib/publish/runtime.ts` の `readPublishRuntimeEnv` と同じ理由・同じ実装。 */
export async function readTenantDataRuntimeEnv(): Promise<TenantDataRuntimeEnv> {
  try {
    const mod = await import('@opennextjs/cloudflare');
    const env: unknown = mod.getCloudflareContext().env;
    if (!isTenantDataRuntimeEnv(env)) throw new Error('Cloudflare runtime env が object ではありません');
    return env;
  } catch {
    return process.env;
  }
}

function required(source: Record<string, string | undefined>, key: string): string {
  const value = source[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`環境変数 ${key} が未設定です`);
  }
  return value;
}

/** `lib/publish/runtime.ts` の `requireBucket` と同じ理由・同じ実装。binding 名だけが異なる。 */
function requireBucket(env: TenantDataRuntimeEnv): TenantDataBucketLike {
  const bucket = env.TENANT_DATA_BUCKET;
  if (bucket === null || typeof bucket !== 'object' || typeof (bucket as { put?: unknown }).put !== 'function') {
    throw new Error('R2 binding TENANT_DATA_BUCKET が未設定です (infrastructure-spec §2)');
  }
  return bucket as TenantDataBucketLike;
}

export interface TenantDataRuntime {
  readonly repo: TenantDataRepo;
  readonly audit: ReturnType<typeof createAuditLogger>;
}

/**
 * 本番 runtime を組む。キャッシュしないのは `createPublishRuntime` と同じ理由
 * (binding は isolate ごとに与えられる値で、module スコープへ抱えると古い参照が残りうる)。
 */
export async function createTenantDataRuntime(
  source: Record<string, string | undefined> = process.env,
): Promise<TenantDataRuntime> {
  const env = await readTenantDataRuntimeEnv();
  const adapter = createTursoWebClient({
    url: required(source, 'TURSO_DATABASE_URL'),
    authToken: required(source, 'TURSO_AUTH_TOKEN'),
  });
  const kekBase64 = required(source, 'ENCRYPTION_KEK');
  const repo = createTenantDataRepository({ adapter, kekBase64, bucket: requireBucket(env) });

  // 監査 sink は認証側と同じ実体を使う。専用 sink を作ると hash chain が 2 系統になり、
  // テナント単位の連結が壊れる (`createPublishRuntime` と同じ理由)。
  // `createCoreRepositories` の cipher は audit repo 自体は使わないが (audit に暗号化列は無い)、
  // audit repository だけを取り出す公開 API が無いためこの経路で取る。
  const audit = createAuditLogger({ sink: createDbAuditSink(createCoreRepositories({ adapter, kekBase64 }).audit) });

  return { repo, audit };
}

/**
 * 既定の runtime。isolate 内で 1 度だけ組む (`lib/publish/route-support.ts` の `publishRuntime()` と同じ理由:
 * repository 接続を要求のたびに作り直さない)。テストは差し替え口から入れ替える。
 */
let cached: Promise<TenantDataRuntime> | null = null;

export async function tenantDataRuntime(): Promise<TenantDataRuntime> {
  if (cached === null) cached = createTenantDataRuntime();
  return cached;
}

/** テストが実体を差し替えるための口。null で既定 (次回呼び出し時に再構築) へ戻す。本番経路からは呼ばない。 */
export function setTenantDataRuntimeForTest(replacement: TenantDataRuntime | null): void {
  cached = replacement === null ? null : Promise.resolve(replacement);
}
