// export 成果物の検証 CLI (qa-019)。backup.yml が gzip の前に呼ぶ。
//   pnpm --filter @harness-hub/db exec tsx scripts/verify-export-artifact.ts --file <artifact.jsonl>
//
// 検証の実体は parseExportArtifact に委ねる。あちらは header の形式・format_version・
// coreTables 19 テーブルとの集合一致・header の行数と実際の行数の一致まで fail-closed で見るため、
// 「接続先の schema が異なる」「migration 未適用でテーブルが無い」は必ず落ちる。
// workflow 側で header を grep したり行数を awk で数えたりすると、この検査より弱いものを
// 二重に持つことになり、しかも弱い方が先に判定してしまうので、判定はここに一本化する。

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { parseExportArtifact } from '../backup/index';

function main(): number {
  const { values } = parseArgs({
    options: {
      file: { type: 'string' },
    },
  });
  if (values.file === undefined) {
    console.error('usage: verify-export-artifact --file <artifact.jsonl>');
    return 2;
  }

  let header: { tables: Readonly<Record<string, number>> };
  try {
    header = parseExportArtifact(readFileSync(values.file, 'utf8')).header;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`::error::export 成果物の検証に失敗しました: ${message}`);
    console.error(JSON.stringify({ ok: false, file: values.file, error: message }));
    return 1;
  }

  const tables = header.tables;
  const tableCount = Object.keys(tables).length;
  const totalRows = Object.values(tables).reduce((sum, count) => sum + count, 0);
  const emptyTables = Object.keys(tables).filter((name) => tables[name] === 0);

  // 全テーブル 0 行でも採用する。空の DB を写した断面は restore すれば空の DB が再現するので、
  // qa-019「復元できないバックアップを成功と数えない」には反しない。逆に 0 行を失敗にすると、
  // 稼働直後のまだ利用の無い期間じゅう日次 backup が赤で埋まり、本物の障害がその中に紛れる。
  // 「接続はできたが、同じ schema を持つ意図と違う空 DB を見ていた」可能性は
  // artifact 単体では切り分けられない。ここで保証するのは schema の集合・形式・行数整合であり、
  // 接続先 URL 自体の正当性は GitHub Secret の運用境界で管理する。
  if (totalRows === 0) {
    console.log(`::warning::export した control-plane が全 ${tableCount} テーブル 0 行です。`);
  }
  console.log(`::notice::export 検証 OK: ${tableCount} テーブル / ${totalRows} 行`);
  console.log(JSON.stringify({ ok: true, file: values.file, tableCount, totalRows, emptyTables, tables }));
  return 0;
}

process.exitCode = main();
