// idp_connections リポジトリ — client_secret の封筒暗号化保存 (security-spec §4.3)。
// 既定の読取経路が平文を返さないこと、復号が明示呼出しに限られることを確認する。

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import type { ColumnCipher } from '../repository/crypto';
import {
  createIdpConnectionsRepo,
  type IdpConnectionsRepo,
  InvalidCredentialStatusTransitionError,
  PendingCredentialAbsentError,
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

/**
 * 顧客持ち込み client の lifecycle と無停止 rotation
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * 基本の暗号化・共有方式との後方互換は `idp-repo.test.ts`、状態遷移はこの file で検査する。
 */
describe('credential lifecycle', () => {
  const NEW_SECRET = 'rotated-secret-value-9999';

  async function newConnection(ctx: RepositoryContext, slug: string) {
    return repo.insert(ctx, {
      issuerUrl: `https://idp.example.com/${slug}`,
      clientId: `client-${slug}`,
      clientSecret: SECRET,
      scopes: 'openid',
    });
  }

  it('insert は末尾 4 文字だけを記録し、既定の状態は active になる', async () => {
    const row = await newConnection(context, 'lifecycle-insert');

    expect(row.credentialStatus).toBe('active');
    expect(row.clientSecretLast4).toBe(SECRET.slice(-4));
    // 末尾 4 文字は識別子。ここに全値が入っていないことが受入条件 2 の要点
    expect(row.clientSecretLast4).not.toBe(SECRET);
    expect(SECRET).toContain(row.clientSecretLast4 as string);
    expect(row.pendingClientSecretEnc).toBeNull();
  });

  it('管理経路は pending で登録でき、その行は解決対象 (active) にならない', async () => {
    const row = await repo.insert(context, {
      issuerUrl: 'https://idp.example.com/lifecycle-pending',
      clientId: 'client-lifecycle-pending',
      clientSecret: SECRET,
      scopes: 'openid',
      credentialStatus: 'pending',
    });
    expect(row.credentialStatus).toBe('pending');
  });

  it('共有方式の行には pending secret を置けない (行への secret 複製を作らない)', async () => {
    const sharedContext = await newContext('idp-lifecycle-shared');
    const row = await repo.insert(sharedContext, {
      credentialMode: 'shared_google',
      issuerUrl: 'https://accounts.google.com',
      scopes: 'openid',
      allowedWorkspaceDomains: ['shared-rotate.example'],
    });

    expect(await repo.stagePendingSecret(sharedContext, row.id, NEW_SECRET)).toBeNull();
    await expect(repo.decryptPendingClientSecret(sharedContext, row.id)).rejects.toThrow(
      SharedCredentialSecretAccessError,
    );
  });

  it('rotation 中でない行から pending secret を取り出そうとすると失敗する', async () => {
    const row = await newConnection(context, 'lifecycle-no-pending');
    await expect(repo.decryptPendingClientSecret(context, row.id)).rejects.toThrow(PendingCredentialAbsentError);
  });

  it('新 secret を保存しても現行 credential は変わらない (受入条件 5)', async () => {
    const row = await newConnection(context, 'rotate-stage');
    const staged = await repo.stagePendingSecret(context, row.id, NEW_SECRET);

    expect(staged).not.toBeNull();
    // 現行列は無傷。この時点でログインは旧 secret のまま通り続ける
    expect(staged?.clientSecretEnc).toBe(row.clientSecretEnc);
    expect(staged?.clientSecretLast4).toBe(SECRET.slice(-4));
    expect(await repo.decryptClientSecret(context, row.id)).toBe(SECRET);
    // staging 側は別列に入り、まだ未検証
    expect(staged?.pendingClientSecretLast4).toBe(NEW_SECRET.slice(-4));
    expect(staged?.pendingTestedAt).toBeNull();
    // 接続テストのためだけに平文へ戻せる
    expect(await repo.decryptPendingClientSecret(context, row.id)).toBe(NEW_SECRET);
  });

  it('接続テストを通していない secret へは切り替えられない (受入条件 4 の順序)', async () => {
    const row = await newConnection(context, 'rotate-untested');
    const staged = await repo.stagePendingSecret(context, row.id, NEW_SECRET);
    const cas = { id: row.id, expectedPendingSecretEnc: staged?.pendingClientSecretEnc as string };

    // pendingTestedAt が NULL のままなので WHERE が一致せず 0 行 = null
    expect(await repo.activatePendingSecret(context, cas)).toBeNull();
    // 旧 secret はそのまま生きている
    expect(await repo.decryptClientSecret(context, row.id)).toBe(SECRET);
  });

  it('保存 → テスト → 切替 で無停止 rotation が完了する (受入条件 4)', async () => {
    const row = await newConnection(context, 'rotate-happy');
    const staged = await repo.stagePendingSecret(context, row.id, NEW_SECRET);
    const cas = { id: row.id, expectedPendingSecretEnc: staged?.pendingClientSecretEnc as string };

    const tested = await repo.markPendingTested(context, cas);
    expect(tested?.pendingTestedAt).not.toBeNull();
    // テスト記録の時点でもまだ切り替わっていない
    expect(await repo.decryptClientSecret(context, row.id)).toBe(SECRET);

    const activated = await repo.activatePendingSecret(context, cas);
    expect(activated?.credentialStatus).toBe('active');
    expect(activated?.clientSecretLast4).toBe(NEW_SECRET.slice(-4));
    expect(activated?.lastTestedAt).toBe(tested?.pendingTestedAt);
    // staging は空になり、rotation が「進行中でない」状態へ戻る
    expect(activated?.pendingClientSecretEnc).toBeNull();
    expect(activated?.pendingClientSecretLast4).toBeNull();
    expect(activated?.pendingTestedAt).toBeNull();

    // 暗号文をそのまま移しても AAD が食い違わない (pending 列と ref を共有しているため)
    expect(await repo.decryptClientSecret(context, row.id)).toBe(NEW_SECRET);
    await expect(repo.decryptPendingClientSecret(context, row.id)).rejects.toThrow(PendingCredentialAbsentError);
  });

  it('staging が差し替わると、古い暗号文を期待した CAS は 1 本も通らない', async () => {
    const row = await newConnection(context, 'rotate-contention');
    const first = await repo.stagePendingSecret(context, row.id, NEW_SECRET);
    const staleCas = { id: row.id, expectedPendingSecretEnc: first?.pendingClientSecretEnc as string };

    // 別要求が後から別の secret を stage した状況
    const second = await repo.stagePendingSecret(context, row.id, 'another-secret-abcd');
    expect(second?.pendingClientSecretEnc).not.toBe(first?.pendingClientSecretEnc);

    // 「1 本目のテスト結果で 2 本目の secret を tested 扱いにする」経路を塞ぐ
    expect(await repo.markPendingTested(context, staleCas)).toBeNull();
    expect(await repo.activatePendingSecret(context, staleCas)).toBeNull();

    const freshCas = { id: row.id, expectedPendingSecretEnc: second?.pendingClientSecretEnc as string };
    expect(await repo.markPendingTested(context, freshCas)).not.toBeNull();
  });

  it('切替の途中で失敗しても、破棄すれば旧 credential で動き続ける (受入条件 5)', async () => {
    const row = await newConnection(context, 'rotate-rollback');
    const staged = await repo.stagePendingSecret(context, row.id, NEW_SECRET);
    const cas = { id: row.id, expectedPendingSecretEnc: staged?.pendingClientSecretEnc as string };

    // 接続テストに落ちた想定 — staging を捨てる
    const discarded = await repo.discardPendingSecret(context, cas);
    expect(discarded?.pendingClientSecretEnc).toBeNull();
    expect(discarded?.clientSecretLast4).toBe(SECRET.slice(-4));
    expect(await repo.decryptClientSecret(context, row.id)).toBe(SECRET);
    // 破棄済みなので同じ CAS は二度目を通さない
    expect(await repo.discardPendingSecret(context, cas)).toBeNull();
  });

  it('disabled の接続は rotation を始められない (先に再有効化 = 再テストを要求する)', async () => {
    const row = await newConnection(context, 'rotate-disabled');
    const disabled = await repo.transitionStatus(context, {
      id: row.id,
      expectedStatus: 'active',
      nextStatus: 'disabled',
    });
    expect(disabled?.credentialStatus).toBe('disabled');

    expect(await repo.stagePendingSecret(context, row.id, NEW_SECRET)).toBeNull();
  });

  it('disabled は新 credential の staging と同時に pending へ戻り、直接 active にはならない', async () => {
    const row = await newConnection(context, 'reactivation');
    await repo.transitionStatus(context, { id: row.id, expectedStatus: 'active', nextStatus: 'disabled' });

    const reopened = await repo.stagePendingCustomerCredential(context, row.id, {
      clientId: 'client-reactivated',
      clientSecret: NEW_SECRET,
      expectedStatus: 'disabled',
    });
    expect(reopened?.credentialStatus).toBe('pending');
    expect(reopened?.pendingClientId).toBe('client-reactivated');
    expect(reopened?.pendingTestedAt).toBeNull();
    // 現行値へはまだ昇格していない。
    expect(await repo.decryptClientSecret(context, row.id)).toBe(SECRET);
  });

  it('現行 credential の再テストは時刻を更新し、active を維持する', async () => {
    const row = await newConnection(context, 'current-retest');
    const tested = await repo.markCurrentTested(context, {
      id: row.id,
      expectedClientSecretEnc: row.clientSecretEnc,
      expectedStatus: 'active',
    });

    expect(tested?.credentialStatus).toBe('active');
    expect(tested?.lastTestedAt).not.toBeNull();
  });

  it('現行 credential がテスト中に変わった場合は古い結果を記録しない', async () => {
    const row = await newConnection(context, 'current-test-cas');
    const staleCiphertext = row.clientSecretEnc;
    const staged = await repo.stagePendingSecret(context, row.id, NEW_SECRET);
    const pendingCas = { id: row.id, expectedPendingSecretEnc: staged?.pendingClientSecretEnc as string };
    await repo.markPendingTested(context, pendingCas);
    await repo.activatePendingSecret(context, pendingCas);

    expect(
      await repo.markCurrentTested(context, {
        id: row.id,
        expectedClientSecretEnc: staleCiphertext,
        expectedStatus: 'active',
      }),
    ).toBeNull();
  });

  it('状態遷移は CAS で、期待した状態から動いていれば通らない', async () => {
    const row = await newConnection(context, 'lifecycle-cas');

    expect(
      await repo.transitionStatus(context, { id: row.id, expectedStatus: 'active', nextStatus: 'disabled' }),
    ).not.toBeNull();
    // 2 本目は期待状態が既に古い
    expect(
      await repo.transitionStatus(context, { id: row.id, expectedStatus: 'active', nextStatus: 'disabled' }),
    ).toBeNull();
  });

  it('lifecycle に無い遷移は例外になる (CAS 敗北の null と混ぜない)', async () => {
    const row = await newConnection(context, 'lifecycle-invalid');

    // disabled から active へ直接戻すと、無効化中に失効した credential を未テストで復帰させられる
    await expect(
      repo.transitionStatus(context, { id: row.id, expectedStatus: 'disabled', nextStatus: 'active' }),
    ).rejects.toThrow(InvalidCredentialStatusTransitionError);
    // pending を飛ばして active にもできない
    await expect(
      repo.transitionStatus(context, { id: row.id, expectedStatus: 'pending', nextStatus: 'active' }),
    ).rejects.toThrow(InvalidCredentialStatusTransitionError);
  });

  it('pending → tested の遷移は接続テスト時刻を記録する', async () => {
    const row = await repo.insert(context, {
      issuerUrl: 'https://idp.example.com/lifecycle-tested',
      clientId: 'client-lifecycle-tested',
      clientSecret: SECRET,
      scopes: 'openid',
      credentialStatus: 'pending',
    });

    const tested = await repo.transitionStatus(context, {
      id: row.id,
      expectedStatus: 'pending',
      nextStatus: 'tested',
    });
    expect(tested?.credentialStatus).toBe('tested');
    expect(tested?.lastTestedAt).not.toBeNull();

    const active = await repo.transitionStatus(context, {
      id: row.id,
      expectedStatus: 'tested',
      nextStatus: 'active',
    });
    expect(active?.credentialStatus).toBe('active');
  });

  it('他テナントの接続は rotation も無効化もできない', async () => {
    const theirs = await newConnection(otherContext, 'rotate-cross-tenant');

    expect(await repo.stagePendingSecret(context, theirs.id, NEW_SECRET)).toBeNull();
    await expect(repo.decryptPendingClientSecret(context, theirs.id)).rejects.toThrow(EntityNotFoundError);
    expect(
      await repo.transitionStatus(context, { id: theirs.id, expectedStatus: 'active', nextStatus: 'disabled' }),
    ).toBeNull();
    expect(
      await repo.activatePendingSecret(context, { id: theirs.id, expectedPendingSecretEnc: 'whatever' }),
    ).toBeNull();

    // 相手側から見た状態は無傷
    expect((await repo.findById(otherContext, theirs.id))?.credentialStatus).toBe('active');
  });
});
