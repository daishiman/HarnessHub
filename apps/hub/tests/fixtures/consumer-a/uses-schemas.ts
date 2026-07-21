// 第 2 consumer 系統による @harness-hub/schemas の利用。public API 経由のみ（相対 path で packages を貫通しない）
import {
  buildHealthResponse,
  type DependencyCheck,
  deriveHealthStatus,
  type HealthResponse,
  healthResponseSchema,
} from '@harness-hub/schemas';

/** 同一実装を指していることの照合用に、束縛した公開 API をそのまま公開する */
export const boundHealthResponseSchema = healthResponseSchema;
export const boundBuildHealthResponse = buildHealthResponse;
export const boundDeriveHealthStatus = deriveHealthStatus;

/** consumer としての実利用: 依存状態から応答 body を組み立てて検証する */
export function composeHealthBody(dependencies: readonly DependencyCheck[]): HealthResponse {
  const body = buildHealthResponse({
    version: 'consumer-a',
    checkedAt: new Date('2026-07-20T00:00:00.000Z'),
    dependencies,
  });
  return healthResponseSchema.parse(body);
}
