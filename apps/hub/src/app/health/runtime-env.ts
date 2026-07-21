// 実行環境 (Cloudflare Workers bindings / ローカル process.env) の差を /health から隠す層

/**
 * R2 binding のうち health が使う部分だけの構造型。
 * @cloudflare/workers-types を依存に加えずに head 疎通だけを型付けする。
 */
export interface R2HeadCapable {
  head(key: string): Promise<unknown>;
}

/**
 * health が参照する実行環境の最小表現。
 * **実在する binding / secret だけを並べる**。infrastructure-spec §2 の台帳が正本で、
 * Turso は `@libsql/client` (HTTP) 接続のため native な DB binding は存在しない (§4)。
 */
export interface RuntimeEnv {
  /** 'production' | 'development'。常設 staging は持たない (infrastructure-spec §6) */
  readonly HUB_ENV?: string;
  /** デプロイ済みリビジョン識別子 */
  readonly HUB_VERSION?: string;
  /** Turso 接続 URL (secret 台帳 / infrastructure-spec §2) */
  readonly TURSO_DATABASE_URL?: string;
  /** Turso 接続 token (secret 台帳 / infrastructure-spec §2) */
  readonly TURSO_AUTH_TOKEN?: string;
  /** R2 binding: PackageRegistry (infrastructure-spec §2/§3) */
  readonly PACKAGES_BUCKET?: R2HeadCapable;
  /** R2 binding: DB export 保管 (infrastructure-spec §2/§3) */
  readonly BACKUPS_BUCKET?: R2HeadCapable;
  readonly [key: string]: unknown;
}

/**
 * Workers 上では @opennextjs/cloudflare の context から、ローカル/テストでは process.env から読む。
 * import 自体を動的にして、Workers ランタイム外でモジュール解決に失敗しても /health が落ちないようにする。
 */
export async function readRuntimeEnv(): Promise<RuntimeEnv> {
  try {
    const mod = await import('@opennextjs/cloudflare');
    const context = mod.getCloudflareContext();
    return context.env as unknown as RuntimeEnv;
  } catch {
    return process.env as unknown as RuntimeEnv;
  }
}

/** 応答に載せる版。取得できない場合も schema (min 1 文字) を満たすため 'unknown' で埋める */
export function resolveVersion(env: RuntimeEnv): string {
  const candidate = env.HUB_VERSION;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : 'unknown';
}
