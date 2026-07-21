/** `/health` 応答契約 (HF-A3-HEALTH-002) と、依存状態から全体状態を導く純関数の単一ソース。 */
import { z } from 'zod';

import { isoDateTimeSchema } from './primitives.js';

/**
 * 死活状態の語彙。外形監視 (Better Stack) は body の `status` で判定するため、
 * この 3 値以外を増やさない。
 */
export const healthStatusSchema = z.enum(['ok', 'degraded', 'down']);
export type HealthStatus = z.output<typeof healthStatusSchema>;

/** 依存先 1 件の検査結果。`name` は `db` / `r2` のような依存の識別名。 */
export const dependencyCheckSchema = z.object({
  name: z.string().min(1).max(64),
  status: healthStatusSchema,
  /** 検査に要した時間 (ms)。計測できなかった場合は省略する。 */
  latencyMs: z.number().int().nonnegative().optional(),
  /** 失敗理由の要約。secret や接続文字列を入れてはならない (security-spec §5.2)。 */
  detail: z.string().max(500).optional(),
});
export type DependencyCheck = z.output<typeof dependencyCheckSchema>;

/**
 * `GET /health` の応答契約。
 * test-design HF-A3-HEALTH-002 が要求する `{status, version, checkedAt, dependencies[]}` を正本とする。
 */
export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  /** デプロイ済みリビジョンの識別子。ロールバック後の版判定に使う。 */
  version: z.string().min(1).max(128),
  /** 検査を実施したサーバ時刻。クライアント時刻は使わない。 */
  checkedAt: isoDateTimeSchema,
  dependencies: z.array(dependencyCheckSchema),
});
export type HealthResponse = z.output<typeof healthResponseSchema>;

/** 状態の悪さの順序。集約時の比較にだけ使う内部表。 */
const severity: Record<HealthStatus, number> = { ok: 0, degraded: 1, down: 2 };

/**
 * 依存先の検査結果から全体 status を導く (最も悪い依存に合わせる)。
 * 依存が 1 件もなければ `ok`。判定をここ以外に書かないことで、
 * apps/hub と外形監視の解釈が食い違わないようにする。
 */
export function deriveHealthStatus(dependencies: readonly DependencyCheck[]): HealthStatus {
  return dependencies.reduce<HealthStatus>(
    (worst, dependency) => (severity[dependency.status] > severity[worst] ? dependency.status : worst),
    'ok',
  );
}

/**
 * `/health` の HTTP ステータス。
 * `degraded` は縮退しつつ応答できている状態なので 200 を返し、監視は body で判定する。
 * 完全停止 (`down`) のみ 503 を返す (infrastructure-spec §9)。
 */
export function healthHttpStatus(status: HealthStatus): 200 | 503 {
  return status === 'down' ? 503 : 200;
}

/** 依存検査の結果から応答 body を組み立てる。`status` の導出漏れを防ぐための唯一の組立口。 */
export function buildHealthResponse(input: {
  version: string;
  checkedAt: Date;
  dependencies: readonly DependencyCheck[];
}): HealthResponse {
  return healthResponseSchema.parse({
    status: deriveHealthStatus(input.dependencies),
    version: input.version,
    checkedAt: input.checkedAt.toISOString(),
    dependencies: input.dependencies,
  });
}
