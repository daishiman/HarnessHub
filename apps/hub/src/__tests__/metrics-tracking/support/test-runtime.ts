/**
 * route テストが差し込む metrics runtime。
 *
 * route が使うのは `service` だけなので、cron 専用の port (`coefficients` / `tenants`) は
 * 呼ばれたら失敗する stub にしてある。空実装で通してしまうと「route が cron 用の依存を
 * 使い始めた」という設計の崩れに気付けない。
 */
import type { MetricsTrackingRepository } from '@harness-hub/db';

import {
  createMetricsTrackingRuntime,
  type MetricsTrackingRuntime,
} from '../../../features/metrics-tracking/runtime.js';

export function createTestMetricsRuntime(repository: MetricsTrackingRepository): MetricsTrackingRuntime {
  return createMetricsTrackingRuntime(
    repository,
    {
      getCoefficients: () => {
        throw new Error('route から係数を読むはずがありません (金額換算は cron 側)');
      },
    },
    {
      list: () => {
        throw new Error('route からテナント一覧を読むはずがありません');
      },
    },
  );
}
