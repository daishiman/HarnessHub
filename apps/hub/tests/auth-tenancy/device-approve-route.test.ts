/**
 * `POST /api/v1/device/approve` の route handler。
 *
 * ここは device flow で唯一 **認証必須**の段で、`withAuthz` が入口になっている。
 * したがって検証は 2 層に分かれる:
 *   1. 認可層 — Origin・session・資源解決で落ちるものが handler へ届かないこと
 *   2. 業務層 — 承認できなかった理由 (not_found / expired / denied / already_used) が
 *      client から区別できる status で返ること
 * 2 を status ごとに固定しておかないと、CLI 側が「もう一度入力させる」のか
 * 「最初からやり直させる」のかを応答から決められなくなる。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authRuntime } from '../../src/lib/authz/runtime.js';
import { TENANT_HEADER } from '../../src/middleware/index.js';
import {
  ALLOWED_ORIGIN,
  createDeviceRouteHarness,
  DEVICE_CODE_TTL_SECONDS,
  type DeviceRouteHarness,
  sessionCookieHeader,
  USER_CODE_MAX_ATTEMPTS,
  USER_ID,
} from './support/device-route-runtime.js';
import { directoryUser, TENANT_A, TENANT_B, WORKSPACE_A1, WORKSPACE_A2 } from './support/in-memory-ports.js';

vi.mock('../../src/lib/authz/runtime.js', () => ({
  authRuntime: vi.fn(),
  createAuthRuntime: vi.fn(),
  createDbAuditSink: vi.fn(),
  createProductionAuthRuntime: vi.fn(),
  readAuthRuntimeEnv: vi.fn(),
}));

const { POST } = await import('../../src/app/api/v1/device/approve/route.js');

const URL_UNDER_TEST = 'https://hub.example.com/api/v1/device/approve';
/** 文字集合としては妥当だが、どの認可にも対応しない user_code。 */
const UNKNOWN_USER_CODE = 'ZZZZZZZZ';

const APPROVER = directoryUser({ id: USER_ID, tenantId: TENANT_A, workspaceIds: [WORKSPACE_A1] });

let harness: DeviceRouteHarness;

beforeEach(() => {
  harness = createDeviceRouteHarness();
  vi.mocked(authRuntime).mockReturnValue(harness.runtime);
});

/**
 * ブラウザからの承認要求。
 * 各 header は `undefined` なら既定値、`null` なら「送らない」を意味する
 * (欠落そのものを検査したい header があるため、省略と明示的な欠落を区別する)。
 */
async function approveRequest(
  body: unknown,
  overrides: {
    readonly cookie?: string | null;
    readonly origin?: string | null;
    readonly tenantId?: string | null;
    /** JSON として壊れた body を送りたいときだけ使う。 */
    readonly rawBody?: string;
  } = {},
): Promise<Request> {
  const headers = new Headers({ 'content-type': 'application/json' });

  const cookie = overrides.cookie === undefined ? await sessionCookieHeader(APPROVER) : overrides.cookie;
  if (cookie !== null) headers.set('cookie', cookie);

  const origin = overrides.origin === undefined ? ALLOWED_ORIGIN : overrides.origin;
  if (origin !== null) headers.set('origin', origin);

  const tenantId = overrides.tenantId === undefined ? TENANT_A : overrides.tenantId;
  if (tenantId !== null) headers.set(TENANT_HEADER, tenantId);

  return new Request(URL_UNDER_TEST, { method: 'POST', headers, body: overrides.rawBody ?? JSON.stringify(body) });
}

async function issueCode() {
  return harness.runtime.deviceFlow.requestCode({
    tenantId: TENANT_A,
    scope: ['publish:write'],
    deviceLabel: 'macbook-cli',
  });
}

describe('POST /api/v1/device/approve: 業務層 (承認の結果)', () => {
  it('pending の user_code を承認すると 200 とデバイス名を返し、監査に痕跡が残る', async () => {
    const issued = await issueCode();

    const response = await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ approved: true, device_label: 'macbook-cli' });
    expect(harness.ports.deviceAuthorizations.all()[0]?.status).toBe('approved');
    expect(harness.sink.events().map((event) => event.action)).toEqual(['device.approve']);
  });

  it('承認は body の workspace_id へ束縛される (header の申告ではない)', async () => {
    const issued = await issueCode();

    await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }));

    expect(harness.ports.deviceAuthorizations.all()[0]?.workspaceId).toBe(WORKSPACE_A1);
    expect(harness.ports.deviceAuthorizations.all()[0]?.approvedByUserId).toBe(USER_ID);
  });

  it('存在しない user_code は 404 not_found', async () => {
    const response = await POST(await approveRequest({ user_code: UNKNOWN_USER_CODE, workspace_id: WORKSPACE_A1 }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
  });

  it('TTL を過ぎた user_code は 410 expired (再入力ではなく取り直しを促す)', async () => {
    const issued = await issueCode();
    harness.ports.clock.advance(DEVICE_CODE_TTL_SECONDS);

    const response = await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }));

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: 'expired' });
  });

  it('承認済みの user_code をもう一度承認すると 409 already_used', async () => {
    const issued = await issueCode();
    await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }));

    const response = await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'already_used' });
  });

  it('試行上限に達すると 403 denied へ落ちる', async () => {
    const issued = await issueCode();
    await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }));

    // 承認後の追加要求は「code は知っているが承認できなかった」試行として数えられる
    for (let attempt = 0; attempt < USER_CODE_MAX_ATTEMPTS - 1; attempt += 1) {
      const repeated = await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }));
      expect(repeated.status).toBe(409);
    }

    const response = await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'denied' });
  });

  it('ハイフン入りの user_code は wire 契約の手前で落ちる (正規化は service の責務)', async () => {
    const issued = await issueCode();
    const spoken = `${issued.user_code.slice(0, 4)}-${issued.user_code.slice(4)}`;

    const response = await POST(await approveRequest({ user_code: spoken, workspace_id: WORKSPACE_A1 }));

    // schema は 8 文字ちょうどを要求するので、読み上げ形は資源解決に届かない。
    // 「人が入力した形の吸収は UI 側で行う」という境界がここに出ている
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
  });
});

describe('POST /api/v1/device/approve: 認可層 (handler へ届く前に落ちるもの)', () => {
  it('body の形が不正なら資源を確定できず 400 (承認は起きない)', async () => {
    await issueCode();

    const response = await POST(await approveRequest({ user_code: 'SHORT', workspace_id: WORKSPACE_A1 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
    expect(harness.ports.deviceAuthorizations.all()[0]?.status).toBe('pending');
  });

  it('JSON として読めない body も例外を外へ出さず 400', async () => {
    await issueCode();

    const response = await POST(await approveRequest(null, { rawBody: '{' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
    expect(harness.ports.deviceAuthorizations.all()[0]?.status).toBe('pending');
  });

  it('テナント申告 header が無ければ資源を確定できず 400', async () => {
    const issued = await issueCode();

    const response = await POST(
      await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }, { tenantId: null }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'unresolved_resource' });
  });

  it('session が無ければ 401 unauthenticated', async () => {
    const issued = await issueCode();

    const response = await POST(
      await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }, { cookie: null }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('Origin を送らない state-changing 要求は 403 untrusted_origin', async () => {
    const issued = await issueCode();

    const response = await POST(
      await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }, { origin: null }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'untrusted_origin' });
  });

  it('所属していない Workspace への承認は 403 workspace_not_member', async () => {
    const issued = await issueCode();

    const response = await POST(await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A2 }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'workspace_not_member' });
    expect(harness.ports.deviceAuthorizations.all()[0]?.status).toBe('pending');
  });

  it('他テナントを申告した承認は 404 (資源の存在自体を伏せる)', async () => {
    const issued = await issueCode();

    const response = await POST(
      await approveRequest({ user_code: issued.user_code, workspace_id: WORKSPACE_A1 }, { tenantId: TENANT_B }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'tenant_mismatch' });
  });
});
