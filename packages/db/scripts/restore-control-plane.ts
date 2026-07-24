// restore CLI (qa-019: 復元できないバックアップを成功と数えない)。
//   pnpm --filter @harness-hub/db run restore:control-plane -- --url <target-libsql-url> --in <artifact> \
//     [--migrations-dir <dir> | --ddl <sql-file>]
// 空の target DB へ schema を適用してから復元し、行数・audit chain・暗号断面の整合検査まで行う。
// いずれか失敗で exit 1 (fail-closed)。

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { applyDdlStatements, splitMigrationSql } from '../backup/ddl';
import { restoreControlPlane } from '../backup/index';
import { createTursoClient } from '../connection/turso';

function loadDdlStatements(migrationsDir: string | undefined, ddlFile: string | undefined): string[] {
  if (ddlFile !== undefined) {
    return splitMigrationSql(readFileSync(ddlFile, 'utf8'));
  }
  const dir = migrationsDir ?? join(import.meta.dirname, '..', 'migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) throw new Error(`migration SQL が見つかりません: ${dir}`);
  return files.flatMap((f) => splitMigrationSql(readFileSync(join(dir, f), 'utf8')));
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      in: { type: 'string' },
      'migrations-dir': { type: 'string' },
      ddl: { type: 'string' },
    },
  });
  if (values.url === undefined || values.in === undefined) {
    console.error(
      'usage: restore-control-plane --url <target-url> --in <artifact> [--migrations-dir <dir> | --ddl <file>]',
    );
    return 2;
  }
  const adapter = createTursoClient({ url: values.url, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    const statements = loadDdlStatements(values['migrations-dir'], values.ddl);
    await applyDdlStatements(adapter, statements);
    const artifact = readFileSync(values.in, 'utf8');
    const report = await restoreControlPlane(adapter, artifact);
    console.log(JSON.stringify(report));
    return report.ok ? 0 : 1;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    return 1;
  } finally {
    adapter.close();
  }
}

process.exitCode = await main();
