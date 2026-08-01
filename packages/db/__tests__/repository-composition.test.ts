// repository の合成点 (createCoreRepositories)。
// 公開面が CoreRepositories の宣言と一致すること、および 1 つの cipher が全体で共有されることを見る。

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { type CoreRepositories, createCoreRepositories } from '../repository/composition';
import { ENCRYPTED_COLUMN_PATTERN } from '../repository/crypto';
import { createRepositoryContext } from '../src/context';
import { asCore, createLibsqlTestDb, TEST_KEK_B64 } from './support/test-db';

// CoreRepositories の宣言と 1:1。ここが増減したら合成点の追随漏れとして落ちる。
// 後半 6 件 (channels 以降) は feat-publish-pipeline で足したもの。
const EXPECTED_KEYS = [
  'audit',
  'channels',
  'deploymentReferences',
  'deviceAuthorizations',
  'idempotency',
  'idpConnections',
  'packages',
  'projects',
  'publishRequests',
  'publisherTokens',
  'releases',
  'sessionRevocations',
  'tenants',
  'userWorkspaces',
  'users',
];

let adapter: TursoAdapter;
let repos: CoreRepositories;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
  repos = createCoreRepositories({ adapter: asCore(adapter), kekBase64: TEST_KEK_B64 });
});

afterEach(() => adapter.close());

describe('createCoreRepositories', () => {
  it('CoreRepositories の 15 フィールドを過不足なく返す', () => {
    expect(Object.keys(repos).sort()).toStrictEqual(EXPECTED_KEYS);
  });

  it('暗号化列を持つ repository が同一 cipher を共有し、暗号文で保存して復号できる', async () => {
    const tenant = await repos.tenants.create({ slug: 'compose', name: '合成テナント', plan: 'free' });
    const context = createRepositoryContext({ tenantId: tenant.id });

    const user = await repos.users.insert(context, {
      idpSubject: 'sub-compose',
      email: 'compose@example.com',
      name: '合成 太郎',
      salary: 6_000_000,
      role: 'member',
      status: 'active',
    });

    expect(user.salary).toMatch(ENCRYPTED_COLUMN_PATTERN);
    expect(user.salary).not.toContain('6000000');
    expect(await repos.users.decryptSalary(context, user.id)).toBe(6_000_000);
  });
});
