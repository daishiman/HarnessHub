// /health の依存先プローブ。疎通判定だけを行い、応答契約と status 導出は @harness-hub/schemas に委ねる
import type { DependencyCheck } from '@harness-hub/schemas';
import type { R2HeadCapable, RuntimeEnv } from './runtime-env.js';

export interface DependencyProbe {
  /** 依存の識別名。応答 body の dependencies[].name になる */
  readonly name: string;
  /**
   * critical な依存の失敗は down (HTTP 503)、非 critical の失敗は degraded (HTTP 200) にする。
   * 「応答はできているが一部機能が使えない」状態を 503 にすると SLO を過剰に消費するため区別する。
   */
  readonly critical: boolean;
  /** 疎通できなければ throw する。戻り値は使わない */
  check(): Promise<void>;
}

/** プローブ 1 件のタイムアウト。/health 自体が監視のボトルネックにならない範囲に抑える */
export const PROBE_TIMEOUT_MS = 2_000;

export async function runDependencyProbes(
  probes: readonly DependencyProbe[],
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<DependencyCheck[]> {
  return Promise.all(probes.map((probe) => runProbe(probe, timeoutMs)));
}

async function runProbe(probe: DependencyProbe, timeoutMs: number): Promise<DependencyCheck> {
  const startedAt = Date.now();
  try {
    await withTimeout(probe.check(), timeoutMs);
    return { name: probe.name, status: 'ok', latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      name: probe.name,
      status: probe.critical ? 'down' : 'degraded',
      latencyMs: Date.now() - startedAt,
      // 接続文字列や secret を漏らさないため、既知の短い理由だけを載せる
      detail: sanitizeDetail(error),
    };
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** detail は最大 500 文字 (dependencyCheckSchema)。長い例外文はここで切る */
function sanitizeDetail(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'unknown_error';
  return raw.length > 200 ? `${raw.slice(0, 197)}...` : raw;
}

export interface ProbeDeps {
  /** Turso への HTTP 疎通に使う fetch。テストから差し替えてネットワークに出ないようにする */
  readonly fetchImpl?: typeof fetch;
}

/**
 * P0 の既定プローブ集合 (infrastructure-spec §9: Turso `SELECT 1` + R2 head を検査)。
 * 「常に空 = 常に ok」になると /health がゲートとして機能しないため、実際に落ちうる依存だけを並べる。
 * **存在しない binding を検査対象にしない**: Turso は `@libsql/client` (HTTP) 接続で native binding を持たない (§4)。
 */
export function defaultProbes(env: RuntimeEnv, deps: ProbeDeps = {}): readonly DependencyProbe[] {
  return [runtimeConfigProbe(env), createDbProbe(env, deps), createR2Probe(env)];
}

function runtimeConfigProbe(env: RuntimeEnv): DependencyProbe {
  return {
    name: 'runtime-config',
    critical: true,
    check: async () => {
      if (typeof env.HUB_ENV !== 'string' || env.HUB_ENV.trim().length === 0) {
        throw new Error('HUB_ENV_not_configured');
      }
    },
  };
}

/**
 * Turso 疎通。secret (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN) の設定有無を見て、
 * 設定済みなら `SELECT 1` まで実際に往復する。
 * Turso 停止は全 API 不可 (infrastructure-spec §10 縮退マトリクス) なので critical。
 */
export function createDbProbe(env: RuntimeEnv, deps: ProbeDeps = {}): DependencyProbe {
  return {
    name: 'db',
    critical: true,
    check: async () => {
      const url = nonEmpty(env.TURSO_DATABASE_URL);
      const token = nonEmpty(env.TURSO_AUTH_TOKEN);
      // 未プロビジョニング (secret 未投入) は「疎通できない」と同義に扱う。
      // 200 を返すと外形監視が可用性ありと誤計測するため、ここは degraded にしない
      if (url === null || token === null) throw new Error('turso_credentials_missing');
      await selectOne(url, token, deps.fetchImpl ?? globalThis.fetch);
    },
  };
}

/**
 * R2 疎通。binding 経由で head を 1 回叩き、往復できることだけを見る。
 * R2 停止時も catalog 閲覧は継続する (infrastructure-spec §10) ため **critical にしない**。
 * 503 にすると「実際には応答できている」時間までエラーバジェットを焼くため。
 */
export function createR2Probe(env: RuntimeEnv): DependencyProbe {
  return {
    name: 'r2',
    critical: false,
    check: async () => {
      const buckets: readonly (readonly [string, unknown])[] = [
        ['PACKAGES_BUCKET', env.PACKAGES_BUCKET],
        ['BACKUPS_BUCKET', env.BACKUPS_BUCKET],
      ];
      for (const [name, bucket] of buckets) {
        if (!isR2HeadCapable(bucket)) throw new Error(`${name}_binding_missing`);
        // 対象 key は存在しなくてよい。head が null を返すのも「往復できた」証拠になる
        await bucket.head(R2_PROBE_KEY);
      }
    },
  };
}

/** 実体を置かない疎通確認専用 key。存在しないほうが望ましい (Class B 1 ops のみ消費する) */
const R2_PROBE_KEY = '.health-probe';

function isR2HeadCapable(value: unknown): value is R2HeadCapable {
  return typeof value === 'object' && value !== null && typeof (value as R2HeadCapable).head === 'function';
}

function nonEmpty(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Turso の HTTP API (`/v2/pipeline`) へ `SELECT 1` を投げる。
 * `@libsql/client` を apps/hub の依存に足さずに済ませるための最小実装で、
 * packages/db が接続クライアントを持った時点でそちらへ寄せる (現状は境界と型のみ / ADR §11.3-7)。
 */
async function selectOne(databaseUrl: string, authToken: string, fetchImpl: typeof fetch): Promise<void> {
  const response = await fetchImpl(`${toHttpEndpoint(databaseUrl)}/v2/pipeline`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${authToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{ type: 'execute', stmt: { sql: 'SELECT 1' } }, { type: 'close' }],
    }),
  });

  // 応答本文には接続情報が混ざりうるので、外に出すのは HTTP status だけにする
  if (!response.ok) throw new Error(`turso_http_${response.status}`);

  const payload: unknown = await response.json();
  if (!isPipelineOk(payload)) throw new Error('turso_query_failed');
}

/** `libsql://` は HTTP 上のプロトコルなので https へ読み替える */
function toHttpEndpoint(databaseUrl: string): string {
  const normalized = databaseUrl.replace(/\/+$/, '');
  if (normalized.startsWith('libsql://')) return `https://${normalized.slice('libsql://'.length)}`;
  if (normalized.startsWith('https://') || normalized.startsWith('http://')) return normalized;
  throw new Error('turso_url_scheme_unsupported');
}

function isPipelineOk(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false;
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) return false;
  return results.every(
    (entry) => typeof entry === 'object' && entry !== null && (entry as { type?: unknown }).type === 'ok',
  );
}
