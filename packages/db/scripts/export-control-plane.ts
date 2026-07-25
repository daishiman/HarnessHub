// 日次 export CLI (qa-019)。GitHub Actions (backup.yml)・restore drill・ローカル検証から呼ぶ。
//   TURSO_AUTH_TOKEN=<secret> pnpm --filter @harness-hub/db run export:control-plane -- --url <libsql-url> --out <file>
// 成果物は決定論的 JSONL。salary / client_secret_enc は暗号文のまま転写される (平文は断面に存在しない)。

import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { exportControlPlane } from '../backup/index';
import { createTursoClient } from '../connection/turso';

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      out: { type: 'string' },
    },
  });
  if (values.url === undefined || values.out === undefined) {
    console.error('usage: export-control-plane --url <libsql-url> --out <file> (auth: TURSO_AUTH_TOKEN env)');
    return 2;
  }
  const adapter = createTursoClient({ url: values.url, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    const artifact = await exportControlPlane(adapter);
    writeFileSync(values.out, artifact, 'utf8');
    const lineCount = artifact.split('\n').length;
    console.log(JSON.stringify({ ok: true, out: values.out, lines: lineCount }));
    return 0;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    return 1;
  } finally {
    adapter.close();
  }
}

process.exitCode = await main();
