// 監査 append と並走する書き込みが失われないこと (HarnessHub-b7ng)。
//
// 監査 append は hash chain を繋ぐため `BEGIN IMMEDIATE` で read-modify-write を直列化する。
// libSQL のローカル backend はこのトランザクションを**別接続**で開くので、同一プロセスの素の
// INSERT/UPDATE と書き込みロックを奪い合う。しかも BUSY で失敗した文は driver 側で後片付けされず、
// 負けた接続は「書き込みが自分からは見えるのに commit されない」状態で固まる
// (機序と実測は repository/conflict.ts のヘッダ)。
//
// **必ず別接続から数えること。** 書いたのと同じ接続から読むと、commit されていない行まで見えるので
// この破綻を検出できない。ここが本テストの成立条件。

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTursoClient, type TursoAdapter } from '@harness-hub/db/connection';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAuditRepo } from '../repository/audit';
import { createDeviceAuthorizationsRepo } from '../repository/device-flow';
import { createReleasesRepo } from '../repository/releases';
import { createTenantsRepo } from '../repository/tenants';
import { createUsersRepo } from '../repository/users';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

/** 同時到着数。ロック競合は 2 本でも起きるが、取りこぼしを確率的に見逃さない程度に増やす。 */
const CONCURRENCY = 8;

let tempDir: string;
let writer: TursoAdapter;
/** 検証用の**別接続**。commit されたものだけが見える視点。 */
let reader: TursoAdapter;
let context: RepositoryContext;

function deviceCodeHash(index: number): string {
  return `hash-${index}`.padEnd(64, '0');
}

function deviceInput(index: number) {
  return {
    id: `device-${index}`,
    deviceCodeHash: deviceCodeHash(index),
    userCode: `CODE-${index}`,
    userId: null,
    workspaceId: null,
    scopesJson: JSON.stringify(['publish:write']),
    deviceName: null,
    status: 'pending' as const,
    attempts: 0,
    intervalSec: 5,
    lastPolledAt: null,
    expiresAt: 1_800_000_000_000,
  };
}

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'dmdb-write-conflict-'));
  const url = `file:${join(tempDir, 'test.db')}`;
  writer = await createLibsqlTestDb(url);
  reader = createTursoClient({ url });
  const tenant = await createTenantsRepo(asCore(writer)).create({ slug: 'conflict', name: 'C', plan: 'free' });
  context = createRepositoryContext({ tenantId: tenant.id });
});

afterEach(() => {
  reader.close();
  writer.close();
  rmSync(tempDir, { recursive: true, force: true });
});

describe('監査 append と並走する書き込み', () => {
  it('同時到着した device_authorizations の作成が 1 本も失われない', async () => {
    const audit = createAuditRepo(asCore(writer));
    const devices = createDeviceAuthorizationsRepo(asCore(writer));

    await Promise.all([
      ...Array.from({ length: CONCURRENCY }, (_, i) =>
        audit.append(context, {
          actorType: 'system',
          actorId: 'test',
          action: 'device.authorize',
          entityType: 'device_authorization',
          entityId: `device-${i}`,
          summary: { index: i },
        }),
      ),
      ...Array.from({ length: CONCURRENCY }, (_, i) => devices.create(context, deviceInput(i))),
    ]);

    const readerDevices = createDeviceAuthorizationsRepo(asCore(reader));
    const persisted = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => readerDevices.findByDeviceCodeHash(context, deviceCodeHash(i))),
    );
    expect(persisted.filter((row) => row !== null)).toHaveLength(CONCURRENCY);

    // 監査側も欠けていないこと。片方だけ守られている状態を「pass」にしない
    const events = await createAuditRepo(asCore(reader)).read(context, { limit: 100 });
    expect(events.map((event) => event.seq)).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  }, 30_000);

  it('同時到着した CAS (transitionStatus) の勝者が 1 本だけで、結果が別接続から見える', async () => {
    const audit = createAuditRepo(asCore(writer));
    const devices = createDeviceAuthorizationsRepo(asCore(writer));
    await devices.create(context, deviceInput(0));

    // CAS と監査を混ぜて同時に走らせる。CAS の勝者は 1 本、かつその遷移が commit されていること
    const outcomes = await Promise.all([
      ...Array.from({ length: CONCURRENCY }, () =>
        devices.transitionStatus(context, {
          id: 'device-0',
          expectedStatus: 'pending',
          expectedAttempts: 0,
          next: { status: 'approved' },
        }),
      ),
      ...Array.from({ length: CONCURRENCY }, (_, i) =>
        audit.append(context, {
          actorType: 'system',
          actorId: 'test',
          action: 'device.approve',
          entityType: 'device_authorization',
          entityId: 'device-0',
          summary: { index: i },
        }),
      ),
    ]);

    expect(outcomes.filter((outcome) => outcome === true)).toHaveLength(1);
    const persisted = await createDeviceAuthorizationsRepo(asCore(reader)).findById(context, 'device-0');
    expect(persisted?.status).toBe('approved');
  }, 30_000);

  // HarnessHub-mb7c: users.ts / releases.ts の write を guardedWrite で掃き出した代表経路の回帰確認。
  it('同時到着した users.markLastLogin (掃き出し対象) が監査 append と競合しても失われない', async () => {
    const audit = createAuditRepo(asCore(writer));
    const users = createUsersRepo(asCore(writer), testCipher(asCore(writer)));
    const createdUsers = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) =>
        users.insert(context, {
          idpSubject: `sub-${i}`,
          email: `user${i}@example.com`,
          name: `User ${i}`,
          role: 'member',
          status: 'active',
        }),
      ),
    );

    await Promise.all([
      ...createdUsers.map((user) => users.markLastLogin(context, user.id)),
      ...Array.from({ length: CONCURRENCY }, (_, i) =>
        audit.append(context, {
          actorType: 'system',
          actorId: 'test',
          action: 'user.login',
          entityType: 'user',
          entityId: createdUsers[i]?.id ?? `missing-${i}`,
          summary: { index: i },
        }),
      ),
    ]);

    const readerUsers = createUsersRepo(asCore(reader), testCipher(asCore(reader)));
    const persisted = await Promise.all(createdUsers.map((user) => readerUsers.findById(context, user.id)));
    expect(persisted).toHaveLength(CONCURRENCY);
    expect(persisted.every((user) => user?.lastLoginAt !== null && user?.lastLoginAt !== undefined)).toBe(true);

    const events = await createAuditRepo(asCore(reader)).read(context, { limit: 100 });
    expect(events).toHaveLength(CONCURRENCY);
  }, 30_000);

  it('同時到着した releases.createRelease (掃き出し対象・独自 unique retry と guardedWrite が両立) が監査 append と競合しても採番が壊れない', async () => {
    const audit = createAuditRepo(asCore(writer));
    const releases = createReleasesRepo(asCore(writer));
    const channelId = 'channel-0';

    await Promise.all([
      ...Array.from({ length: CONCURRENCY }, (_, i) =>
        releases.createRelease(context, {
          projectId: 'project-0',
          channelId,
          packageHash: `hash-${i}`,
          manifestJson: '{}',
          createdBy: 'test',
        }),
      ),
      ...Array.from({ length: CONCURRENCY }, (_, i) =>
        audit.append(context, {
          actorType: 'system',
          actorId: 'test',
          action: 'release.create',
          entityType: 'release',
          entityId: `pending-${i}`,
          summary: { index: i },
        }),
      ),
    ]);

    const persisted = await createReleasesRepo(asCore(reader)).listByChannel(context, channelId);
    expect(persisted).toHaveLength(CONCURRENCY);
    expect(new Set(persisted.map((release) => release.version)).size).toBe(CONCURRENCY);

    const events = await createAuditRepo(asCore(reader)).read(context, { limit: 100 });
    expect(events).toHaveLength(CONCURRENCY);
  }, 30_000);
});
