/**
 * hearing-share (スクリーンショット添付 + トークン付き共有URL) の合成点 (composition root)。
 *
 * `lib/tenant-data/runtime.ts` を一字一句お手本にした構造。screenshots は tenant-data と
 * **同じ R2 bucket (`TENANT_DATA_BUCKET`)・同じ暗号化機構**を再利用する設計のため、新しい
 * binding を増やさない (依頼元の指示)。
 *
 * **in-memory 実装をここへ差さない**。差すと未結線が 200 応答で隠れる (ADR AD-8、tenant-data と同じ理由)。
 */

import {
  createCoreRepositories,
  createHearingScreenshotsRepository,
  createHearingShareTokensRepository,
  createTenantDataRepository,
  createTursoWebClient,
  type HearingScreenshotsRepo,
  type HearingShareTokensRepo,
  type TenantDataBucketLike,
  type TenantDataRepo,
} from '@harness-hub/db';
import { createAuditLogger } from '../../shared/audit/index.js';
import { createDbAuditSink } from '../authz/runtime.js';

/**
 * hearing-share が必要とする binding。`TENANT_DATA_BUCKET` は tenant-data と同じ R2 binding 名で、
 * ここで別名を作らない (依頼元の指示: screenshots は同じ bucket・同じ暗号化機構を再利用する)。
 */
export interface HearingShareRuntimeEnv {
  readonly TENANT_DATA_BUCKET?: unknown;
  readonly [key: string]: unknown;
}

function isHearingShareRuntimeEnv(value: unknown): value is HearingShareRuntimeEnv {
  return value !== null && typeof value === 'object';
}

/** `lib/tenant-data/runtime.ts` の `readTenantDataRuntimeEnv` と同じ理由・同じ実装。 */
export async function readHearingShareRuntimeEnv(): Promise<HearingShareRuntimeEnv> {
  try {
    const mod = await import('@opennextjs/cloudflare');
    const env: unknown = mod.getCloudflareContext().env;
    if (!isHearingShareRuntimeEnv(env)) throw new Error('Cloudflare runtime env が object ではありません');
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

/** `lib/tenant-data/runtime.ts` の `requireBucket` と同じ理由・同じ実装。binding 名も同じ。 */
function requireBucket(env: HearingShareRuntimeEnv): TenantDataBucketLike {
  const bucket = env.TENANT_DATA_BUCKET;
  if (bucket === null || typeof bucket !== 'object' || typeof (bucket as { put?: unknown }).put !== 'function') {
    throw new Error('R2 binding TENANT_DATA_BUCKET が未設定です (infrastructure-spec §2)');
  }
  return bucket as TenantDataBucketLike;
}

export interface HearingShareRuntime {
  readonly screenshots: HearingScreenshotsRepo;
  readonly shareTokens: HearingShareTokensRepo;
  /**
   * screenshots の実体 (tenant_data_objects) への直接アクセス。`HearingScreenshotRow` は
   * `size_bytes`/`content_hash` を持たない (hearing 固有メタデータだけの薄い行) ため、
   * `hearingScreenshotSchema.size_bytes` を応答へ載せる route 側がここから引く。
   */
  readonly tenantData: TenantDataRepo;
  readonly audit: ReturnType<typeof createAuditLogger>;
}

/**
 * 本番 runtime を組む。キャッシュしないのは `createTenantDataRuntime` と同じ理由
 * (binding は isolate ごとに与えられる値で、module スコープへ抱えると古い参照が残りうる)。
 */
export async function createHearingShareRuntime(
  source: Record<string, string | undefined> = process.env,
): Promise<HearingShareRuntime> {
  const env = await readHearingShareRuntimeEnv();
  const adapter = createTursoWebClient({
    url: required(source, 'TURSO_DATABASE_URL'),
    authToken: required(source, 'TURSO_AUTH_TOKEN'),
  });
  const kekBase64 = required(source, 'ENCRYPTION_KEK');
  const bucket = requireBucket(env);
  const screenshots = createHearingScreenshotsRepository({ adapter, kekBase64, bucket });
  const shareTokens = createHearingShareTokensRepository(adapter);
  const tenantData = createTenantDataRepository({ adapter, kekBase64, bucket });

  // 監査 sink は認証側と同じ実体を使う (`createTenantDataRuntime` と同じ理由: hash chain を
  // テナント単位で 1 系統に保つ)。
  const audit = createAuditLogger({ sink: createDbAuditSink(createCoreRepositories({ adapter, kekBase64 }).audit) });

  return { screenshots, shareTokens, tenantData, audit };
}

/**
 * 既定の runtime。isolate 内で 1 度だけ組む (`lib/tenant-data/runtime.ts` の `tenantDataRuntime()` と
 * 同じ理由: repository 接続を要求のたびに作り直さない)。テストは差し替え口から入れ替える。
 */
let cached: Promise<HearingShareRuntime> | null = null;

export async function hearingShareRuntime(): Promise<HearingShareRuntime> {
  if (cached === null) cached = createHearingShareRuntime();
  return cached;
}

/** テストが実体を差し替えるための口。null で既定 (次回呼び出し時に再構築) へ戻す。本番経路からは呼ばない。 */
export function setHearingShareRuntimeForTest(replacement: HearingShareRuntime | null): void {
  cached = replacement === null ? null : Promise.resolve(replacement);
}
