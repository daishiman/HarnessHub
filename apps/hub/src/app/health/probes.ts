// /health の依存先プローブ。疎通判定だけを行い、応答契約と status 導出は @harness-hub/schemas に委ねる
import type { DependencyCheck } from '@harness-hub/schemas';
import type { RuntimeEnv } from './runtime-env.js';

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

/**
 * P0 の既定プローブ集合。
 * 「常に空 = 常に ok」になると /health がゲートとして機能しないため、
 * 実際に落ちうる依存 (実行環境設定・DB binding) を最低 1 件は必ず含める。
 */
export function defaultProbes(env: RuntimeEnv): readonly DependencyProbe[] {
  return [
    {
      name: 'runtime-config',
      critical: true,
      check: async () => {
        if (typeof env.HUB_ENV !== 'string' || env.HUB_ENV.trim().length === 0) {
          throw new Error('HUB_ENV_not_configured');
        }
      },
    },
    {
      name: 'db',
      critical: true,
      check: async () => {
        // repository 層 (packages/db) は疎通確認 API を持たないため、
        // health では binding の存在のみを検査する。クエリ実行は feat-domain-model-db で追加する。
        if (env.DB === undefined || env.DB === null) {
          throw new Error('db_binding_missing');
        }
      },
    },
  ];
}
