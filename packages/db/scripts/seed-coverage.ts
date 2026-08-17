#!/usr/bin/env tsx
/**
 * 網羅確認用デモデータの投入 CLI (開発者の手元専用)。
 *
 *   pnpm --filter @harness-hub/db exec tsx scripts/seed-coverage.ts --url <ローカル DB の URL>
 *
 * 28 画面 × 5 状態 × ドメイン enum 全値を 1 回で用意する。投入の中身は
 * `demo-coverage/seed.ts` が持ち、この file は「どこへ入れてよいか」の判断と
 * schema の用意だけを担う。
 *
 * 接続先の判定は既存の `isLocalDatabaseUrl` をそのまま使う。ここで同じ判定を書き直すと、
 * 片方だけ緩んだときに本番へ向く経路が生まれる (ADR §8.2 の G4)。
 */

import { parseArgs } from 'node:util';

import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { sql } from 'drizzle-orm';

import { applyDdlStatements } from '../backup/ddl';
import { createTursoClient } from '../connection/turso';
import type { CoreAdapter } from '../repository/db';
import * as schema from '../schema/index';
import { seedDemoCoverage } from './demo-coverage/seed';
import { isLocalDatabaseUrl } from './local-session';

/** schema barrel を唯一の入力として CREATE 文を導出する (canonical migration に依存しない)。 */
async function schemaDdl(): Promise<string[]> {
  const empty = await generateSQLiteDrizzleJson({});
  const current = await generateSQLiteDrizzleJson(schema as unknown as Record<string, unknown>);
  return generateSQLiteMigration(empty, current);
}

/**
 * 表が無ければ作る。
 *
 * 手元の空 DB をそのまま渡せるようにするための処理で、既に表がある DB には触れない。
 * seed 側で判断すると、テスト (schema 適用済みの DB を渡す) と CLI で経路が分かれてしまう。
 */
async function ensureSchema(adapter: CoreAdapter): Promise<boolean> {
  const rows = (await adapter.client.all(
    sql`select name from sqlite_master where type = 'table' and name = 'tenants'`,
  )) as unknown[];
  if (rows.length > 0) return false;
  // ローカルの file backend は接続ごとに journal を共有する。WAL にしないと
  // 並行 reader の SHARED ロックが writer の COMMIT を塞ぐ。
  await applyDdlStatements(adapter, ['PRAGMA journal_mode=WAL', ...(await schemaDdl())]);
  return true;
}

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { url: { type: 'string' } } });
  const url = values.url ?? process.env.TURSO_DATABASE_URL;

  // URL の判定は他のどの検査よりも先に行う (test-design.md §3.4)。
  // 引数不足の案内を先に返すと、誤った接続先を渡した実行が「引数の問題」に見えてしまう。
  if (url === undefined || url === '') {
    console.error('usage: seed-coverage --url file:<path>');
    return 2;
  }
  if (!isLocalDatabaseUrl(url)) {
    const received = `受け取った URL: ${url}`;
    console.error(`seed-coverage はローカル DB 専用です (file: / http://127.0.0.1 / http://localhost。${received})`);
    return 2;
  }

  const adapter = createTursoClient({ url }) as unknown as CoreAdapter;
  try {
    const created = await ensureSchema(adapter);
    const summary = await seedDemoCoverage({ adapter });
    const total = Object.values(summary.counts).reduce((sum, count) => sum + count, 0);

    console.log(created ? 'スキーマを新規作成しました。' : '既存のスキーマを使いました。');
    for (const table of Object.keys(summary.counts).sort()) {
      console.log(`  ${table}: ${summary.counts[table]} 件`);
    }
    console.log(`合計 ${Object.keys(summary.counts).length} テーブル / ${total} 件を投入しました。`);
    return 0;
  } finally {
    (adapter as unknown as { close?: () => void }).close?.();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
