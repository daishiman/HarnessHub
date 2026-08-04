/**
 * 実 DB (libSQL) 上に `CoreRepositories` + `HearingIntakeRepository` を組み立てるテスト支援。
 *
 * `apps/hub/tests/auth-tenancy/support/real-db.ts` と同じ理由 (in-memory ダブルでは永続化側にしか
 * 無い性質を踏めない) で real DB を使うが、載せる migration が異なる:
 *   - `users`/`user_settings`/`audit_events`/`session_revocations` は 0000 (baseline) にある
 *   - `tenant_coefficients` (AD-4 の見積係数、GET /api/v1/tenant/coefficients が読む) は 0002 にある
 *   - `encryption_keys.tenant_id`（共有 `ColumnCipher` が常に参照する）は 0006 にある
 * auth-tenancy 側は 0002 を意図的に除外しているため、この feature 専用の harness をここに持つ
 * (認証系 harness を書き換えて依存を増やさない)。0001/0003/0004 (idp_connections 関連) は
 * user-org-admin のどの route も読まないため載せない。0006 の tenant-data table 自体は読まないが、
 * 同 migration に含まれる encryption key 台帳の互換 DDL は salary 暗号化に必須である。
 *
 * `:memory:` を使わないこと。@libsql/client のローカル backend は transaction ごとに別接続を開くため、
 * in-memory では transaction 内からスキーマが見えない (packages/db 側と同じ制約)。
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDdlStatements,
  type CoreRepositories,
  createCoreRepositories,
  createHearingIntakeRepository,
  createRepositoryContext,
  createTursoClient,
  type HearingIntakeRepository,
  splitMigrationSql,
} from '@harness-hub/db';
import { createDbAuthPorts } from '../../../src/lib/auth/db-ports.js';
import type { AuthPorts } from '../../../src/lib/auth/ports.js';
import { createMutableClock, type MutableClock } from '../../auth-tenancy/support/in-memory-ports.js';

/** テスト用 KEK (32 byte)。本番 KEK は Workers Secret にのみ存在する。 */
const TEST_KEK_B64 = Buffer.alloc(32, 9).toString('base64');

const HERE = dirname(fileURLToPath(import.meta.url));
/** 相対 path 参照にする理由は auth-tenancy 版と同じ (共通層の境界迂回を避ける)。 */
const MIGRATIONS_DIR = join(HERE, '..', '..', '..', '..', '..', 'packages', 'db', 'migrations');

const MIGRATIONS = [
  '0000_baseline-core-domain.sql',
  '0002_hearing-intake-ai-queue.sql',
  '0006_tenant-data-retention.sql',
];

export interface RealDbHarness {
  readonly repositories: CoreRepositories;
  readonly hearingIntake: HearingIntakeRepository;
  readonly ports: AuthPorts;
  readonly clock: MutableClock;
  close(): void;
}

/** 認証系 harness と同じく、実時刻より前に置く (iat が exp より新しくなる偽陰性を避ける)。 */
const CLOCK_START_OFFSET_SECONDS = 300;

export async function createRealDbHarness(): Promise<RealDbHarness> {
  const tempDir = mkdtempSync(join(tmpdir(), 'hub-user-org-admin-libsql-'));
  const file = join(tempDir, 'test.db');

  const adapter = createTursoClient({ url: `file:${file}` });

  await applyDdlStatements(adapter, [
    'PRAGMA journal_mode=WAL',
    ...MIGRATIONS.flatMap((name) => splitMigrationSql(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))),
  ]);
  const repositories = createCoreRepositories({ adapter, kekBase64: TEST_KEK_B64 });
  const hearingIntake = createHearingIntakeRepository(adapter);
  const clock = createMutableClock(Math.floor(Date.now() / 1000) - CLOCK_START_OFFSET_SECONDS);

  return {
    repositories,
    hearingIntake,
    ports: createDbAuthPorts({ repositories, clock }),
    clock,
    close(): void {
      adapter.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export interface SeededUser {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly role: 'provider-admin' | 'workspace-admin' | 'member';
}

/**
 * 1 テナントと役割別ユーザーを作る。`idp_connections` には触れない
 * (session は `signSessionToken` で直接発行し、OIDC ログイン経路自体は検査対象外のため)。
 */
export async function seedUserOrgAdminTenant(
  harness: RealDbHarness,
  input: { readonly slug: string; readonly name: string },
): Promise<{
  readonly tenantId: string;
  readonly providerAdmin: SeededUser;
  readonly workspaceAdmin: SeededUser;
  readonly member: SeededUser;
}> {
  const tenant = await harness.repositories.tenants.create({ slug: input.slug, name: input.name, plan: 'standard' });
  const context = createRepositoryContext({ tenantId: tenant.id });

  async function insertUser(
    role: SeededUser['role'],
    overrides: { readonly email: string; readonly name: string; readonly salary?: number | null },
  ): Promise<SeededUser> {
    const row = await harness.repositories.users.insert(context, {
      idpSubject: `idp-${overrides.email}`,
      email: overrides.email,
      name: overrides.name,
      role,
      status: 'active',
      ...(overrides.salary !== undefined && { salary: overrides.salary }),
    });
    return { id: row.id, tenantId: tenant.id, email: row.email, role };
  }

  const providerAdmin = await insertUser('provider-admin', {
    email: `provider-admin@${input.slug}.example.com`,
    name: 'Provider Admin',
  });
  const workspaceAdmin = await insertUser('workspace-admin', {
    email: `workspace-admin@${input.slug}.example.com`,
    name: 'Workspace Admin',
  });
  const member = await insertUser('member', {
    email: `member@${input.slug}.example.com`,
    name: 'Member',
    salary: 4_800_000,
  });

  return { tenantId: tenant.id, providerAdmin, workspaceAdmin, member };
}
