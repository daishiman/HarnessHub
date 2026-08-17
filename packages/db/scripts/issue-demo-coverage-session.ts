#!/usr/bin/env tsx
/**
 * demo coverage seed の 3 actor に対応する、手元の実画面監査専用 session 発行 CLI。
 *
 * DB は読み取りのみ。demo/main の active 利用者・role・Workspace 所属が
 * seed 契約と完全一致したときだけ、本番と同じ HS256 session を一括発行する。
 * Secret は shell history に残る引数では受けず、AUTH_SESSION_SECRET だけから読む。
 */

import { parseArgs } from 'node:util';

import { createClient } from '@libsql/client';

import { isLocalDatabaseUrl, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signLocalSessionJwt } from './local-session';

const TENANT_SLUG = 'demo';
const WORKSPACE_SLUG = 'main';

const ACTORS = [
  { key: 'member', email: 'member@demo.example.com', role: 'member' },
  {
    key: 'workspace-admin',
    email: 'workspace-admin@demo.example.com',
    role: 'workspace-admin',
  },
  {
    key: 'provider-admin',
    email: 'provider-admin@demo.example.com',
    role: 'provider-admin',
  },
] as const;

type ActorKey = (typeof ACTORS)[number]['key'];

interface DemoAccount {
  readonly key: ActorKey;
  readonly userId: string;
  readonly email: string;
  readonly role: ActorKey;
}

class DemoSessionContractError extends Error {}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new DemoSessionContractError(`demo coverage の ${label} が見つかりません`);
  }
  return value;
}

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { url: { type: 'string' } } });
  const url = values.url ?? process.env.TURSO_DATABASE_URL;

  if (url === undefined || url === '') {
    console.error('TURSO_DATABASE_URL または --url が必要です');
    return 2;
  }
  if (!isLocalDatabaseUrl(url)) {
    console.error('session:demo-coverage はローカル DB 専用です');
    return 2;
  }

  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (sessionSecret === undefined || sessionSecret === '') {
    console.error('AUTH_SESSION_SECRET が必要です');
    return 2;
  }

  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({
    url,
    ...(authToken === undefined || authToken === '' ? {} : { authToken }),
  });

  try {
    const scopeResult = await client.execute({
      sql: `SELECT t.id AS tenant_id, w.id AS workspace_id
              FROM tenants t
              JOIN workspaces w ON w.tenant_id = t.id
             WHERE t.slug = ?
               AND t.status = 'active'
               AND w.slug = ?`,
      args: [TENANT_SLUG, WORKSPACE_SLUG],
    });
    if (scopeResult.rows.length !== 1) {
      throw new DemoSessionContractError('demo coverage scope (demo/main) が一意に見つかりません');
    }
    const scope = scopeResult.rows[0];
    const tenantId = requiredString(scope?.tenant_id, 'tenant_id');
    const workspaceId = requiredString(scope?.workspace_id, 'workspace_id');

    const usersResult = await client.execute({
      sql: `SELECT u.id AS user_id, u.email, u.role, u.status
              FROM users u
              JOIN user_workspaces uw
                ON uw.tenant_id = u.tenant_id
               AND uw.user_id = u.id
               AND uw.workspace_id = ?
             WHERE u.tenant_id = ?
               AND u.email IN (?, ?, ?)`,
      args: [workspaceId, tenantId, ...ACTORS.map((actor) => actor.email)],
    });
    if (usersResult.rows.length !== ACTORS.length) {
      throw new DemoSessionContractError('demo coverage actor の件数が seed 契約と一致しません');
    }

    const rowsByEmail = new Map(usersResult.rows.map((row) => [requiredString(row.email, 'email'), row]));
    const accounts: DemoAccount[] = ACTORS.map((actor) => {
      const row = rowsByEmail.get(actor.email);
      if (row === undefined) {
        throw new DemoSessionContractError(
          `demo coverage actor (${actor.key}) の active Workspace 所属が見つかりません`,
        );
      }
      const status = requiredString(row.status, `${actor.key}.status`);
      const role = requiredString(row.role, `${actor.key}.role`);
      if (status !== 'active' || role !== actor.role) {
        throw new DemoSessionContractError(`demo coverage actor (${actor.key}) が seed 契約と一致しません`);
      }
      return {
        key: actor.key,
        userId: requiredString(row.user_id, `${actor.key}.user_id`),
        email: actor.email,
        role: actor.role,
      };
    });

    // 上の完全性検査が全て通るまで token は 1 本も作らない。
    const issuedAt = Math.floor(Date.now() / 1000);
    const sessionCookies = {} as Record<ActorKey, string>;
    for (const account of accounts) {
      sessionCookies[account.key] = await signLocalSessionJwt(
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
      JSON.stringify({
        ok: true,
        tenant: { id: tenantId, slug: TENANT_SLUG },
        workspace: { id: workspaceId, slug: WORKSPACE_SLUG },
        accounts,
        session_cookie_name: SESSION_COOKIE_NAME,
        session_cookies: sessionCookies,
        session_expires_at: new Date((issuedAt + SESSION_MAX_AGE_SECONDS) * 1000).toISOString(),
      }),
    );
    return 0;
  } finally {
    client.close();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(
      error instanceof DemoSessionContractError ? error.message : 'demo coverage session の発行に失敗しました',
    );
    process.exitCode = 1;
  });
