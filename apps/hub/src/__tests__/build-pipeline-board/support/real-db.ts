/**
 * build-pipeline-board の route 実行テスト用 実 DB (libSQL) harness
 * (SYS-BUILD-PIPELINE-BOARD-P05)。
 *
 * `apps/hub/src/__tests__/feedback-loop/support/real-db.ts` と同じ理由・同じ形にしてある:
 *   - `:memory:` は使わない (@libsql/client のローカル backend は transaction ごとに別接続を
 *     開くため、in-memory では transaction 内からスキーマが見えない)。
 *   - schema は canonical migration SQL をそのまま流す (drizzle schema barrel を相対 path で
 *     import すると共通層の境界迂回になる。SQL は成果物なので fs 読み込みで境界を越えない)。
 *
 * fixture 行の投入も生 SQL で行う。`builds.publish_request_id` を立てた状態や、
 * 別テナントの行を作る経路は repository が公開していないためで、
 * ここで packages/db の drizzle schema を import すると同じ境界を越えてしまう。
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDdlStatements,
  type BuildStageRepository,
  createBuildStageRepository,
  createTursoClient,
  splitMigrationSql,
} from '@harness-hub/db';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, '..', '..', '..', '..', '..', '..', 'packages', 'db', 'migrations');

/**
 * `0000` は `publish_requests` (publish 工程の前提確認)、`0007` は `builds`、
 * `0008` は `build_stage_events`、`0017` はカード手入力列と `sheet_id` の一意制約を作る。
 * device-flow/OIDC 系 (0001/0003/0004) は本 feature から参照されないため含めない。
 * canonical lineage と同じ順で適用する。
 */
const MIGRATIONS = [
  '0000_baseline-core-domain.sql',
  '0002_hearing-intake-ai-queue.sql',
  '0005_common_stepford_cuckoos.sql',
  '0006_tenant-data-retention.sql',
  '0007_feedback-loop-builds.sql',
  '0008_metrics-tracking-and-build-stage-events.sql',
  '0017_build-card-authoring.sql',
];

export interface SeedBuildInput {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly type: 'hearing' | 'improvement' | 'review' | 'bug';
  readonly stage: string;
  readonly publishRequestId?: string | null;
  readonly updatedAt?: number;
  /** 接続元。一意制約 (`builds_sheet_id_uq`) の重複起票テストで使う。 */
  readonly sheetId?: string | null;
  readonly feedbackId?: string | null;
}

export interface SeedPublishRequestInput {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly status: string;
}

export interface BuildBoardDbHarness {
  readonly repository: BuildStageRepository;
  seedBuild(input: SeedBuildInput): Promise<void>;
  seedPublishRequest(input: SeedPublishRequestInput): Promise<void>;
  close(): void;
}

/** SQL リテラル用の最小エスケープ。fixture 値しか通さない (利用者入力は通らない)。 */
function quote(value: string | null): string {
  return value === null ? 'NULL' : `'${value.replaceAll("'", "''")}'`;
}

export async function createBuildBoardDbHarness(): Promise<BuildBoardDbHarness> {
  const tempDir = mkdtempSync(join(tmpdir(), 'hub-builds-libsql-'));
  const file = join(tempDir, 'test.db');
  const adapter = createTursoClient({ url: `file:${file}` });

  await applyDdlStatements(adapter, [
    'PRAGMA journal_mode=WAL',
    ...MIGRATIONS.flatMap((name) => splitMigrationSql(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))),
  ]);

  return {
    repository: createBuildStageRepository(adapter),

    async seedBuild(input) {
      const timestamp = input.updatedAt ?? Date.now();
      await applyDdlStatements(adapter, [
        `INSERT INTO builds (id, tenant_id, workspace_id, type, stage, sheet_id, feedback_id, publish_request_id, created_at, updated_at)
         VALUES (${quote(input.id)}, ${quote(input.tenantId)}, ${quote(input.workspaceId)}, ${quote(input.type)},
                 ${quote(input.stage)}, ${quote(input.sheetId ?? null)}, ${quote(input.feedbackId ?? null)},
                 ${quote(input.publishRequestId ?? null)}, ${timestamp}, ${timestamp})`,
      ]);
    },

    async seedPublishRequest(input) {
      await applyDdlStatements(adapter, [
        `INSERT INTO publish_requests (id, tenant_id, workspace_id, project_id, channel_id, status, requested_by, created_at)
         VALUES (${quote(input.id)}, ${quote(input.tenantId)}, ${quote(input.workspaceId)}, 'proj-1',
                 ${quote(`ch-${input.id}`)}, ${quote(input.status)}, 'user-admin', ${Date.now()})`,
      ]);
    },

    close(): void {
      adapter.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
