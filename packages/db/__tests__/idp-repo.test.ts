// idp_connections リポジトリ — client_secret の封筒暗号化保存 (security-spec §4.3)。
// 既定の読取経路が平文を返さないこと、復号が明示呼出しに限られることを確認する。

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import type { ColumnCipher } from '../repository/crypto';
import { createIdpConnectionsRepo, type IdpConnectionsRepo } from '../repository/idp';
import { createTenantsRepo } from '../repository/tenants';
import { createRepositoryContext } from '../src/context';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

const SECRET = 'super-secret-idp-value';

let adapter: TursoAdapter;
let cipher: ColumnCipher;
let repo: IdpConnectionsRepo;
let context: RepositoryContext;
let otherContext: RepositoryContext;

async function newContext(slug: string): Promise<RepositoryContext> {
  const tenant = await createTenantsRepo(asCore(adapter)).create({ slug, name: `Tenant ${slug}`, plan: 'free' });
  return createRepositoryContext({ tenantId: tenant.id });
}

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
  cipher = testCipher(asCore(adapter));
  repo = createIdpConnectionsRepo(asCore(adapter), cipher);
  context = await newContext('idp-a');
  otherContext = await newContext('idp-b');
});

afterAll(() => adapter.close());

describe('idp_connections の保存', () => {
  it('insert は clientSecret を暗号化して保存し、平文を返さない', async () => {
    const row = await repo.insert(context, {
      issuerUrl: 'https://idp.example.com/insert',
      clientId: 'client-insert',
      clientSecret: SECRET,
      scopes: 'openid email',
    });

    expect(row.tenantId).toBe(context.tenantId);
    expect(row.clientSecretEnc).not.toContain(SECRET);
    // `{key_version}:{iv}:{ct}:{tag}` の 4 要素
    expect(row.clientSecretEnc.split(':')).toHaveLength(4);
  });

  it('findById は暗号文のまま返し、存在しない id は null になる', async () => {
    const created = await repo.insert(context, {
      issuerUrl: 'https://idp.example.com/find',
      clientId: 'client-find',
      clientSecret: SECRET,
      scopes: 'openid',
    });

    const found = await repo.findById(context, created.id);
    expect(found?.clientId).toBe('client-find');
    expect(found?.clientSecretEnc).toBe(created.clientSecretEnc);
    expect(await repo.findById(context, 'missing-id')).toBeNull();
  });

  it('list は自テナントの接続だけを返す', async () => {
    const listContext = await newContext('idp-list');
    await repo.insert(listContext, {
      issuerUrl: 'https://idp.example.com/list-1',
      clientId: 'client-list-1',
      clientSecret: SECRET,
      scopes: 'openid',
    });
    await repo.insert(listContext, {
      issuerUrl: 'https://idp.example.com/list-2',
      clientId: 'client-list-2',
      clientSecret: SECRET,
      scopes: 'openid',
    });
    await repo.insert(otherContext, {
      issuerUrl: 'https://idp.example.com/list-other',
      clientId: 'client-list-other',
      clientSecret: SECRET,
      scopes: 'openid',
    });

    const rows = await repo.list(listContext);
    expect(rows.map((row) => row.clientId).sort()).toStrictEqual(['client-list-1', 'client-list-2']);
  });
});

describe('client_secret の復号', () => {
  it('decryptClientSecret は明示呼出しのときだけ平文へ戻す', async () => {
    const created = await repo.insert(context, {
      issuerUrl: 'https://idp.example.com/decrypt',
      clientId: 'client-decrypt',
      clientSecret: SECRET,
      scopes: 'openid',
    });
    expect(await repo.decryptClientSecret(context, created.id)).toBe(SECRET);
  });

  it('存在しない id では EntityNotFoundError になる', async () => {
    await expect(repo.decryptClientSecret(context, 'missing-id')).rejects.toThrow(EntityNotFoundError);
    await expect(repo.decryptClientSecret(context, 'missing-id')).rejects.toThrow(/idp_connections が見つかりません/);
  });

  it('他テナントの id は見えず、復号もできない', async () => {
    const created = await repo.insert(otherContext, {
      issuerUrl: 'https://idp.example.com/cross-tenant',
      clientId: 'client-cross',
      clientSecret: SECRET,
      scopes: 'openid',
    });
    expect(await repo.findById(context, created.id)).toBeNull();
    await expect(repo.decryptClientSecret(context, created.id)).rejects.toThrow(EntityNotFoundError);
  });
});

describe('idp_connections の削除', () => {
  it('deleteById は自テナントの行だけを消す', async () => {
    const mine = await repo.insert(context, {
      issuerUrl: 'https://idp.example.com/delete-mine',
      clientId: 'client-delete-mine',
      clientSecret: SECRET,
      scopes: 'openid',
    });
    const theirs = await repo.insert(otherContext, {
      issuerUrl: 'https://idp.example.com/delete-theirs',
      clientId: 'client-delete-theirs',
      clientSecret: SECRET,
      scopes: 'openid',
    });

    await repo.deleteById(context, theirs.id);
    expect(await repo.findById(otherContext, theirs.id)).not.toBeNull();

    await repo.deleteById(context, mine.id);
    expect(await repo.findById(context, mine.id)).toBeNull();
  });
});
