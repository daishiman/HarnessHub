#!/usr/bin/env tsx
/**
 * 既存データを一切変更せず、ローカル seed 利用者の session cookie を再発行する。
 * seed-local.ts と違い DELETE/INSERT を行わないため、期限切れ時に安全に繰り返せる。
 */

import { parseArgs } from 'node:util';
import { createClient } from '@libsql/client/web';
import { isLocalDatabaseUrl, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signLocalSessionJwt } from './local-session';

type AccountKey = 'admin' | 'member';

interface LocalAccountRow {
  readonly user_id: string;
  readonly email: string;
  readonly role: 'workspace-admin' | 'member';
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') throw new Error(`local seed の ${field} が見つかりません`);
  return value;
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      'auth-token': { type: 'string' },
      'session-secret': { type: 'string' },
      account: { type: 'string', default: 'all' },
    },
  });
  const url = values.url ?? process.env.TURSO_DATABASE_URL;
  const authToken = values['auth-token'] ?? process.env.TURSO_AUTH_TOKEN;
  const sessionSecret = values['session-secret'] ?? process.env.AUTH_SESSION_SECRET;
  const requestedAccount = values.account;

  if (url === undefined || url === '' || sessionSecret === undefined || sessionSecret === '') {
    console.error('TURSO_DATABASE_URL と AUTH_SESSION_SECRET が必要です');
    return 2;
  }
  if (!isLocalDatabaseUrl(url) || !/^http:\/\//i.test(url)) {
    console.error('session:local は http://localhost / 127.0.0.1 / [::1] の sqld 専用です');
    return 2;
  }
  if (requestedAccount !== 'all' && requestedAccount !== 'admin' && requestedAccount !== 'member') {
    console.error('--account は admin / member / all のいずれかです');
    return 2;
  }

  const client = createClient({
    url,
    ...(authToken === undefined || authToken === '' ? {} : { authToken }),
  });
  try {
    const scopeResult = await client.execute({
      sql: `SELECT t.id AS tenant_id, w.id AS workspace_id
              FROM tenants t
              JOIN workspaces w ON w.tenant_id = t.id
             WHERE t.slug = ? AND w.slug = ?
             LIMIT 1`,
      args: ['local', 'ws-local'],
    });
    const scope = scopeResult.rows[0];
    const tenantId = asString(scope?.tenant_id, 'tenant_id');
    const workspaceId = asString(scope?.workspace_id, 'workspace_id');

    const usersResult = await client.execute({
      sql: `SELECT u.id AS user_id, u.email, u.role
              FROM users u
              JOIN user_workspaces uw
                ON uw.tenant_id = u.tenant_id
               AND uw.user_id = u.id
               AND uw.workspace_id = ?
             WHERE u.tenant_id = ?
               AND u.status = 'active'
               AND u.email IN ('admin@local.test', 'member@local.test')
             ORDER BY u.email`,
      args: [workspaceId, tenantId],
    });
    const accounts = usersResult.rows.map((row) => ({
      key: row.email === 'admin@local.test' ? ('admin' as const) : ('member' as const),
      userId: asString(row.user_id, 'user_id'),
      email: asString(row.email, 'email'),
      role: asString(row.role, 'role') as LocalAccountRow['role'],
    }));
    const selected = requestedAccount === 'all' ? accounts : accounts.filter((row) => row.key === requestedAccount);
    if (selected.length === 0) throw new Error(`local seed account (${requestedAccount}) が見つかりません`);

    const issuedAt = Math.floor(Date.now() / 1000);
    const cookies: Partial<Record<AccountKey, string>> = {};
    for (const account of selected) {
      cookies[account.key] = await signLocalSessionJwt(
        {
          sub: account.userId,
          tenant_id: tenantId,
          role: account.role,
          status: 'active',
          workspace_ids: [workspaceId],
          iat: issuedAt,
          exp: issuedAt + SESSION_MAX_AGE_SECONDS,
        },
        sessionSecret,
      );
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          tenant: { id: tenantId, slug: 'local' },
          workspace: { id: workspaceId, slug: 'ws-local' },
          accounts: selected,
          session_cookie_name: SESSION_COOKIE_NAME,
          session_cookies: cookies,
          session_expires_at: new Date((issuedAt + SESSION_MAX_AGE_SECONDS) * 1000).toISOString(),
        },
        null,
        2,
      ),
    );
    return 0;
  } finally {
    client.close();
  }
}

process.exitCode = await main();
