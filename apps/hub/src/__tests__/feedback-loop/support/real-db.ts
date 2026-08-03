/**
 * feedback-loop route 実行テスト用の実 DB (libSQL) harness。
 *
 * `apps/hub/tests/auth-tenancy/support/real-db.ts` と同じ理由・同じ形にしてある:
 *   - `:memory:` は使わない (@libsql/client のローカル backend は transaction ごとに別接続を
 *     開くため、in-memory では transaction 内からスキーマが見えない)。
 *   - schema は canonical migration SQL をそのまま流す (drizzle schema barrel からの導出は
 *     `packages/db/__tests__/support/*` という package 内部 test 専用モジュールで、
 *     ここから import すると共通層の境界迂回 (deep import) になる)。
 *   - `feedbacks` / `ai_jobs` は tenant_id/workspace_id を単純列として持つだけで
 *     tenants/workspaces/users への FK 制約が無い (0006/0002 migration に REFERENCES が無い)。
 *     そのため実 tenant/workspace/user 行を先に作らなくても、authz 側の in-memory ports
 *     (`tests/auth-tenancy/support/token-route-runtime.ts`) と同じ tenant_id/workspace_id
 *     文字列をそのまま repository context へ渡せる。
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDdlStatements,
  type BuildsRepository,
  createBuildsRepository,
  createFeedbackRepository,
  createTursoClient,
  type FeedbackRepository,
  splitMigrationSql,
} from '@harness-hub/db';

const HERE = dirname(fileURLToPath(import.meta.url));
/**
 * migration の置き場。**import ではなく path 参照**にしてある。理由は auth-tenancy 側と同じ:
 * packages/db を相対 path で import すると共通層の境界迂回として
 * scripts/ci/check-shared-layer-duplicates.mjs に落ちる。SQL は成果物 (データ) であって
 * モジュールではないので、読み込みは fs 経由にしてモジュール境界を越えない。
 */
const MIGRATIONS_DIR = join(HERE, '..', '..', '..', '..', '..', '..', 'packages', 'db', 'migrations');

/**
 * feedback-loop repository が読み書きする表を持つ migration。
 * `0000` (users/user_settings) は `getNotifyFeedbackPreference` が参照するため必須
 * (無いと "no such table: users" が updateFeedbackStatus の fire-and-forget try/catch へ
 * 静かに飲み込まれ、通知経路が一切実行されないまま緑化してしまう)。device-flow/OIDC 系
 * (0001/0003/0004) は feedback-loop から参照されないため含めない。
 * `0006` は main で先行した tenant-data-retention、`0007` (feedback-loop-builds) は
 * AiJob(`feedback_response`) 完了時の冪等作成 (ADR §7 P10 差し戻し) の検証に必要。
 * `0005` の documents migration を含め、canonical lineage と同じ順で適用する。
 */
const MIGRATIONS = [
  '0000_baseline-core-domain.sql',
  '0002_hearing-intake-ai-queue.sql',
  '0005_common_stepford_cuckoos.sql',
  '0006_tenant-data-retention.sql',
  '0007_feedback-loop-builds.sql',
];

export interface FeedbackDbHarness {
  readonly repository: FeedbackRepository;
  readonly buildsRepository: BuildsRepository;
  close(): void;
}

export async function createFeedbackDbHarness(): Promise<FeedbackDbHarness> {
  const tempDir = mkdtempSync(join(tmpdir(), 'hub-feedback-libsql-'));
  const file = join(tempDir, 'test.db');
  const adapter = createTursoClient({ url: `file:${file}` });

  // WAL に切り替えるのは auth-tenancy 側と同じ理由 (ローカル backend の journal 共有で
  // 並行 reader の SHARED ロックが writer の COMMIT を塞ぎ、本番に無い偽の BUSY が出るため)。
  await applyDdlStatements(adapter, [
    'PRAGMA journal_mode=WAL',
    ...MIGRATIONS.flatMap((name) => splitMigrationSql(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))),
  ]);

  return {
    repository: createFeedbackRepository(adapter),
    buildsRepository: createBuildsRepository(adapter),
    close(): void {
      adapter.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
