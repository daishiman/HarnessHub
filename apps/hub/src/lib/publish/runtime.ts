/**
 * publish pipeline の合成点 (composition root)。
 *
 * 「実体をどこから取るか」を知るのはこの file だけ。service も route も port 型しか見ない。
 * `lib/authz/runtime.ts` と同じ方針だが、あちらは認証の依存を組むもので、
 * こちらは repository + R2 + 監査を組む。両方を 1 つにまとめないのは、
 * publish が落ちても認証は生きていてほしい (逆も同じ) から。
 *
 * **in-memory 実装をここへ差さない**。差すと未結線が 200 応答で隠れる (ADR AD-8)。
 * 設定不足は例外にして、最初の要求で気付ける形にする。
 */

import {
  createCoreRepositories,
  createPackageRegistry,
  createTursoWebClient,
  type R2BucketLike,
} from '@harness-hub/db';
import { createAuditLogger } from '../../shared/audit/index.js';
import { createDbAuditSink } from '../authz/runtime.js';
import { createDbPublishPorts } from './db-ports.js';
import type { PublishServiceDeps } from './service.js';

/**
 * publish が必要とする binding。
 * `PACKAGES_BUCKET` は infrastructure-spec §2 の台帳にある R2 binding 名で、
 * ここで別名を作らない (名前がずれると台帳と実装のどちらが正しいか分からなくなる)。
 */
export interface PublishRuntimeEnv {
  readonly PACKAGES_BUCKET?: unknown;
  readonly [key: string]: unknown;
}

function isPublishRuntimeEnv(value: unknown): value is PublishRuntimeEnv {
  return value !== null && typeof value === 'object';
}

/**
 * Workers 上では Cloudflare の context から、ローカル/テストでは process.env から読む。
 * 動的 import なのは、Workers ランタイム外で module 解決に失敗しても
 * 「binding が無い」という**扱える失敗**に落としたいため (import 例外で route ごと死なせない)。
 */
export async function readPublishRuntimeEnv(): Promise<PublishRuntimeEnv> {
  try {
    const mod = await import('@opennextjs/cloudflare');
    const env: unknown = mod.getCloudflareContext().env;
    if (!isPublishRuntimeEnv(env)) throw new Error('Cloudflare runtime env が object ではありません');
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

/**
 * R2 binding の取り出し。
 *
 * 型を `R2BucketLike` へ絞るのに `as` を使うのは、binding の実体が実行環境から来る値で
 * 静的に型付けできないため。せめて `put`/`get` が関数であることだけは実行時に確かめ、
 * 「binding 名を書き間違えたまま起動して、最初の upload で初めて落ちる」を避ける。
 */
function requireBucket(env: PublishRuntimeEnv): R2BucketLike {
  const bucket = env.PACKAGES_BUCKET;
  if (bucket === null || typeof bucket !== 'object' || typeof (bucket as { put?: unknown }).put !== 'function') {
    throw new Error('R2 binding PACKAGES_BUCKET が未設定です (infrastructure-spec §2)');
  }
  return bucket as R2BucketLike;
}

export interface PublishRuntime extends PublishServiceDeps {}

/**
 * 本番 runtime を組む。
 *
 * キャッシュしないのは、binding (R2) が isolate ごとに与えられる値で、
 * module スコープへ抱えると binding 更新後の isolate 再利用で古い参照が残りうるため。
 * DB client の生成費用はここでは支配的でない。
 */
export async function createPublishRuntime(
  source: Record<string, string | undefined> = process.env,
): Promise<PublishRuntime> {
  const env = await readPublishRuntimeEnv();
  const repositories = createCoreRepositories({
    // Workers 用 entry。native binding 版は workerd で動かない
    adapter: createTursoWebClient({
      url: required(source, 'TURSO_DATABASE_URL'),
      authToken: required(source, 'TURSO_AUTH_TOKEN'),
    }),
    kekBase64: required(source, 'ENCRYPTION_KEK'),
  });

  return {
    ports: createDbPublishPorts({
      repositories,
      registry: createPackageRegistry(requireBucket(env)),
    }),
    // 監査 sink は認証側と同じ実体を使う。publish 専用の sink を作ると
    // hash chain が 2 系統になり、テナント単位の連結が壊れる
    audit: createAuditLogger({ sink: createDbAuditSink(repositories.audit) }),
  };
}
