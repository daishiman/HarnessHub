/**
 * metrics-tracking の本番 composition root (sys-metrics-tracking-p05)。
 *
 * 何を: DB 接続・repository・service・cron ジョブの結線を 1 箇所に集める。
 * なぜ: route.ts が module 読み込み時に環境変数へ触れると、未設定環境では import 自体が失敗し
 *       ビルドが通らなくなる (feedback-loop / hearing-intake / user-org-admin と同じ理由)。
 *       解決は必ず「要求が来てから」行う。
 *
 * `metrics_events` / `metrics_rollups` と `tenant_coefficients` は同一 DB 上にあるため、
 * adapter を 1 つだけ作って両 repository で共有する。repository ごとに接続を作ると
 * 「どちらの接続で読んだか」という区別が生まれてしまう (区別する理由は無い)。
 */
import {
  createCoreRepositories,
  createHearingIntakeRepository,
  createMetricsTrackingRepository,
  createTursoWebClient,
  type MetricsTrackingRepository,
} from '@harness-hub/db';

import type { MetricsCoefficientSource, MetricsTenantDirectory } from './rollup-job.js';
import { createMetricsTrackingService, type MetricsTrackingService } from './service.js';

export interface MetricsTrackingRuntime {
  readonly repository: MetricsTrackingRepository;
  /** `tenant_coefficients` の読取専用 consume 経路 (owner は feat-user-org-admin)。 */
  readonly coefficients: MetricsCoefficientSource;
  readonly tenants: MetricsTenantDirectory;
  readonly service: MetricsTrackingService;
}

export function createMetricsTrackingRuntime(
  repository: MetricsTrackingRepository,
  coefficients: MetricsCoefficientSource,
  tenants: MetricsTenantDirectory,
): MetricsTrackingRuntime {
  return { repository, coefficients, tenants, service: createMetricsTrackingService(repository) };
}

function required(source: Record<string, string | undefined>, key: string): string {
  const value = source[key]?.trim();
  if (value === undefined || value.length === 0) throw new Error(`環境変数 ${key} が未設定です`);
  return value;
}

function readDatabaseEnv(source: Record<string, string | undefined>) {
  const url = required(source, 'TURSO_DATABASE_URL');
  const authToken = source.TURSO_AUTH_TOKEN?.trim();
  if (/^(?:libsql|https|wss):/i.test(url) && !authToken) {
    throw new Error('リモート TURSO_DATABASE_URL には TURSO_AUTH_TOKEN が必要です');
  }
  return authToken ? { url, authToken } : { url };
}

let cached:
  | {
      readonly url: string | undefined;
      readonly token: string | undefined;
      readonly kek: string | undefined;
      readonly runtime: MetricsTrackingRuntime;
    }
  | undefined;

/**
 * テナント一覧は `createCoreRepositories` の facade からしか取れない (leaf factory は非公開)。
 * この facade は暗号化列のために KEK を要求するが、metrics が読むのは `tenants` だけで
 * 暗号化列には触れない。KEK は user-org-admin / authz と同じ `ENCRYPTION_KEK` を使う。
 */
export function metricsTrackingRuntime(
  source: Record<string, string | undefined> = process.env,
): MetricsTrackingRuntime {
  if (
    cached === undefined ||
    cached.url !== source.TURSO_DATABASE_URL ||
    cached.token !== source.TURSO_AUTH_TOKEN ||
    cached.kek !== source.ENCRYPTION_KEK
  ) {
    const adapter = createTursoWebClient(readDatabaseEnv(source));
    cached = {
      url: source.TURSO_DATABASE_URL,
      token: source.TURSO_AUTH_TOKEN,
      kek: source.ENCRYPTION_KEK,
      runtime: createMetricsTrackingRuntime(
        createMetricsTrackingRepository(adapter),
        createHearingIntakeRepository(adapter),
        createCoreRepositories({ adapter, kekBase64: required(source, 'ENCRYPTION_KEK') }).tenants,
      ),
    };
  }
  return cached.runtime;
}
