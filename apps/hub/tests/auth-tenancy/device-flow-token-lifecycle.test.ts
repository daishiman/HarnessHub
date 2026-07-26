/**
 * T-DEV-08 〜 T-DEV-14 (QC-3、Hub 側)。
 *
 * token 交換、refresh rotation、再利用検知、失効認可を検証する。
 */

import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../../src/lib/auth/jwt.js';
import { decide } from '../../src/lib/authz/decide.js';
import type { AuthzPrincipal } from '../../src/lib/authz/types.js';
import { approvedDeviceCode, createHarness, NOW, USER_ID } from './device-flow-test-support.js';
import { directoryUser, TENANT_A, TENANT_B, WORKSPACE_A1 } from './support/in-memory-ports.js';

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
