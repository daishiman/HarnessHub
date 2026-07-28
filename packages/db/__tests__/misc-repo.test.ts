// session_revocations (緊急失効 §2.1) と idempotency_ledger (再試行安全化) の専用リポジトリ。
// どちらも自然キー PK で upsert 系の分岐を持つため、2 回目の書き込みまで踏む。

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import {
  createIdempotencyLedgerRepo,
  createSessionRevocationsRepo,
  type IdempotencyLedgerRepo,
  type SessionRevocationsRepo,
} from '../repository/misc';
import { createTenantsRepo } from '../repository/tenants';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;
let revocations: SessionRevocationsRepo;
let ledger: IdempotencyLedgerRepo;

let tenantSeq = 0;

/** テストごとに独立したテナントを作る。自然キー PK は tenant を跨いで衝突しうるため。 */
async function newContext(): Promise<RepositoryContext> {
  tenantSeq += 1;
  const tenant = await createTenantsRepo(asCore(adapter)).create({
    slug: `misc-${tenantSeq}`,
    name: `Misc ${tenantSeq}`,
    plan: 'free',
  });
  return createRepositoryContext({ tenantId: tenant.id });
}

function ledgerRecord(overrides: Partial<{ scope: string; key: string; responseStatus: number }> = {}) {
  return {
    scope: overrides.scope ?? 'publish',
    key: overrides.key ?? 'idem-key-1',
    requestHash: 'a'.repeat(64),
    responseStatus: overrides.responseStatus ?? 201,
    responseBodyJson: null,
    expiresAt: 1_800_000_000_000,
  };
}

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
  revocations = createSessionRevocationsRepo(asCore(adapter));
  ledger = createIdempotencyLedgerRepo(asCore(adapter));
});

afterAll(() => adapter.close());

describe('session_revocations', () => {
  it('revokeAll が失効時刻を記録し get で読み戻せる', async () => {
    const context = await newContext();
    const revoked = await revocations.revokeAll(context);

    expect(revoked.tenantId).toBe(context.tenantId);
    expect(await revocations.get(context)).toStrictEqual(revoked);
  });

  it('一度も失効していないテナントでは get が null を返す', async () => {
    expect(await revocations.get(await newContext())).toBeNull();
  });

  it('同一テナントの 2 回目の revokeAll が upsert され、行が増えず時刻だけ進む', async () => {
    const context = await newContext();
    const first = await revocations.revokeAll(context);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await revocations.revokeAll(context);

    expect(second.revokedAt).toBeGreaterThan(first.revokedAt);
    // PK は tenant_id 単独。上書きに失敗すれば UNIQUE 違反になるので、読めた時点で upsert されている。
    expect(await revocations.get(context)).toStrictEqual(second);
  });

  it('テナントごとに失効時刻が独立している', async () => {
    const a = await newContext();
    const b = await newContext();
    await revocations.revokeAll(a);

    expect(await revocations.get(b)).toBeNull();
  });
});

describe('idempotency_ledger', () => {
  it('put した記録を scope と key で引ける', async () => {
    const context = await newContext();
    const record = ledgerRecord();
    const stored = await ledger.put(context, record);

    expect(stored).toStrictEqual({ ...record, tenantId: context.tenantId });
    expect(await ledger.get(context, record.scope, record.key)).toStrictEqual(stored);
  });

  it('未登録の scope / key では get が null を返す', async () => {
    const context = await newContext();
    await ledger.put(context, ledgerRecord({ scope: 'publish', key: 'exists' }));

    expect(await ledger.get(context, 'publish', 'not-exists')).toBeNull();
    expect(await ledger.get(context, 'other-scope', 'exists')).toBeNull();
  });

  it('同一キーの再 put は既存行を書き換えず、入力レコードをそのまま返す', async () => {
    const context = await newContext();
    const first = ledgerRecord({ key: 'retry-safe', responseStatus: 201 });
    await ledger.put(context, first);

    // onConflictDoNothing なので insert された行が無く、returning() が空になる分岐。
    const second = ledgerRecord({ key: 'retry-safe', responseStatus: 500 });
    const returned = await ledger.put(context, second);
    expect(returned).toStrictEqual({ ...second, tenantId: context.tenantId });

    // DB 側は最初の応答のまま (再試行が保存済みの応答を壊さない)。
    const persisted = await ledger.get(context, 'publish', 'retry-safe');
    expect(persisted?.responseStatus).toBe(201);
  });
});
