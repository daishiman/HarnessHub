// production migration 適用 CLI (qa-038【5】: deploy 前に CI が production Turso へ自動適用する / 手動適用は採らない)。
//   TURSO_AUTH_TOKEN=<secret> pnpm --filter @harness-hub/db exec tsx scripts/migrate-deploy.ts --url <libsql-url>
// drizzle 公式 migrator を通すため、適用台帳 (__drizzle_migrations) が正しく前進する。
// 生 DDL を直接流すと台帳が空のままになり、次回の migrate が 0000 を再適用して必ず失敗するため採らない。
// --dry-run は接続と未適用件数の確認だけを行い、DDL を適用しない (リリース前の事前確認用)。

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createTursoClient } from '../connection/turso';

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations');

interface JournalEntry {
  readonly idx: number;
  readonly tag: string;
}

function errorMessages(error: unknown): string {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current !== null && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) messages.push(current.message);
    current = (current as { readonly cause?: unknown }).cause;
  }
  return messages.join('\n');
}

function journalTags(migrationsDir: string): string[] {
  const journal = JSON.parse(readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf8')) as {
    readonly entries: readonly JournalEntry[];
  };
  return [...journal.entries].sort((a, b) => a.idx - b.idx).map((e) => e.tag);
}

/** 適用台帳の行数。台帳テーブル未作成 (= 初回適用前) は 0 を返す。 */
async function appliedCount(adapter: ReturnType<typeof createTursoClient>): Promise<number> {
  try {
    const rows = await adapter.client.all<{ c: number }>(sql`select count(*) as c from __drizzle_migrations`);
    return Number(rows[0]?.c ?? 0);
  } catch (error) {
    const message = errorMessages(error);
    // 初回適用前だけを 0 件として扱う。認証・接続・SQL の失敗まで握りつぶすと、
    // dry-run が「接続できた」と誤報するため、それ以外は呼出し元へ伝播させる。
    if (/no such table:?\s*__drizzle_migrations/i.test(message)) return 0;
    throw error;
  }
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      'migrations-dir': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const url = values.url ?? process.env.TURSO_DATABASE_URL;
  if (url === undefined || url === '') {
    console.error('usage: migrate-deploy --url <libsql-url> [--dry-run] (auth: TURSO_AUTH_TOKEN env)');
    return 2;
  }
  const migrationsFolder = values['migrations-dir'] ?? MIGRATIONS_DIR;
  const adapter = createTursoClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    const tags = journalTags(migrationsFolder);
    if (tags.length === 0) throw new Error('migration journal が空です');
    const before = await appliedCount(adapter);
    if (before > tags.length) {
      throw new Error(`migration 台帳 (${before}) が journal (${tags.length}) より先行しています`);
    }
    if (values['dry-run'] === true) {
      console.log(
        JSON.stringify({
          ok: true,
          dryRun: true,
          journal: tags.length,
          applied: before,
          pending: tags.length - before,
        }),
      );
      return 0;
    }
    await migrate(adapter.client, { migrationsFolder });
    const after = await appliedCount(adapter);
    console.log(
      JSON.stringify({
        ok: true,
        dryRun: false,
        journal: tags.length,
        appliedBefore: before,
        appliedAfter: after,
        tags,
      }),
    );
    // 台帳が journal 件数へ到達していなければ「適用したつもり」を成功にしない (fail-closed)。
    return after === tags.length ? 0 : 1;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: errorMessages(error) || String(error) }));
    return 1;
  } finally {
    adapter.close();
  }
}

process.exitCode = await main();
