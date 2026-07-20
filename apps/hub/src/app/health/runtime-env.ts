// 実行環境 (Cloudflare Workers bindings / ローカル process.env) の差を /health から隠す層

/** health が参照する実行環境の最小表現 */
export interface RuntimeEnv {
  /** 'production' | 'staging' | 'development' */
  readonly HUB_ENV?: string;
  /** デプロイ済みリビジョン識別子 */
  readonly HUB_VERSION?: string;
  /** D1/Turso などの DB binding。boundary の型は feat-domain-model-db が確定させる */
  readonly DB?: unknown;
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
