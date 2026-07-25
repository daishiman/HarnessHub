// テスト DB 生成ヘルパ。libSQL (本番同一 driver) と D1 shim の 2 経路を同一 schema harness で初期化する。
// 注意: @libsql/client のローカル backend は transaction ごとに別接続を開くため、
// `:memory:` では transaction 内からスキーマが見えない。テスト DB は常に一時ファイルで作る。

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createD1Client, createTursoClient, type D1Adapter, type TursoAdapter } from '@harness-hub/db/connection';
import { ColumnCipher, type CoreAdapter } from '@harness-hub/db/repository';
import { applyDdlStatements } from '../../backup/ddl';
import { toBase64 } from '../../repository/bytes';
import { createD1Shim } from './d1-shim';
import { schemaDdl } from './schema-harness';

/** テスト用 KEK (32 byte 固定値)。本番 KEK は Workers Secret のみに存在する。 */
export const TEST_KEK_B64 = toBase64(new Uint8Array(32).fill(7));
/** wrong-KEK 系テスト用の別鍵。 */
export const OTHER_KEK_B64 = toBase64(new Uint8Array(32).fill(9));

export function asCore(adapter: TursoAdapter | D1Adapter): CoreAdapter {
  return adapter as unknown as CoreAdapter;
}

export async function createLibsqlTestDb(url?: string): Promise<TursoAdapter> {
  let tempDir: string | null = null;
  let resolvedUrl = url;
  if (resolvedUrl === undefined) {
    tempDir = mkdtempSync(join(tmpdir(), 'dmdb-libsql-'));
    resolvedUrl = `file:${join(tempDir, 'test.db')}`;
  }
  const adapter = createTursoClient({ url: resolvedUrl });
  // ローカル file backend は接続ごとに journal を共有する。WAL にしないと
  // 並行 reader の SHARED ロックが writer の COMMIT を塞ぎ、本番 (Turso server) に無い偽の BUSY が出る。
  await applyDdlStatements(asCore(adapter), ['PRAGMA journal_mode=WAL', ...(await schemaDdl())]);
  if (tempDir === null) return adapter;
  const dir = tempDir;
  return {
    ...adapter,
    close(): void {
      adapter.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export async function createD1TestDb(): Promise<{ adapter: D1Adapter; raw: DatabaseSync }> {
  const raw = new DatabaseSync(':memory:');
  for (const statement of await schemaDdl()) {
    raw.exec(statement);
  }
  const adapter = createD1Client(createD1Shim(raw));
  return { adapter, raw };
}

export function testCipher(adapter: CoreAdapter): ColumnCipher {
  return new ColumnCipher(adapter, TEST_KEK_B64);
}
