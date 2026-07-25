/**
 * T-TOKC-01 〜 T-TOKC-04 (QC-3 の downstream token contract)。
 *
 * ここで検証するのは **consumer (feat-publisher-plugin) が依存する公開契約の形**だけ。
 * OS 資格情報域 (macOS Keychain / Windows Credential Manager) への保存は consumer の責務であり、
 * 本 package はその API を持たない。持っていないことを T-TOKC-04 が表明する。
 */

import * as schemas from '@harness-hub/schemas';
import {
  deviceErrorCodeSchema,
  deviceErrorResponseSchema,
  tokenListResponseSchema,
  tokenResponseSchema,
  tokenRevocationResponseSchema,
} from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { createDeviceFlowService, type DeviceFlowService } from '../../src/lib/auth/device-flow/service.js';
import { verifyJwt } from '../../src/lib/auth/jwt.js';
import { type AuthzRuntimeDeps, withAuthz } from '../../src/lib/authz/with-authz.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  directoryUser,
  TENANT_A,
  type TestPorts,
  WORKSPACE_A1,
} from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const USER_ID = 'user-cli';

interface Harness {
  readonly service: DeviceFlowService;
  readonly ports: TestPorts;
  readonly deps: AuthzRuntimeDeps;
}

function createHarness(): Harness {
  const ports = createTestPorts({
    users: [directoryUser({ id: USER_ID, tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1] })],
  });
  ports.clock.set(NOW);
  const sink = createInMemoryAuditSink();
  const audit = createAuditLogger({
    sink,
    now: () => new Date(ports.clock.nowSeconds() * 1000),
    newId: createSequentialIds('audit'),
  });

  return {
    ports,
    service: createDeviceFlowService({
      ports,
      audit,
      accessTokenSecret: 'access-secret',
      verificationUri: 'https://hub.example.com/device',
      newId: createSequentialIds('rec'),
    }),
    deps: {
      ports,
      audit,
      revocation: { isRevoked: async () => false },
      sessionSecret: 'session-secret',
      accessTokenSecret: 'access-secret',
      allowedOrigins: ['https://hub.example.com'],
    },
  };
}

async function issueTokens(harness: Harness) {
  const issued = await harness.service.requestCode({
    tenantId: TENANT_A,
    scope: ['publish:write'],
    deviceLabel: 'cli',
  });
  await harness.service.approve({
    tenantId: TENANT_A,
    userCode: issued.user_code,
    userId: USER_ID,
    workspaceId: WORKSPACE_A1,
  });
  const exchanged = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
  if (!exchanged.ok) throw new Error(`前提: 交換は成功するはず (${exchanged.error.error})`);
  return { issued, token: exchanged.value };
}

describe('T-TOKC-01: token 応答が RFC 6749 §5.1 を満たす', () => {
  it('実際に発行した応答が契約 schema を通る', async () => {
    const harness = createHarness();
    const { token } = await issueTokens(harness);

    const parsed = tokenResponseSchema.safeParse(token);
    expect(parsed.success).toBe(true);

    // 必須項目が「たまたま入っていた」ではなく契約として在ること
    expect(Object.keys(token).sort()).toEqual(
      ['access_token', 'expires_in', 'refresh_token', 'scope', 'token_type'].sort(),
    );
    expect(token.token_type).toBe('Bearer');
    expect(token.expires_in).toBe(900);
  });

  it('access token の claims が typ=access と token_id を持つ (session と取り違えない)', async () => {
    const harness = createHarness();
    const { token } = await issueTokens(harness);

    const verified = await verifyJwt(token.access_token, 'access-secret');
    if (!verified.ok) throw new Error('署名は通るはず');
    expect(verified.payload).toMatchObject({
      typ: 'access',
      sub: USER_ID,
      tenant_id: TENANT_A,
      workspace_id: WORKSPACE_A1,
      scope: ['publish:write'],
    });
  });

  it('rotation 後の応答も同じ形を保つ (client が形の分岐を書かずに済む)', async () => {
    const harness = createHarness();
    const { token } = await issueTokens(harness);

    harness.ports.clock.advance(60);
    const rotated = await harness.service.refresh({ tenantId: TENANT_A, refreshToken: token.refresh_token });
    if (!rotated.ok) throw new Error('rotation は成功するはず');
    expect(tokenResponseSchema.safeParse(rotated.value).success).toBe(true);
  });
});

describe('T-TOKC-02: device 認可エラーが RFC 8628 §3.5 の語彙に閉じる', () => {
  it('語彙が 6 種に限定されている', () => {
    expect(deviceErrorCodeSchema.options).toEqual([
      'authorization_pending',
      'slow_down',
      'access_denied',
      'expired_token',
      'invalid_grant',
      'invalid_request',
    ]);
  });

  it('実装が返すエラーが全て語彙内 (未知コードで client を無限 polling させない)', async () => {
    const harness = createHarness();
    const emitted = new Set<string>();

    // 未知の device_code
    const unknown = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: 'unknown-code' });
    if (!unknown.ok) emitted.add(unknown.error.error);

    // 未承認 → slow_down → 期限切れ
    const pendingIssued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });
    const pending = await harness.service.exchangeToken({
      tenantId: TENANT_A,
      deviceCode: pendingIssued.device_code,
    });
    if (!pending.ok) emitted.add(pending.error.error);
    const tooFast = await harness.service.exchangeToken({
      tenantId: TENANT_A,
      deviceCode: pendingIssued.device_code,
    });
    if (!tooFast.ok) emitted.add(tooFast.error.error);

    harness.ports.clock.advance(600);
    const expired = await harness.service.exchangeToken({
      tenantId: TENANT_A,
      deviceCode: pendingIssued.device_code,
    });
    if (!expired.ok) emitted.add(expired.error.error);

    expect([...emitted].sort()).toEqual(['authorization_pending', 'expired_token', 'invalid_grant', 'slow_down']);
    for (const code of emitted) {
      expect(deviceErrorResponseSchema.safeParse({ error: code }).success, code).toBe(true);
    }
  });

  it('access_denied も語彙内に収まる (拒否・試行上限)', async () => {
    const harness = createHarness();
    const issued = await harness.service.requestCode({ tenantId: TENANT_A, scope: [], deviceLabel: null });
    await harness.service.approve({
      tenantId: TENANT_A,
      userCode: issued.user_code,
      userId: USER_ID,
      workspaceId: WORKSPACE_A1,
    });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await harness.service.approve({
        tenantId: TENANT_A,
        userCode: issued.user_code,
        userId: USER_ID,
        workspaceId: WORKSPACE_A1,
      });
    }

    const denied = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    expect(denied).toEqual({ ok: false, error: { error: 'access_denied' } });
  });
});

describe('T-TOKC-03: 失効済み token での API 呼び出しは 401', () => {
  function protectedRoute(deps: AuthzRuntimeDeps) {
    return withAuthz(
      {
        action: 'publish.write',
        deps,
        resolveResource: async () => ({
          type: 'harness',
          id: 'harness-1',
          tenantId: TENANT_A,
          workspaceId: WORKSPACE_A1,
          ownerUserId: USER_ID,
        }),
      },
      async () => Response.json({ ok: true }),
    );
  }

  function bearerRequest(accessToken: string): Request {
    return new Request('https://hub.example.com/api/v1/harnesses', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  }

  it('有効な access token は通る (対照)', async () => {
    const harness = createHarness();
    const { token } = await issueTokens(harness);

    const response = await protectedRoute(harness.deps)(bearerRequest(token.access_token));
    expect(response.status).toBe(200);
  });

  it('緊急失効を打つと即時に 401 になる', async () => {
    const harness = createHarness();
    const { token } = await issueTokens(harness);

    const deps: AuthzRuntimeDeps = { ...harness.deps, revocation: { isRevoked: async () => true } };
    const response = await protectedRoute(deps)(bearerRequest(token.access_token));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'revoked_session' });
  });

  it('access token の TTL (15 分) を過ぎたら 401', async () => {
    const harness = createHarness();
    const { token } = await issueTokens(harness);

    harness.ports.clock.advance(900);
    const response = await protectedRoute(harness.deps)(bearerRequest(token.access_token));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('token を失効させた後は refresh で取り直せない', async () => {
    const harness = createHarness();
    const { token } = await issueTokens(harness);
    const tokenId = harness.ports.publisherTokens.all()[0]?.id;
    if (tokenId === undefined) throw new Error('token があるはず');

    await harness.service.revokeToken({ tenantId: TENANT_A, tokenId, actorUserId: USER_ID });

    harness.ports.clock.advance(60);
    expect(await harness.service.refresh({ tenantId: TENANT_A, refreshToken: token.refresh_token })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });
  });

  it('失効応答が契約 schema を満たす', async () => {
    const harness = createHarness();
    await issueTokens(harness);
    const tokenId = harness.ports.publisherTokens.all()[0]?.id;
    if (tokenId === undefined) throw new Error('token があるはず');

    const revoked = await harness.service.revokeToken({ tenantId: TENANT_A, tokenId, actorUserId: USER_ID });
    expect(
      tokenRevocationResponseSchema.safeParse({
        id: tokenId,
        status: 'revoked',
        revoked_count: revoked?.revokedCount,
      }).success,
    ).toBe(true);
  });
});

describe('T-TOKC-04: 契約が平文 refresh の保存経路を持たない', () => {
  it('一覧契約に token 値を載せる場所が無い', async () => {
    const harness = createHarness();
    const { token } = await issueTokens(harness);

    const summaries = await harness.service.listTokensForUser({ tenantId: TENANT_A, userId: USER_ID });
    const listResponse = { items: summaries };
    expect(tokenListResponseSchema.safeParse(listResponse).success).toBe(true);

    // 契約 schema は未知キーを落とす。仮に実装が漏らしても wire には出ない
    const parsed = tokenListResponseSchema.parse({
      items: summaries.map((item) => ({ ...item, refresh_token: token.refresh_token })),
    });
    expect(JSON.stringify(parsed)).not.toContain(token.refresh_token);
  });

  it('公開 schema に保存 API (keychain / credential store) が無い', () => {
    // 保存は feat-publisher-plugin の責務。ここに現れたら責務境界が壊れている
    const forbidden = /keychain|credentialstore|credential_store|securestorage|secure_storage|saveToken|storeToken/i;
    expect(Object.keys(schemas).filter((name) => forbidden.test(name))).toEqual([]);
  });

  it('device flow service の公開面にも保存 API が無い', () => {
    const harness = createHarness();
    expect(Object.keys(harness.service).sort()).toEqual([
      'approve',
      'exchangeToken',
      'listTokensForUser',
      'listTokensForWorkspace',
      'refresh',
      'requestCode',
      'revokeToken',
    ]);
  });
});
