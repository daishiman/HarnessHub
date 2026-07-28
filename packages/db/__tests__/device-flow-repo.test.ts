// device_authorizations / publisher_tokens リポジトリの単体検証 (§2.2, qa-008)。
//
// この 2 表の状態遷移は CAS (compare-and-swap = 期待した現在値と一致したときだけ更新) で行うため、
// 「遷移できた」ケースだけでなく **期待値が外れたときに false を返し、かつ行が 1 列も変わらない**
// ことを併せて確認する。false を返しつつ書き込んでしまう実装はテナント側から見分けが付かない。

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import {
  createDeviceAuthorizationsRepo,
  createPublisherTokensRepo,
  type DeviceAuthorizationsRepo,
  type PublisherTokensRepo,
} from '../repository/device-flow';
import { createTenantsRepo } from '../repository/tenants';
import { newUlid } from '../repository/ulid';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb } from './support/test-db';

type DeviceInput = Parameters<DeviceAuthorizationsRepo['create']>[1];
type TokenInput = Parameters<PublisherTokensRepo['create']>[1];

const EXPIRES_AT = 1_800_000_000_000;

let adapter: TursoAdapter;
let context: RepositoryContext;
/** 別テナントのスコープ。row-level scope (D4) の到達不能を確認するために使う。 */
let otherContext: RepositoryContext;
let devices: DeviceAuthorizationsRepo;
let tokens: PublisherTokensRepo;

let seq = 0;

/** device_code_hash / refresh_token_hash は UNIQUE 索引を持つので毎回別値にする。 */
function nextHash(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`.padEnd(64, '0');
}

function deviceInput(overrides: Partial<DeviceInput> = {}): DeviceInput {
  seq += 1;
  return {
    id: newUlid(),
    deviceCodeHash: nextHash('device-hash'),
    userCode: `CODE-${seq}`,
    userId: null,
    workspaceId: null,
    scopesJson: JSON.stringify(['publish:write']),
    deviceName: null,
    status: 'pending',
    attempts: 0,
    intervalSec: 5,
    lastPolledAt: null,
    expiresAt: EXPIRES_AT,
    ...overrides,
  };
}

function tokenInput(overrides: Partial<TokenInput> = {}): TokenInput {
  return {
    id: newUlid(),
    workspaceId: 'ws-1',
    userId: 'user-1',
    deviceName: 'dev-machine',
    refreshTokenHash: nextHash('refresh'),
    scopesJson: JSON.stringify(['publish:write']),
    familyId: 'family-1',
    lastUsedAt: null,
    expiresAt: EXPIRES_AT,
    revokedAt: null,
    ...overrides,
  };
}

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
  const tenants = createTenantsRepo(asCore(adapter));
  const own = await tenants.create({ slug: 'device-flow', name: 'Device Flow', plan: 'free' });
  const other = await tenants.create({ slug: 'device-flow-other', name: 'Other', plan: 'free' });
  context = createRepositoryContext({ tenantId: own.id });
  otherContext = createRepositoryContext({ tenantId: other.id });
  devices = createDeviceAuthorizationsRepo(asCore(adapter));
  tokens = createPublisherTokensRepo(asCore(adapter));
});

afterEach(() => adapter.close());

describe('device_authorizations リポジトリ', () => {
  it('create は tenant_id と created_at をサーバ側で補って行を返す', async () => {
    const before = Date.now();
    const row = await devices.create(context, deviceInput());

    expect(row.tenantId).toBe(context.tenantId);
    expect(row.createdAt).toBeGreaterThanOrEqual(before);
    expect(await devices.findById(context, row.id)).toStrictEqual(row);
  });

  it('device_code_hash / user_code のどちらからでも同じ行が引ける', async () => {
    const row = await devices.create(context, deviceInput());

    expect(await devices.findByDeviceCodeHash(context, row.deviceCodeHash)).toStrictEqual(row);
    expect(await devices.findByUserCode(context, row.userCode)).toStrictEqual(row);
  });

  it('find 系は該当が無ければ null を返す', async () => {
    await devices.create(context, deviceInput());

    expect(await devices.findById(context, 'missing')).toBeNull();
    expect(await devices.findByDeviceCodeHash(context, 'missing')).toBeNull();
    expect(await devices.findByUserCode(context, 'MISSING')).toBeNull();
  });

  it('別テナントのコンテキストからは find 系が到達しない', async () => {
    const row = await devices.create(context, deviceInput());

    expect(await devices.findById(otherContext, row.id)).toBeNull();
    expect(await devices.findByDeviceCodeHash(otherContext, row.deviceCodeHash)).toBeNull();
    expect(await devices.findByUserCode(otherContext, row.userCode)).toBeNull();
  });

  it('updateProgress は指定した列だけを書き換え、status には触れない', async () => {
    const row = await devices.create(context, deviceInput({ attempts: 0, intervalSec: 5, lastPolledAt: null }));

    await devices.updateProgress(context, row.id, { attempts: 3, intervalSec: 10, lastPolledAt: 1_700_000_000_000 });

    expect(await devices.findById(context, row.id)).toStrictEqual({
      ...row,
      attempts: 3,
      intervalSec: 10,
      lastPolledAt: 1_700_000_000_000,
    });
  });

  it('updateProgress は lastPolledAt に null を明示すると null へ戻す', async () => {
    const row = await devices.create(context, deviceInput({ lastPolledAt: 1_700_000_000_000 }));

    await devices.updateProgress(context, row.id, { lastPolledAt: null });

    expect((await devices.findById(context, row.id))?.lastPolledAt).toBeNull();
  });

  it('updateProgress は空の patch なら何も書き換えない', async () => {
    const row = await devices.create(context, deviceInput({ attempts: 2, intervalSec: 7 }));

    await devices.updateProgress(context, row.id, {});

    expect(await devices.findById(context, row.id)).toStrictEqual(row);
  });

  it('transitionStatus は期待値が一致すれば next の列をまとめて書いて true', async () => {
    const row = await devices.create(context, deviceInput({ status: 'pending', attempts: 0 }));

    const transitioned = await devices.transitionStatus(context, {
      id: row.id,
      expectedStatus: 'pending',
      expectedAttempts: 0,
      next: {
        status: 'approved',
        userId: 'user-1',
        workspaceId: 'ws-1',
        attempts: 1,
        intervalSec: 10,
        lastPolledAt: 1_700_000_000_000,
      },
    });

    expect(transitioned).toBe(true);
    expect(await devices.findById(context, row.id)).toStrictEqual({
      ...row,
      status: 'approved',
      userId: 'user-1',
      workspaceId: 'ws-1',
      attempts: 1,
      intervalSec: 10,
      lastPolledAt: 1_700_000_000_000,
    });
  });

  it('transitionStatus は next に status だけを渡すと他の列を据え置く', async () => {
    const row = await devices.create(context, deviceInput({ status: 'approved', userId: 'user-1', attempts: 2 }));

    const transitioned = await devices.transitionStatus(context, {
      id: row.id,
      expectedStatus: 'approved',
      expectedAttempts: 2,
      next: { status: 'consumed' },
    });

    expect(transitioned).toBe(true);
    expect(await devices.findById(context, row.id)).toStrictEqual({ ...row, status: 'consumed' });
  });

  it('transitionStatus は status が期待値と違えば false を返し、行を変えない', async () => {
    const row = await devices.create(context, deviceInput({ status: 'denied', attempts: 0 }));

    const transitioned = await devices.transitionStatus(context, {
      id: row.id,
      expectedStatus: 'pending',
      expectedAttempts: 0,
      next: { status: 'approved' },
    });

    expect(transitioned).toBe(false);
    expect(await devices.findById(context, row.id)).toStrictEqual(row);
  });

  it('transitionStatus は attempts が期待値と違えば false を返し、行を変えない', async () => {
    const row = await devices.create(context, deviceInput({ status: 'pending', attempts: 3 }));

    const transitioned = await devices.transitionStatus(context, {
      id: row.id,
      expectedStatus: 'pending',
      expectedAttempts: 0,
      next: { status: 'approved' },
    });

    expect(transitioned).toBe(false);
    expect(await devices.findById(context, row.id)).toStrictEqual(row);
  });

  it('同じ CAS を 2 回撃つと 2 回目は false (device_code の使い捨て)', async () => {
    const row = await devices.create(context, deviceInput({ status: 'approved', attempts: 0 }));
    const input = {
      id: row.id,
      expectedStatus: 'approved',
      expectedAttempts: 0,
      next: { status: 'consumed' },
    } as const;

    expect(await devices.transitionStatus(context, input)).toBe(true);
    expect(await devices.transitionStatus(context, input)).toBe(false);
    expect((await devices.findById(context, row.id))?.status).toBe('consumed');
  });

  it('transitionStatus は存在しない id で false を返す', async () => {
    const transitioned = await devices.transitionStatus(context, {
      id: 'missing',
      expectedStatus: 'pending',
      expectedAttempts: 0,
      next: { status: 'approved' },
    });

    expect(transitioned).toBe(false);
  });

  it('transitionStatus は別テナントの行へ到達しない', async () => {
    const row = await devices.create(context, deviceInput({ status: 'pending', attempts: 0 }));

    const transitioned = await devices.transitionStatus(otherContext, {
      id: row.id,
      expectedStatus: 'pending',
      expectedAttempts: 0,
      next: { status: 'approved' },
    });

    expect(transitioned).toBe(false);
    expect(await devices.findById(context, row.id)).toStrictEqual(row);
  });
});

describe('publisher_tokens リポジトリ', () => {
  it('create は createdAt 省略時にサーバ時刻を入れる', async () => {
    const before = Date.now();
    const row = await tokens.create(context, tokenInput());

    expect(row.tenantId).toBe(context.tenantId);
    expect(row.createdAt).toBeGreaterThanOrEqual(before);
    expect(await tokens.findById(context, row.id)).toStrictEqual(row);
  });

  it('create は createdAt を明示すればその値を保存する (TTL 検査を決定論にするため)', async () => {
    const createdAt = 1_700_000_000_000;
    const row = await tokens.create(context, tokenInput({ createdAt, expiresAt: createdAt + 90 * 86_400_000 }));

    expect(row.createdAt).toBe(createdAt);
    expect(row.expiresAt - row.createdAt).toBe(90 * 86_400_000);
  });

  it('refresh_token_hash から行が引け、該当が無ければ null', async () => {
    const row = await tokens.create(context, tokenInput());

    expect(await tokens.findByRefreshTokenHash(context, row.refreshTokenHash)).toStrictEqual(row);
    expect(await tokens.findByRefreshTokenHash(context, 'missing')).toBeNull();
    expect(await tokens.findById(context, 'missing')).toBeNull();
  });

  it('別テナントのコンテキストからは find 系が到達しない', async () => {
    const row = await tokens.create(context, tokenInput());

    expect(await tokens.findById(otherContext, row.id)).toBeNull();
    expect(await tokens.findByRefreshTokenHash(otherContext, row.refreshTokenHash)).toBeNull();
  });

  it('list 系は絞り込んだ行だけを createdAt 昇順で返す', async () => {
    const late = await tokens.create(context, tokenInput({ createdAt: 300 }));
    const early = await tokens.create(context, tokenInput({ createdAt: 100 }));
    const middle = await tokens.create(context, tokenInput({ createdAt: 200 }));
    // 別 family / 別 user / 別 workspace の行は混ざらないこと
    await tokens.create(
      context,
      tokenInput({ familyId: 'family-2', userId: 'user-2', workspaceId: 'ws-2', createdAt: 150 }),
    );

    const expected = [early.id, middle.id, late.id];
    expect((await tokens.listByFamilyId(context, 'family-1')).map((row) => row.id)).toStrictEqual(expected);
    expect((await tokens.listByUserId(context, 'user-1')).map((row) => row.id)).toStrictEqual(expected);
    expect((await tokens.listByWorkspaceId(context, 'ws-1')).map((row) => row.id)).toStrictEqual(expected);
  });

  it('list 系は該当が無ければ空配列を返す', async () => {
    await tokens.create(context, tokenInput());

    expect(await tokens.listByFamilyId(context, 'missing')).toStrictEqual([]);
    expect(await tokens.listByUserId(context, 'missing')).toStrictEqual([]);
    expect(await tokens.listByWorkspaceId(context, 'missing')).toStrictEqual([]);
    expect(await tokens.listByFamilyId(otherContext, 'family-1')).toStrictEqual([]);
  });

  it('revokeIfActive は未失効の行だけを失効させ、2 回目は false で revokedAt を上書きしない', async () => {
    const row = await tokens.create(context, tokenInput());

    expect(await tokens.revokeIfActive(context, { id: row.id, revokedAt: 1_000, lastUsedAt: 900 })).toBe(true);
    expect(await tokens.revokeIfActive(context, { id: row.id, revokedAt: 2_000, lastUsedAt: 1_900 })).toBe(false);

    expect(await tokens.findById(context, row.id)).toStrictEqual({ ...row, revokedAt: 1_000, lastUsedAt: 900 });
  });

  it('revokeIfActive は lastUsedAt 省略時に既存値を保つ', async () => {
    const row = await tokens.create(context, tokenInput({ lastUsedAt: 500 }));

    expect(await tokens.revokeIfActive(context, { id: row.id, revokedAt: 1_000 })).toBe(true);
    expect(await tokens.findById(context, row.id)).toStrictEqual({ ...row, revokedAt: 1_000 });
  });

  it('revokeIfActive は存在しない id と別テナントの行で false を返す', async () => {
    const row = await tokens.create(context, tokenInput());

    expect(await tokens.revokeIfActive(context, { id: 'missing', revokedAt: 1_000 })).toBe(false);
    expect(await tokens.revokeIfActive(otherContext, { id: row.id, revokedAt: 1_000 })).toBe(false);
    expect((await tokens.findById(context, row.id))?.revokedAt).toBeNull();
  });

  it('revokeFamily は family 内の未失効分だけを失効させ、その件数を返す', async () => {
    const active1 = await tokens.create(context, tokenInput({ createdAt: 100 }));
    const active2 = await tokens.create(context, tokenInput({ createdAt: 200 }));
    const alreadyRevoked = await tokens.create(context, tokenInput({ createdAt: 300, revokedAt: 50 }));
    const otherFamily = await tokens.create(context, tokenInput({ familyId: 'family-2' }));

    expect(await tokens.revokeFamily(context, { familyId: 'family-1', revokedAt: 1_000 })).toBe(2);

    expect((await tokens.findById(context, active1.id))?.revokedAt).toBe(1_000);
    expect((await tokens.findById(context, active2.id))?.revokedAt).toBe(1_000);
    // 既に失効済みの行は再利用検知の時刻を保つ (上書きすると初回失効時刻が失われる)
    expect((await tokens.findById(context, alreadyRevoked.id))?.revokedAt).toBe(50);
    expect((await tokens.findById(context, otherFamily.id))?.revokedAt).toBeNull();
  });

  it('revokeFamily は対象が無ければ 0 を返す', async () => {
    await tokens.create(context, tokenInput());

    expect(await tokens.revokeFamily(context, { familyId: 'missing', revokedAt: 1_000 })).toBe(0);
    expect(await tokens.revokeFamily(otherContext, { familyId: 'family-1', revokedAt: 1_000 })).toBe(0);
  });
});
