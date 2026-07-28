/**
 * `/api/auth/*` (Auth.js の結線点) の route 単体検査。
 *
 * この file が持つべきなのは**結線だけ**で、実処理は adapter 側 (`authjs-handler.ts`) にある。
 * したがってここで確かめるのは 3 点に絞られる:
 *   - GET / POST の両方が runtime の `authRoute` へ届くこと (片方だけ結線漏れ、が起きやすい)
 *   - 要求を加工せず素通しすること (テナントを path で運ぶ設計を route が壊さない)
 *   - 要求ごとに `authRuntime()` を引くこと (鍵や接続先の更新後に旧 runtime を使い続けない)
 *
 * adapter そのものの振る舞いは `authjs-handler.test.ts` が実 `Auth()` を通して検証している。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '../../src/app/api/auth/[...nextauth]/route.js';
import type { AuthRuntime } from '../../src/lib/authz/runtime.js';
import { createTokenRouteHarness } from './support/token-route-runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../src/lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 runtime が未設定です');
      return runtimeHolder.current;
    },
  };
});

const SIGNIN_URL = 'https://hub.example.com/api/auth/acme/signin/tenant-oidc';

/** `authRoute` を記録用のスタブへ差し替える。adapter の中身はここの関心ではない。 */
function createRecordingHarness() {
  const received: Request[] = [];
  const harness = createTokenRouteHarness({
    authRoute: async (request) => {
      received.push(request);
      return Response.json({ handled: request.method }, { status: 201 });
    },
  });
  runtimeHolder.current = harness.runtime;
  return received;
}

describe('/api/auth/*: Auth.js への結線', () => {
  let received: Request[];

  beforeEach(() => {
    received = createRecordingHarness();
  });

  it('GET を authRoute へそのまま渡し、応答を加工せず返す', async () => {
    const response = await GET(new Request(SIGNIN_URL));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ handled: 'GET' });
    expect(received).toHaveLength(1);
    // path のテナント (acme) が落ちると、IdP から戻る間にテナントを見失う
    expect(received[0]?.url).toBe(SIGNIN_URL);
  });

  it('POST も同じ handler へ届く (結線の片落ちを防ぐ)', async () => {
    const response = await POST(new Request(SIGNIN_URL, { method: 'POST', body: 'csrfToken=x' }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ handled: 'POST' });
    expect(received).toHaveLength(1);
    expect(received[0]?.method).toBe('POST');
  });

  it('runtime を差し替えると次の要求から新しい handler が使われる', async () => {
    await GET(new Request(SIGNIN_URL));
    const replaced = createRecordingHarness();

    await GET(new Request(SIGNIN_URL));

    // module 読み込み時に handler を掴んでいると、ここが 0 のままになる
    expect(replaced).toHaveLength(1);
    expect(received).toHaveLength(1);
  });
});
