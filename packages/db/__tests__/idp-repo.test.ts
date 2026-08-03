// idp_connections リポジトリ — client_secret の封筒暗号化保存 (security-spec §4.3)。
// 既定の読取経路が平文を返さないこと、復号が明示呼出しに限られることを確認する。

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import type { ColumnCipher } from '../repository/crypto';
import {
  createIdpConnectionsRepo,
  type IdpConnectionsRepo,
  SharedCredentialSecretAccessError,
} from '../repository/idp';
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

/**
 * 共通 Google OAuth client 方式 (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * このブロックより上のテストは 1 行も変えていない。それ自体が受入条件 5
 * (既存の顧客持ち込み方式が影響を受けない) の証拠になる — `credentialMode` を
 * 必須にしていたら、全ての insert 呼び出しが書き換えになっていた。
 */
describe('共通 client 方式の接続', () => {
  /**
   * 共有方式のテナントは issuer が必ず `accounts.google.com` になる。
   * `(tenant_id, issuer_url)` は UNIQUE なので、テストごとにテナントを分ける
   * (issuer を実在しない値へずらすと、この方式の前提を写さないテストになる)。
   */
  const GOOGLE_ISSUER = 'https://accounts.google.com';

  it('共有方式の行は client_id も client_secret も持たない (受入条件 4)', async () => {
    const sharedContext = await newContext('idp-shared-columns');
    const row = await repo.insert(sharedContext, {
      credentialMode: 'shared_google',
      issuerUrl: GOOGLE_ISSUER,
      scopes: 'openid email profile',
      allowedWorkspaceDomains: ['shared-corp.example'],
    });

    expect(row.credentialMode).toBe('shared_google');
    // 空文字は「credential を持たない」ことの表現。暗号文の 4 要素形ではない
    expect(row.clientId).toBe('');
    expect(row.clientSecretEnc).toBe('');
    expect(row.clientSecretEnc.split(':')).toHaveLength(1);
    expect(row.allowedWorkspaceDomains).toBe('["shared-corp.example"]');
  });

  it('共有方式の行へ secret 復号を求めると失敗する (空文字を secret として返さない)', async () => {
    const sharedContext = await newContext('idp-shared-decrypt');
    const row = await repo.insert(sharedContext, {
      credentialMode: 'shared_google',
      issuerUrl: GOOGLE_ISSUER,
      scopes: 'openid',
      allowedWorkspaceDomains: ['shared-decrypt.example'],
    });

    await expect(repo.decryptClientSecret(sharedContext, row.id)).rejects.toThrow(SharedCredentialSecretAccessError);
    // 呼び出し側が「空の secret で認証を試みる」経路へ落ちないことが要点
    await expect(repo.decryptClientSecret(sharedContext, row.id)).rejects.toThrow(/client_secret を持ちません/);
  });

  it('許可 Workspace ドメインが空の共有接続は作れない (誰でも入れる接続を残さない)', async () => {
    const sharedContext = await newContext('idp-shared-empty-domains');
    await expect(
      repo.insert(sharedContext, {
        credentialMode: 'shared_google',
        issuerUrl: GOOGLE_ISSUER,
        scopes: 'openid',
        allowedWorkspaceDomains: [],
      }),
    ).rejects.toThrow(/許可 Workspace ドメイン/);

    // 拒否は書き込み前。行そのものが残っていない
    expect(await repo.list(sharedContext)).toEqual([]);
  });

  it('顧客方式は credentialMode を省略しても既定で customer_google になる (受入条件 5)', async () => {
    const row = await repo.insert(context, {
      issuerUrl: 'https://idp.example.com/default-mode',
      clientId: 'client-default-mode',
      clientSecret: SECRET,
      scopes: 'openid',
    });

    expect(row.credentialMode).toBe('customer_google');
    // 許可ドメイン未指定は NULL。`'[]'` と 2 状態にしない
    expect(row.allowedWorkspaceDomains).toBeNull();
    expect(await repo.decryptClientSecret(context, row.id)).toBe(SECRET);
  });

  it('顧客方式でも許可 Workspace ドメインは設定できる', async () => {
    const row = await repo.insert(context, {
      issuerUrl: 'https://idp.example.com/customer-domains',
      clientId: 'client-customer-domains',
      clientSecret: SECRET,
      scopes: 'openid',
      allowedWorkspaceDomains: ['customer-corp.example'],
    });

    expect(row.credentialMode).toBe('customer_google');
    expect(row.allowedWorkspaceDomains).toBe('["customer-corp.example"]');
  });

  it('共有方式の行もテナント境界を越えて見えない', async () => {
    const sharedContext = await newContext('idp-shared-isolation');
    const row = await repo.insert(sharedContext, {
      credentialMode: 'shared_google',
      issuerUrl: GOOGLE_ISSUER,
      scopes: 'openid',
      allowedWorkspaceDomains: ['other-corp.example'],
    });

    // 共有 client を使っていても行は依然テナント所有物。読取は tenant_id で閉じる
    expect(await repo.findById(context, row.id)).toBeNull();
    await expect(repo.decryptClientSecret(context, row.id)).rejects.toThrow(EntityNotFoundError);
  });
});

describe('migration 0003 の後方互換 (rollback 安全性)', () => {
  it('2 列を足す前の形で書かれた行は customer_google として読め、secret も復号できる', async () => {
    // 0003 以前の writer — つまり app を rollback した状態 — を再現する。
    // repository を通さず、**追加した 2 列を INSERT 文から落として**書く。
    // repository 側の TS 既定値が効かない経路なので、値を決めるのは列の DB 既定値だけになる。
    const rowId = 'idp-pre-0003';
    const secretEnc = await cipher.encryptColumn('idp_secret', SECRET, {
      table: 'idp_connections',
      column: 'client_secret_enc',
      rowId,
    });

    await asCore(adapter).client.run(sql`
      INSERT INTO idp_connections (id, tenant_id, issuer_url, client_id, client_secret_enc, scopes, created_at)
      VALUES (
        ${rowId}, ${context.tenantId}, ${'https://idp.example.com/pre-0003'},
        ${'client-pre-0003'}, ${secretEnc}, ${'openid'}, ${1_800_000_000}
      )
    `);

    const row = await repo.findById(context, rowId);
    // ここが shared_google へ倒れると、列を足しただけで既存テナント全部の認証境界が
    // 共有 client 方式へ変わる。expand/contract の expand 側が無害であることの実測点
    expect(row?.credentialMode).toBe('customer_google');
    // NULL のまま。`'[]'` (= 許可ドメイン 0 件) に化けると、共有方式の「未設定は拒否」判定と
    // 「明示的に空を許可」が区別できなくなる
    expect(row?.allowedWorkspaceDomains).toBeNull();
    // 旧行の credential が読み続けられる = rollback しても顧客方式のログインは落ちない
    expect(await repo.decryptClientSecret(context, rowId)).toBe(SECRET);
  });
});

describe('migration 0004 の後方互換 (rollback 安全性)', () => {
  it('lifecycle 列を足す前の形で書かれた行は active として読め、認証を落とさない', async () => {
    // 0004 以前の writer を再現する。追加した lifecycle 10 列を INSERT 文から落として書くので、
    // 値を決めるのは列の DB 既定値だけになる。
    const rowId = 'idp-pre-0004';
    const secretEnc = await cipher.encryptColumn('idp_secret', SECRET, {
      table: 'idp_connections',
      column: 'client_secret_enc',
      rowId,
    });

    await asCore(adapter).client.run(sql`
      INSERT INTO idp_connections (id, tenant_id, issuer_url, client_id, client_secret_enc, scopes, created_at)
      VALUES (
        ${rowId}, ${context.tenantId}, ${'https://idp.example.com/pre-0004'},
        ${'client-pre-0004'}, ${secretEnc}, ${'openid'}, ${1_800_000_000}
      )
    `);

    const row = await repo.findById(context, rowId);
    // ここが pending へ倒れると、列を足した瞬間に既存テナント全部がログインできなくなる。
    // 既定 'active' は「不明なら有効」ではなく「この列より前の行は実際に稼働中だった」の意味
    expect(row?.credentialStatus).toBe('active');
    // 末尾 4 文字は記録されていない。無いことと空文字を区別する
    expect(row?.clientSecretLast4).toBeNull();
    expect(row?.pendingClientSecretEnc).toBeNull();
    expect(row?.updatedAt).toBeNull();
    expect(await repo.decryptClientSecret(context, rowId)).toBe(SECRET);
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
