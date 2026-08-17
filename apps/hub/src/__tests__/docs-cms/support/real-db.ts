/** Docs外部同期routeのRequest/Response受入テスト用libSQL harness。 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDdlStatements,
  type CoreRepositories,
  createCoreRepositories,
  createDocsCmsRepository,
  createTursoClient,
  type DocsCmsRepository,
  splitMigrationSql,
} from '@harness-hub/db';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, '..', '..', '..', '..', '..', '..', 'packages', 'db', 'migrations');

export interface DocsDbHarness {
  readonly audit: CoreRepositories['audit'];
  readonly repository: DocsCmsRepository;
  close(): void;
}

export async function createDocsDbHarness(): Promise<DocsDbHarness> {
  const tempDir = mkdtempSync(join(tmpdir(), 'hub-docs-libsql-'));
  const adapter = createTursoClient({ url: `file:${join(tempDir, 'test.db')}` });
  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  await applyDdlStatements(adapter, [
    'PRAGMA journal_mode=WAL',
    ...migrations.flatMap((name) => splitMigrationSql(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))),
  ]);
  const audit = createCoreRepositories({
    adapter,
    kekBase64: Buffer.alloc(32, 7).toString('base64'),
  }).audit;
  return {
    audit,
    repository: createDocsCmsRepository(adapter),
    close() {
      adapter.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
