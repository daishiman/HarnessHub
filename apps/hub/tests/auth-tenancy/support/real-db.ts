/**
 * 実 DB (libSQL) 上に `AuthPorts` を組み立てるテスト支援 (HarnessHub-b7ng)。
 *
 * in-memory ダブルは port の**契約**を検証するためのもので、
 *   - 時刻の単位 (DB はミリ秒 / port は秒)
 *   - `scopes_json` の直列化
 *   - `UPDATE ... WHERE status = ? RETURNING` による CAS の実挙動
 *   - UNIQUE 制約
 * といった「永続化側にしか無い性質」は写せない。ここはそれを実 driver で踏むための足場。
 *
 * schema は **canonical migration SQL をそのまま流す**。drizzle schema barrel から DDL を導出する
 * `packages/db/__tests__/support/schema-harness.ts` は package 内部の test 専用モジュールで、
 * ここから import すると共通層の境界迂回 (deep import) になる。加えて migration を流す方式は
 * 「本番へ実際に適用される DDL」を検証対象にできる。
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
  createRepositoryContext,
  createTursoClient,
  splitMigrationSql,
} from '@harness-hub/db';
import { createDbAuthPorts } from '../../../src/lib/auth/db-ports.js';
import type { AuthPorts } from '../../../src/lib/auth/ports.js';
import { createMutableClock, type MutableClock } from './in-memory-ports.js';

/** テスト用 KEK (32 byte)。本番 KEK は Workers Secret にのみ存在する。 */
const TEST_KEK_B64 = Buffer.alloc(32, 7).toString('base64');

const HERE = dirname(fileURLToPath(import.meta.url));
/**
 * migration の置き場。**import ではなく path 参照**にしてある。
 * packages/db を相対 path で import すると共通層の境界迂回として
 * scripts/ci/check-shared-layer-duplicates.mjs に落ちる。SQL は成果物 (データ) であって
 * モジュールではないので、読み込みは fs 経由にしてモジュール境界を越えない。
 */
const MIGRATIONS_DIR = join(HERE, '..', '..', '..', '..', '..', 'packages', 'db', 'migrations');

/**
 * 適用順。drizzle の journal と同じ順序を明示する (glob で拾うと順序が環境依存になる)。
 *
 * 0002 (hearing intake) は認証に関わる表を触らないので載せない。ここは認証 port の足場であり、
 * 無関係な migration を足すと「この harness が何を前提にしているか」が読めなくなる。
 * 0003 は `idp_connections` に列を足すので必須。
 */
const MIGRATIONS = [
  '0000_baseline-core-domain.sql',
  '0001_auth-tenancy-device-flow-contract.sql',
  '0003_auth-tenancy-shared-google-oidc.sql',
];

export interface RealDbHarness {
  readonly repositories: CoreRepositories;
  readonly ports: AuthPorts;
  readonly clock: MutableClock;
  close(): void;
}

/**
 * 時計の起点を**実時刻より 5 分前**に置く。
 * repository 側の `created_at` / `revoked_at` は `serverNow()` (実時刻) で入るため、
 * port 側の時計を未来に置くと「発行済み token の iat が失効時刻より新しい」状態になり、
 * 失効判定が通らない偽陰性になる。
 */
const CLOCK_START_OFFSET_SECONDS = 300;

export async function createRealDbHarness(): Promise<RealDbHarness> {
  const tempDir = mkdtempSync(join(tmpdir(), 'hub-auth-libsql-'));
  const file = join(tempDir, 'test.db');

  const adapter = createTursoClient({ url: `file:${file}` });

  // DDL は **adapter 経由**で流す。sqlite を直に開くと
  // packages/db/scripts/check-connection-layer-isolation.ts が「driver 直参照」として落とす
  // (型 import すら禁止。DB アクセスを packages/db に閉じることの機械証明なので迂回しない)。
  //
  // WAL に切り替えるのは、libSQL のローカル backend が接続ごとに journal を共有するため。
  // WAL でないと並行 reader の SHARED ロックが writer の COMMIT を塞ぎ、
  // 本番 (Turso server) には無い偽の BUSY が出る。
  await applyDdlStatements(adapter, [
    'PRAGMA journal_mode=WAL',
    ...MIGRATIONS.flatMap((name) => splitMigrationSql(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))),
  ]);
  const repositories = createCoreRepositories({ adapter, kekBase64: TEST_KEK_B64 });
  const clock = createMutableClock(Math.floor(Date.now() / 1000) - CLOCK_START_OFFSET_SECONDS);

  return {
    repositories,
    ports: createDbAuthPorts({ repositories, clock }),
    clock,
    close(): void {
      adapter.close();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export interface SeededTenant {
  readonly tenantId: string;
  readonly tenantSlug: string;
  readonly userId: string;
  readonly workspaceId: string;
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

/**
 * 1 テナント分の最小構成 (tenant + idp_connection + user + 所属) を作る。
 *
 * `workspaceId` は `user_workspaces` の所属行としてのみ入れる。`workspaces` 表への行追加は
 * feat-user-org-admin の経路であり、認証・device flow の判定はどれも所属側しか読まない。
 */
export async function seedTenant(
  harness: RealDbHarness,
  input: { readonly slug: string; readonly name: string; readonly issuer: string; readonly clientSecret: string },
): Promise<SeededTenant> {
  const tenant = await harness.repositories.tenants.create({
    slug: input.slug,
    name: input.name,
    plan: 'standard',
  });
  const context = createRepositoryContext({ tenantId: tenant.id });
  const clientId = `client-${input.slug}`;

  await harness.repositories.idpConnections.insert(context, {
    issuerUrl: input.issuer,
    clientId,
    clientSecret: input.clientSecret,
    scopes: 'openid profile email',
  });

  const user = await harness.repositories.users.insert(context, {
    idpSubject: `sub-${input.slug}`,
    email: `owner@${input.slug}.example.com`,
    name: `${input.name} owner`,
    role: 'member',
    status: 'active',
  });

  const workspaceId = `ws-${input.slug}`;
  await harness.repositories.userWorkspaces.add(context, { userId: user.id, workspaceId });

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: user.id,
    workspaceId,
    issuer: input.issuer,
    clientId,
    clientSecret: input.clientSecret,
  };
}
