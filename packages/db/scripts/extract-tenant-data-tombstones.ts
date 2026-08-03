// 日次 export artifact から tenant_data の tombstone manifest を抽出する CLI。
// 古い backup の復元時は、削除後のより新しい artifact から作った manifest を
// restore-control-plane.ts --tombstone-manifest へ渡す。

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { parseExportArtifact, tenantDataTombstoneManifestFromArtifact } from '../backup/index';

function main(): number {
  const { values } = parseArgs({ options: { in: { type: 'string' }, out: { type: 'string' } } });
  if (values.in === undefined || values.out === undefined) {
    console.error('usage: extract-tenant-data-tombstones --in <daily-export.jsonl> --out <manifest.json>');
    return 2;
  }
  try {
    const artifact = parseExportArtifact(readFileSync(values.in, 'utf8'));
    const manifest = tenantDataTombstoneManifestFromArtifact(artifact);
    writeFileSync(values.out, `${JSON.stringify(manifest)}\n`, 'utf8');
    console.log(JSON.stringify({ ok: true, out: values.out, tombstones: manifest.tombstones.length }));
    return 0;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    return 1;
  }
}

process.exitCode = main();
