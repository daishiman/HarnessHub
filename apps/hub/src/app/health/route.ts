// GET /health。外形監視 (Better Stack) と CI が叩く死活エンドポイント (ADR §7 / HF-A3-HEALTH-001..003)
import { buildHealthResponse, healthHttpStatus } from '@harness-hub/schemas';
import { defaultProbes, runDependencyProbes, type DependencyProbe } from './probes.js';
import { readRuntimeEnv, resolveVersion } from './runtime-env.js';

// 依存先の現在状態を返す性質上、キャッシュしてはならない
export const dynamic = 'force-dynamic';

export interface HealthHandlerOptions {
  readonly version: string;
  readonly probes: readonly DependencyProbe[];
  readonly now?: () => Date;
}

/**
 * 応答の組み立て。status の導出と body 形は @harness-hub/schemas が単一ソースなので、
 * ここでは判定ロジックを持たない (持つと外形監視との解釈が二重化する)。
 */
export async function buildHealthHttpResponse(options: HealthHandlerOptions): Promise<Response> {
  const now = options.now ?? (() => new Date());
  const dependencies = await runDependencyProbes(options.probes);
  const body = buildHealthResponse({
    version: options.version,
    checkedAt: now(),
    dependencies,
  });

  return Response.json(body, {
    status: healthHttpStatus(body.status),
    headers: {
      'cache-control': 'no-store',
    },
  });
}

export async function GET(): Promise<Response> {
  const env = await readRuntimeEnv();
  return buildHealthHttpResponse({
    version: resolveVersion(env),
    probes: defaultProbes(env),
  });
}
