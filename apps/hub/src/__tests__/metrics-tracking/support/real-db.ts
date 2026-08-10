/**
 * metrics-tracking route/service テスト用の実 DB (libSQL) harness。
 *
 * `src/__tests__/feedback-loop/support/real-db.ts` と同じ理由・同じ形にしてある:
 *   - `:memory:` は使わない (@libsql/client のローカル backend は transaction ごとに別接続を
 *     開くため、in-memory では transaction 内からスキーマが見えない)。
 *   - schema は canonical migration SQL をそのまま流す (drizzle schema barrel からの導出は
 *     packages/db 内部の test 専用 module で、ここから import すると共通層の境界迂回になる)。
 *   - migration は path 参照で読む。SQL は成果物であってモジュールではないので、
 *     fs 経由なら `scripts/ci/check-shared-layer-duplicates.mjs` の deep import 検査に触れない。
 *
 * repository をモックしないのは、tenant_id の WHERE 句注入・`ON CONFLICT` による冪等 ingest・
 * rollup の upsert が「実行された体」で緑化するのを防ぐため。テナント分離と冪等性は
 * SQL の制約そのものが担保しているので、本物の SQLite に対してしか検証できない。
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDdlStatements,
  createMetricsTrackingRepository,
  createTursoClient,
  type MetricsTrackingRepository,
  splitMigrationSql,
} from '@harness-hub/db';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, '..', '..', '..', '..', '..', '..', 'packages', 'db', 'migrations');

/**
 * metrics-tracking が触る表を持つ migration。
 * `0000` は tenants/users、`0002` は `tenant_coefficients` (係数の単一ソース)、
 * `0008` が `metrics_events` / `metrics_rollups` 本体。
 * canonical lineage と同じ順で適用する。
 */
const MIGRATIONS = [
  '0000_baseline-core-domain.sql',
  '0002_hearing-intake-ai-queue.sql',
  '0005_common_stepford_cuckoos.sql',
  '0006_tenant-data-retention.sql',
  '0007_feedback-loop-builds.sql',
  '0008_metrics-tracking-and-build-stage-events.sql',
];

export interface MetricsDbHarness {
  readonly repository: MetricsTrackingRepository;
  close(): void;
}

export async function createMetricsDbHarness(): Promise<MetricsDbHarness> {
  const tempDir = mkdtempSync(join(tmpdir(), 'hub-metrics-libsql-'));
  const file = join(tempDir, 'test.db');
  const adapter = createTursoClient({ url: `file:${file}` });

  // WAL に切り替えるのは feedback-loop 側と同じ理由 (ローカル backend の journal 共有で
  // 並行 reader が writer の COMMIT を塞ぎ、本番に無い偽の BUSY が出るため)。
  await applyDdlStatements(adapter, [
    'PRAGMA journal_mode=WAL',
    ...MIGRATIONS.flatMap((name) => splitMigrationSql(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))),
  ]);

  return {
    repository: createMetricsTrackingRepository(adapter),
    close(): void {
      adapter.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
