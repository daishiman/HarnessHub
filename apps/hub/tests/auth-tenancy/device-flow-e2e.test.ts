/**
 * T-DEV-E2E-01 (AC-2)。
 *
 * 単体テストが「部品ごとに正しい」を示すのに対し、ここは
 * **CLI 利用者が実際に踏む順番どおりに一本つなげて**通ることを示す。
 * 部品が個々に正しくても、状態遷移の順序 (pending → approved → consumed) が
 * 噛み合っていなければ実運用では動かないため、順序込みで 1 本の物語として検証する。
 */

import { tokenResponseSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { createDeviceFlowService } from '../../src/lib/auth/device-flow/service.js';
import { type AuthzRuntimeDeps, withAuthz } from '../../src/lib/authz/with-authz.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  directoryUser,
  TENANT_A,
  WORKSPACE_A1,
} from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const USER_ID = 'user-cli';
/** access token の TTL (15 分)。仕様書のリテラルを書く (実装定数を参照しない)。 */
const ACCESS_TTL_SECONDS = 900;

function createHarness() {
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

  const deps: AuthzRuntimeDeps = {
    ports,
    audit,
    revocation: { isRevoked: async () => false },
    sessionSecret: 'session-secret',
    accessTokenSecret: 'access-secret',
    allowedOrigins: ['https://hub.example.com'],
  };

  return {
    ports,
    sink,
    deps,
    service: createDeviceFlowService({
      ports,
      audit,
      accessTokenSecret: 'access-secret',
      verificationUri: 'https://hub.example.com/device',
      newId: createSequentialIds('rec'),
    }),
  };
}

/** publish 系 API の代表。認可を通ったかどうかだけを見たいので handler は最小にする。 */
function publishRoute(deps: AuthzRuntimeDeps) {
  return withAuthz(
    {
      action: 'publish.write',
      deps,
      resolveResource: async () => ({
        type: 'harness',
        id: 'harness-e2e',
        tenantId: TENANT_A,
        workspaceId: WORKSPACE_A1,
        ownerUserId: USER_ID,
      }),
    },
    async (_request, authz) => Response.json({ ok: true, effectiveRole: authz.effectiveRole }),
  );
}

function publishRequest(accessToken: string): Request {
  return new Request('https://hub.example.com/api/v1/harnesses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      origin: 'https://hub.example.com',
    },
  });
}

describe('T-DEV-E2E-01: Device Flow を端から端まで通す', () => {
  it('code 発行 → polling → 承認 → token 交換 → API 呼び出し → rotation → 失効 が一本で通る', async () => {
    const harness = createHarness();

    // --- 1. CLI が code を要求する ------------------------------------------------
    const issued = await harness.service.requestCode({
      tenantId: TENANT_A,
      scope: ['publish:write'],
      deviceLabel: 'macbook-cli',
    });
    expect(issued.user_code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(issued.verification_uri_complete).toBe(`https://hub.example.com/device?user_code=${issued.user_code}`);

    // --- 2. 利用者がまだ承認していない間の polling ---------------------------------
    const pending = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    expect(pending).toEqual({ ok: false, error: { error: 'authorization_pending' } });

    // --- 3. ブラウザ側で承認 (人が読み上げた形で入力されても照合できる) --------------
    const spoken = `${issued.user_code.slice(0, 4)}-${issued.user_code.slice(4)}`.toLowerCase();
    const approved = await harness.service.approve({
      tenantId: TENANT_A,
      userCode: spoken,
      userId: USER_ID,
      workspaceId: WORKSPACE_A1,
    });
    expect(approved).toEqual({ ok: true, deviceLabel: 'macbook-cli' });

    // --- 4. token 交換 (interval を守って polling する) -----------------------------
    harness.ports.clock.advance(5);
    const exchanged = await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code });
    if (!exchanged.ok) throw new Error(`交換は成功するはず (${exchanged.error.error})`);
    expect(tokenResponseSchema.safeParse(exchanged.value).success).toBe(true);

    // --- 5. 発行された access token で保護 API を叩く -------------------------------
    const first = await publishRoute(harness.deps)(publishRequest(exchanged.value.access_token));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, effectiveRole: 'owner' });

    // --- 6. rotation (access token の期限が近づいたら refresh で取り直す) ------------
    harness.ports.clock.advance(880);
    const rotated = await harness.service.refresh({
      tenantId: TENANT_A,
      refreshToken: exchanged.value.refresh_token,
    });
    if (!rotated.ok) throw new Error(`rotation は成功するはず (${rotated.error.error})`);
    expect(rotated.value.refresh_token).not.toBe(exchanged.value.refresh_token);

    // 旧 access token は TTL 切れ、新しい access token は通る
    harness.ports.clock.advance(20);
    expect((await publishRoute(harness.deps)(publishRequest(exchanged.value.access_token))).status).toBe(401);
    expect((await publishRoute(harness.deps)(publishRequest(rotated.value.access_token))).status).toBe(200);

    // --- 7. 端末紛失 → 利用者が token を失効させる ----------------------------------
    const active = (await harness.service.listTokensForUser({ tenantId: TENANT_A, userId: USER_ID })).filter(
      (summary) => summary.status === 'active',
    );
    expect(active).toHaveLength(1);
    const revoked = await harness.service.revokeToken({
      tenantId: TENANT_A,
      tokenId: active[0]?.id ?? '',
      actorUserId: USER_ID,
    });
    expect(revoked).toEqual({ revokedCount: 1 });

    // --- 8. 失効後は取り直せない -----------------------------------------------------
    harness.ports.clock.advance(60);
    expect(await harness.service.refresh({ tenantId: TENANT_A, refreshToken: rotated.value.refresh_token })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });
    // device_code も戻り道にならない。この時点では 10 分の TTL が先に切れているので
    // `expired_token` が返る (使い捨て判定はその手前で到達しない)。
    // いずれにせよ最初から code を取り直す以外の復帰経路が無い
    expect(await harness.service.exchangeToken({ tenantId: TENANT_A, deviceCode: issued.device_code })).toEqual({
      ok: false,
      error: { error: 'expired_token' },
    });

    // 失効済みの access token は残り TTL の間だけ通る (既知の窓。runbook に記載)。
    // 窓が閉じたあとは 401 になり、refresh も死んでいるので復帰できない
    harness.ports.clock.advance(ACCESS_TTL_SECONDS);
    expect((await publishRoute(harness.deps)(publishRequest(rotated.value.access_token))).status).toBe(401);

    // --- 9. 監査に一連の痕跡が残る ---------------------------------------------------
    // 末尾の reuse_detected は「失効させた token で CLI がまだ refresh を試みた」痕跡。
    // 実装は正当な取り残しと窃取を区別できないので、どちらも同じ形で記録される
    expect(harness.sink.events().map((event) => event.action)).toEqual([
      'device.approve',
      'token.issue',
      'token.revoke',
      'token.reuse_detected',
    ]);
  });
});
