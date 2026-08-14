#!/usr/bin/env tsx
/**
 * 本番テナントの初期マスタ投入 CLI。
 *
 *   # 1) 何が起きるかだけ見る (既定。書き込まない)
 *   TURSO_AUTH_TOKEN=<secret> pnpm --filter @harness-hub/db exec tsx scripts/bootstrap-tenant.ts \
 *     --url libsql://<db>.turso.io \
 *     --tenant-slug acme --tenant-name 'ACME 株式会社' \
 *     --workspace-slug default --workspace-name '既定 Workspace' \
 *     --admin-email admin@acme.example
 *
 *   # 2) 実際に投入する
 *   ... 同じ引数 --apply
 *
 * 冪等。既存行は書き換えず、無い行だけを足す。削除は行わない。
 * 昇格対象の利用者が居ない場合は exit 1 (先に本人が 1 回サインインする必要がある)。
 */

import { parseArgs } from 'node:util';

import { createTursoClient } from '../connection/turso';
import type { CoreAdapter } from '../repository/db';
import { bootstrapTenant } from './bootstrap-tenant-core';

/**
 * cause 連鎖を全部つなげる (migrate-deploy.ts と同じ理由)。
 * libSQL は認証・接続の失敗を「実行したクエリ」の Error で包むので、`error.message` だけ読むと
 * 資格情報の誤りが SQL の誤りに見える。原因の層まで出さないと切り分けができない。
 */
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

const USAGE = [
  'usage: bootstrap-tenant --url <libsql-url> --tenant-slug <slug> --tenant-name <name>',
  '                        --workspace-slug <slug> --workspace-name <name>',
  '                        [--plan free] [--admin-email <email>] [--apply]',
  'auth: TURSO_AUTH_TOKEN env / 既定は dry-run (--apply を付けるまで書き込まない)',
].join('\n');

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      'tenant-slug': { type: 'string' },
      'tenant-name': { type: 'string' },
      plan: { type: 'string', default: 'free' },
      'workspace-slug': { type: 'string' },
      'workspace-name': { type: 'string' },
      'admin-email': { type: 'string' },
      apply: { type: 'boolean', default: false },
    },
  });

  const url = values.url ?? process.env.TURSO_DATABASE_URL;
  if (url === undefined || url === '') {
    console.error(USAGE);
    return 2;
  }

  const adapter = createTursoClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    const report = await bootstrapTenant(adapter as unknown as CoreAdapter, {
      tenantSlug: values['tenant-slug'] ?? '',
      tenantName: values['tenant-name'] ?? '',
      plan: values.plan ?? 'free',
      workspaceSlug: values['workspace-slug'] ?? '',
      workspaceName: values['workspace-name'] ?? '',
      adminEmail: values['admin-email'],
      apply: values.apply === true,
    });
    console.log(JSON.stringify(report, null, 2));
    return report.ok ? 0 : 1;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: errorMessages(error) || String(error) }));
    return 1;
  } finally {
    adapter.close();
  }
}

process.exitCode = await main();
