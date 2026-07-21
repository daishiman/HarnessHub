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
  /** デプロイ済みリビジョン識別子 (CI/build 時注入の任意指定。通常は CF_VERSION_METADATA を使う) */
  readonly HUB_VERSION?: string;
  /**
   * Cloudflare 標準の version metadata binding。デプロイのたびに Cloudflare 側が id を採番するため、
   * CI 側の配線なしに「いま動いている版」を応答へ載せられる (follow-up H-01 の解消手段)。
   * ローカル/テストでは undefined になりうる。
   */
  readonly CF_VERSION_METADATA?: { readonly id?: string; readonly tag?: string; readonly timestamp?: string };
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

/**
 * 応答に載せる版。優先順は Cloudflare の version metadata → 明示指定 (HUB_VERSION) → 'unknown'。
 *
 * version metadata を優先するのは、**実際に配信されている版と必ず一致する**ため。
 * HUB_VERSION は build 時の値なので、rollback で前の版へ戻した場合に嘘をつきうる
 * (「どの版が動いているか」を応答から特定できないと、障害時のロールバック判断が誤る = follow-up H-01)。
 * どちらも取得できない場合も schema (min 1 文字) を満たすため 'unknown' で埋める。
 */
export function resolveVersion(env: RuntimeEnv): string {
  const fromMetadata = env.CF_VERSION_METADATA?.id;
  if (typeof fromMetadata === 'string' && fromMetadata.trim().length > 0) return fromMetadata.trim();
  const candidate = env.HUB_VERSION;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : 'unknown';
}
