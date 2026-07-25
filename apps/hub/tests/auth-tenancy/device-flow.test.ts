/**
 * T-DEV-01 〜 T-DEV-14 (QC-3、Hub 側)。
 *
 * 時刻は注入した clock を進めて TTL / polling 間隔を検査する。
 * ハッシュ (`crypto.subtle`) は本物を使う — ここをモックすると「保存がハッシュであること」の検査が空になる。
 */

import { USER_CODE_ALPHABET, USER_CODE_LENGTH } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';
import { generateUserCode, normalizeUserCode } from '../../src/lib/auth/device-flow/index.js';
import { createDeviceFlowService, type DeviceFlowService } from '../../src/lib/auth/device-flow/service.js';
import { sha256Hex } from '../../src/lib/auth/jwt.js';
import { decide } from '../../src/lib/authz/decide.js';
import type { AuthzPrincipal } from '../../src/lib/authz/types.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  directoryUser,
  TENANT_A,
  TENANT_B,
  type TestPorts,
  WORKSPACE_A1,
} from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const USER_ID = 'user-approver';

interface Harness {
  readonly service: DeviceFlowService;
  readonly ports: TestPorts;
  readonly audit: ReturnType<typeof createInMemoryAuditSink>;
}

function createHarness(options: { readonly tenantId?: string } = {}): Harness {
  const tenantId = options.tenantId ?? TENANT_A;
  const ports = createTestPorts({
    users: [directoryUser({ id: USER_ID, tenantId, workspaceIds: [WORKSPACE_A1] })],
  });
  ports.clock.set(NOW);
  const sink = createInMemoryAuditSink();

  return {
    ports,
    audit: sink,
    service: createDeviceFlowService({
      ports,
      audit: createAuditLogger({
        sink,
        now: () => new Date(ports.clock.nowSeconds() * 1000),
        newId: createSequentialIds('audit'),
      }),
      accessTokenSecret: 'access-secret',
      verificationUri: 'https://hub.example.com/device',
      newId: createSequentialIds('rec'),
    }),
  };
}

/** 承認済みの device_code を作るところまでを 1 手で。多くのテストがここから始まる。 */
async function approvedDeviceCode(harness: Harness, tenantId = TENANT_A) {
  const issued = await harness.service.requestCode({ tenantId, scope: ['publish:write'], deviceLabel: 'macbook' });
  const approval = await harness.service.approve({
    tenantId,
    userCode: issued.user_code,
    userId: USER_ID,
    workspaceId: WORKSPACE_A1,
  });
  if (!approval.ok) throw new Error(`前提: 承認できるはず (${approval.reason})`);
  return issued;
}

describe('T-DEV-01/02: code 発行 (QC-3)', () => {
  it('T-DEV-01: device_code は平文で返し、保存は SHA-256 のみ', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    const stored = harness.ports.deviceAuthorizations.all();
    expect(stored).toHaveLength(1);
    const record = stored[0];
    if (record === undefined) throw new Error('保存されているはず');

    expect(record.deviceCodeHash).toBe(await sha256Hex(issued.device_code));
    // 平文がどこにも残っていないこと。残っていると DB 流出時にそのまま使える
    expect(JSON.stringify(record)).not.toContain(issued.device_code);
  });

  it('T-DEV-01 補: expires_in / interval が仕様値 (600 秒 / 5 秒)', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });
    expect(issued.expires_in).toBe(600);
    expect(issued.interval).toBe(5);
    expect(issued.verification_uri_complete).toBe(`https://hub.example.com/device?user_code=${issued.user_code}`);
  });

  it('T-DEV-01 補: 未知の scope は黙って落とす (拡大解釈しない)', async () => {
    const harness = createHarness();
    await harness.service.requestCode({
      tenantId: TENANT_A,
      scope: ['publish:write', 'admin:everything'],
      deviceLabel: null,
    });
    expect(harness.ports.deviceAuthorizations.all()[0]?.scope).toEqual(['publish:write']);
  });

  it('T-DEV-02: user_code は 8 文字の Crockford Base32 (I/L/O/U を含まない)', () => {
    const forbidden = /[ILOU]/;
    for (let trial = 0; trial < 200; trial += 1) {
      const code = generateUserCode();
      expect(code).toHaveLength(USER_CODE_LENGTH);
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
      expect(code).not.toMatch(forbidden);
      for (const character of code) expect(USER_CODE_ALPHABET).toContain(character);
    }
  });

  it('T-DEV-02 補: 読み上げの取り違え (I/L→1、O→0) を照合前に復元する', () => {
    expect(normalizeUserCode('abcd-1234')).toBe('ABCD1234');
    expect(normalizeUserCode('ILO 1234')).toBe('1101234');
    expect(normalizeUserCode('  a b c d 1 2 3 4 ')).toBe('ABCD1234');
  });
});

describe('T-DEV-03〜05: polling (QC-3)', () => {
  it('T-DEV-03: 未承認の polling は authorization_pending', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    const result = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    expect(result).toEqual({ ok: false, error: { error: 'authorization_pending' } });
  });

  it('T-DEV-04: interval 未満の連続 polling は slow_down で interval が +5 秒', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    harness.ports.clock.advance(1);
    const second = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });

    expect(second).toEqual({ ok: false, error: { error: 'slow_down' } });
    expect(harness.ports.deviceAuthorizations.all()[0]?.intervalSeconds).toBe(10);

    // 広がった間隔を守れば再び pending へ戻る
    harness.ports.clock.advance(10);
    const third = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    expect(third).toEqual({ ok: false, error: { error: 'authorization_pending' } });
  });

  it('T-DEV-04 補 1: slow_down を繰り返しても interval は 60 秒で頭打ちになる', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    // 時計を進めずに叩き続ける = 常に interval 未満。+5 秒を 20 回ぶん浴びせる
    for (let poll = 0; poll < 21; poll += 1) {
      await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    }

    // 上限が無ければ 5 + 5*20 = 105 秒まで伸びている。上限があるので 60 秒で止まる
    expect(harness.ports.deviceAuthorizations.all()[0]?.intervalSeconds).toBe(60);
  });

  it('T-DEV-04 補 2: 上限に達しても device_code の TTL 内に交換まで到達できる', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    // 承認前に上限まで罰を積む
    for (let poll = 0; poll < 21; poll += 1) {
      await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    }
    expect(harness.ports.deviceAuthorizations.all()[0]?.intervalSeconds).toBe(60);

    const approval = await harness.service.approve({
      tenantId: TENANT_A,
      userCode: issued.user_code,
      userId: USER_ID,
      workspaceId: WORKSPACE_A1,
    });
    expect(approval.ok).toBe(true);

    // 上限 60 秒 < TTL 600 秒。待てば必ず交換できる = server 側の都合で flow を殺していない
    harness.ports.clock.advance(60);
    const exchanged = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    expect(exchanged.ok).toBe(true);
  });

  it('T-DEV-04 補 3: 間隔を守った polling は罰を 1 段だけ戻し、初期値 5 秒より下へは戻さない', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    // 2 回続けて速く叩いて 15 秒まで広げる
    await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    harness.ports.clock.advance(1);
    await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    harness.ports.clock.advance(1);
    await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    expect(harness.ports.deviceAuthorizations.all()[0]?.intervalSeconds).toBe(15);

    // 以降は守って叩く。戻り幅は罰と同じ 5 秒 (一気に初期値へは戻さない)
    for (const [waited, expected] of [
      [15, 10],
      [10, 5],
      [5, 5], // 下限。告知した interval より下へ落とすと、守っている client を罰することになる
    ] as const) {
      harness.ports.clock.advance(waited);
      const result = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
      expect(result, `${waited} 秒待ったあと`).toEqual({ ok: false, error: { error: 'authorization_pending' } });
      expect(harness.ports.deviceAuthorizations.all()[0]?.intervalSeconds).toBe(expected);
    }
  });

  it('T-DEV-05: TTL 10 分を過ぎたら expired_token', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    harness.ports.clock.advance(599);
    expect(await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code })).toEqual({
      ok: false,
      error: { error: 'authorization_pending' },
    });

    // 境界ちょうど (600 秒) を失効側に含める
    harness.ports.clock.advance(1);
    expect(await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code })).toEqual({
      ok: false,
      error: { error: 'expired_token' },
    });
  });

  it('T-DEV-05 補: TTL を過ぎた user_code は承認できない', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    harness.ports.clock.advance(600);
    expect(
      await harness.service.approve({
        tenantId: TENANT_A,
        userCode: issued.user_code,
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
      }),
    ).toEqual({ ok: false, reason: 'expired' });
  });

  it('T-DEV-03 補: 未知の device_code は invalid_grant', async () => {
    const harness = createHarness();
    await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });

    expect(await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: 'not-a-real-code' })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });
  });
});

describe('T-DEV-06/07: user_code の照合 (QC-3)', () => {
  it('T-DEV-06: 承認できない試行が 5 回に達したら denied へ遷移する', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);

    // 1〜4 回目は already_used のまま (まだ上限に達していない)
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const result = await harness.service.approve({
        tenantId: TENANT_A,
        userCode: issued.user_code,
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
      });
      expect(result, `${attempt} 回目`).toEqual({ ok: false, reason: 'already_used' });
      expect(harness.ports.deviceAuthorizations.all()[0]?.attempts).toBe(attempt);
    }

    const fifth = await harness.service.approve({
      tenantId: TENANT_A,
      userCode: issued.user_code,
      userId: USER_ID,
      workspaceId: WORKSPACE_A1,
    });
    expect(fifth).toEqual({ ok: false, reason: 'denied' });
    expect(harness.ports.deviceAuthorizations.all()[0]?.status).toBe('denied');

    // denied は終端。上限後の再試行で attempts が 6, 7… と増え続けない
    expect(
      await harness.service.approve({
        tenantId: TENANT_A,
        userCode: issued.user_code,
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
      }),
    ).toEqual({ ok: false, reason: 'denied' });
    expect(harness.ports.deviceAuthorizations.all()[0]?.attempts).toBe(5);

    // denied へ落ちた認可は polling 側にも access_denied として現れる
    expect(await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code })).toEqual({
      ok: false,
      error: { error: 'access_denied' },
    });
  });

  it('T-DEV-06 補: 5 回の失敗が同時到着しても全件を数え、denied へ遷移する', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        harness.service.approve({
          tenantId: TENANT_A,
          userCode: issued.user_code,
          userId: 'user-another',
          workspaceId: WORKSPACE_A1,
        }),
      ),
    );

    expect(results.some((result) => !result.ok && result.reason === 'denied')).toBe(true);
    expect(harness.ports.deviceAuthorizations.all()[0]).toMatchObject({ attempts: 5, status: 'denied' });
  });

  it('T-DEV-06 補: 存在しない user_code は試行回数を増やさない (他人の認可を潰せないため)', async () => {
    const harness = createHarness();
    await approvedDeviceCode(harness);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = await harness.service.approve({
        tenantId: TENANT_A,
        userCode: 'ZZZZZZZZ',
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
      });
      expect(result).toEqual({ ok: false, reason: 'not_found' });
    }
    expect(harness.ports.deviceAuthorizations.all()[0]?.attempts).toBe(0);
    expect(harness.ports.deviceAuthorizations.all()[0]?.status).toBe('approved');
  });

  it('T-DEV-07: 承認済み user_code の再利用は拒否 (照合後即失効)', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);

    expect(
      await harness.service.approve({
        tenantId: TENANT_A,
        userCode: issued.user_code,
        userId: 'user-another',
        workspaceId: WORKSPACE_A1,
      }),
    ).toEqual({ ok: false, reason: 'already_used' });

    // 承認者が上書きされていないこと
    expect(harness.ports.deviceAuthorizations.all()[0]?.approvedByUserId).toBe(USER_ID);
  });

  it('T-DEV-07 補: 承認は監査 device.approve を 1 件残す', async () => {
    const harness = createHarness();
    await approvedDeviceCode(harness);

    const events = harness.audit.events();
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe('device.approve');
    expect(events[0]?.tenantId).toBe(TENANT_A);
    expect(events[0]?.workspaceId).toBe(WORKSPACE_A1);
  });
});

describe('T-DEV-08〜11: token 交換と rotation (QC-3)', () => {
  it('T-DEV-08: 承認後の交換で access(15 分) + refresh(90 日) が出る', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);

    const exchanged = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!exchanged.ok) throw new Error(`交換できるはず: ${exchanged.error.error}`);

    expect(exchanged.value.token_type).toBe('Bearer');
    expect(exchanged.value.expires_in).toBe(15 * 60);
    expect(exchanged.value.scope).toEqual(['publish:write']);

    const stored = harness.ports.publisherTokens.all();
    expect(stored).toHaveLength(1);
    const record = stored[0];
    if (record === undefined) throw new Error('保存されているはず');

    expect(record.expiresAtSeconds - record.createdAtSeconds).toBe(90 * 24 * 60 * 60);
    // refresh も平文を残さない
    expect(record.refreshTokenHash).toBe(await sha256Hex(exchanged.value.refresh_token));
    expect(JSON.stringify(record)).not.toContain(exchanged.value.refresh_token);
  });

  it('T-DEV-09: device_code は使い捨て (2 回目の交換は invalid_grant)', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);

    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    expect(first.ok).toBe(true);

    harness.ports.clock.advance(10);
    expect(await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });
    expect(harness.ports.publisherTokens.all()).toHaveLength(1);
  });

  it('T-DEV-09 補: 承認後に無効化された利用者へは token を出さない', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);

    harness.ports.users.put(
      directoryUser({ id: USER_ID, tenantId: TENANT_A, status: 'inactive', workspaceIds: [WORKSPACE_A1] }),
    );

    expect(await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code })).toEqual({
      ok: false,
      error: { error: 'access_denied' },
    });
    expect(harness.ports.publisherTokens.all()).toHaveLength(0);
  });

  it('T-DEV-10: refresh rotation は新しい refresh を出し、旧 refresh を失効させる', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);
    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!first.ok) throw new Error('交換できるはず');

    harness.ports.clock.advance(60);
    const rotated = await harness.service.refresh({
      tenantId: TENANT_A,
      refreshToken: first.value.refresh_token,
    });
    if (!rotated.ok) throw new Error(`rotation できるはず: ${rotated.error.error}`);

    expect(rotated.value.refresh_token).not.toBe(first.value.refresh_token);

    const records = harness.ports.publisherTokens.all();
    expect(records).toHaveLength(2);
    // 先に作られた行が旧枝。旧を失効させてから新を作る順序なので、両方生きている瞬間が残らない
    expect(records[0]?.revokedAtSeconds).toBe(NOW + 60);
    expect(records[1]?.revokedAtSeconds).toBeNull();
    // 同じ family に留まる (再利用検知が family 単位で効くため)
    expect(records[0]?.familyId).toBe(records[1]?.familyId);
  });

  it('T-DEV-11: 失効済み refresh の再提示で family 全体を失効させ token.reuse_detected を記録する', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);
    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!first.ok) throw new Error('交換できるはず');

    harness.ports.clock.advance(60);
    const rotated = await harness.service.refresh({ tenantId: TENANT_A, refreshToken: first.value.refresh_token });
    if (!rotated.ok) throw new Error('rotation できるはず');

    // 窃取された枝 (旧 refresh) が使われた状況
    harness.ports.clock.advance(60);
    const reused = await harness.service.refresh({ tenantId: TENANT_A, refreshToken: first.value.refresh_token });
    expect(reused).toEqual({ ok: false, error: { error: 'invalid_grant' } });

    // rotation だけでは窃取を止められない。family を落として初めて意味を持つ
    expect(harness.ports.publisherTokens.all().every((record) => record.revokedAtSeconds !== null)).toBe(true);

    const reuseEvents = harness.audit.events().filter((event) => event.action === 'token.reuse_detected');
    expect(reuseEvents).toHaveLength(1);
    expect(reuseEvents[0]?.metadata).toMatchObject({ revoked_family_size: 2 });

    // 正規の client が持っていた最新 refresh も巻き添えで死ぬ。
    // 窃取された枝と正規の枝を区別できない以上、両方止めるのが安全側
    expect(await harness.service.refresh({ tenantId: TENANT_A, refreshToken: rotated.value.refresh_token })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });
  });

  it('T-DEV-10 補: 期限切れ refresh は expired_token', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);
    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!first.ok) throw new Error('交換できるはず');

    harness.ports.clock.advance(90 * 24 * 60 * 60);
    expect(await harness.service.refresh({ tenantId: TENANT_A, refreshToken: first.value.refresh_token })).toEqual({
      ok: false,
      error: { error: 'expired_token' },
    });
  });
});

describe('T-DEV-12〜14: 失効の認可 (QC-3)', () => {
  const resourceOf = (ownerUserId: string) => ({
    type: 'token',
    id: 'token-1',
    tenantId: TENANT_A,
    workspaceId: WORKSPACE_A1,
    ownerUserId,
  });

  const principalOf = (role: AuthzPrincipal['role'], userId: string): AuthzPrincipal => ({
    userId,
    tenantId: TENANT_A,
    role,
    status: 'active',
    issuedAtSeconds: NOW,
    workspaceIds: [WORKSPACE_A1],
    scope: null,
    credential: 'session',
  });

  it('T-DEV-12: 本人による失効は許可され、family がまとめて落ちる', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);
    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!first.ok) throw new Error('交換できるはず');

    expect(
      decide({
        action: 'token.revoke',
        principal: principalOf('member', USER_ID),
        resource: resourceOf(USER_ID),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: true, effectiveRole: 'owner' });

    const tokenId = harness.ports.publisherTokens.all()[0]?.id;
    if (tokenId === undefined) throw new Error('token があるはず');

    const revoked = await harness.service.revokeToken({ tenantId: TENANT_A, tokenId, actorUserId: USER_ID });
    expect(revoked).toEqual({ revokedCount: 1 });
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).toBe(NOW);
  });

  it('T-DEV-12 補: 失効は冪等 (2 回呼んでも成功を返し、状態が変わらない)', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);
    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!first.ok) throw new Error('交換できるはず');

    const tokenId = harness.ports.publisherTokens.all()[0]?.id;
    if (tokenId === undefined) throw new Error('token があるはず');

    await harness.service.revokeToken({ tenantId: TENANT_A, tokenId, actorUserId: USER_ID });
    harness.ports.clock.advance(30);
    const second = await harness.service.revokeToken({ tenantId: TENANT_A, tokenId, actorUserId: USER_ID });

    expect(second).toEqual({ revokedCount: 1 });
    // 2 回目で失効時刻を上書きしない
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).toBe(NOW);
  });

  it('T-DEV-13: 他人の token を member が失効させようとすると拒否', () => {
    expect(
      decide({
        action: 'token.revoke',
        principal: principalOf('member', USER_ID),
        resource: resourceOf('user-someone-else'),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: false, reason: 'not_owner' });
  });

  it('T-DEV-14: workspace-admin は Workspace 内の他人の token を失効でき、監査に残る', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);
    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!first.ok) throw new Error('交換できるはず');

    expect(
      decide({
        action: 'token.revoke',
        principal: principalOf('workspace-admin', 'user-admin'),
        resource: resourceOf(USER_ID),
        sessionRevoked: false,
      }),
    ).toEqual({ allowed: true, effectiveRole: 'workspace-admin' });

    const tokenId = harness.ports.publisherTokens.all()[0]?.id;
    if (tokenId === undefined) throw new Error('token があるはず');
    await harness.service.revokeToken({ tenantId: TENANT_A, tokenId, actorUserId: 'user-admin' });

    const revokeEvents = harness.audit.events().filter((event) => event.action === 'token.revoke');
    expect(revokeEvents).toHaveLength(1);
    expect(revokeEvents[0]?.actorSubject).toBe('user-admin');
    expect(revokeEvents[0]?.metadata).toMatchObject({ revoked_count: 1 });
  });

  it('T-DEV-14 補: 一覧に平文 token を含めない', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);
    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!first.ok) throw new Error('交換できるはず');

    const summaries = await harness.service.listTokensForUser({ tenantId: TENANT_A, userId: USER_ID });
    expect(summaries).toHaveLength(1);
    const serialized = JSON.stringify(summaries);
    expect(serialized).not.toContain(first.value.refresh_token);
    expect(serialized).not.toContain(first.value.access_token);
    expect(summaries[0]?.status).toBe('active');
  });

  it('T-DEV-14 補: 他テナントの token は同じ id でも引けない', async () => {
    const harness = createHarness();
    const issued = await approvedDeviceCode(harness);
    const first = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!first.ok) throw new Error('交換できるはず');

    const tokenId = harness.ports.publisherTokens.all()[0]?.id;
    if (tokenId === undefined) throw new Error('token があるはず');

    expect(await harness.service.revokeToken({ tenantId: TENANT_B, tokenId, actorUserId: 'attacker' })).toBeNull();
    expect(harness.ports.publisherTokens.all()[0]?.revokedAtSeconds).toBeNull();
  });
});
