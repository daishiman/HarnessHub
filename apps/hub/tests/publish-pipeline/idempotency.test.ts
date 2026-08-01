/**
 * Idempotency-Key の検査・記録・再生 (test-design.md T7 / ADR AD-10)。
 *
 * 「2 回目は 1 回目の応答をそのまま返す」の確認は、応答本文だけ見ても足りない。
 * **handler が呼ばれていない**ことまで見ないと、実際には二重公開しておきながら
 * 同じ応答を返しているだけ、という実装を見逃す。全テストで呼び出し回数を数える。
 */

import { describe, expect, it } from 'vitest';

import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_REPLAY_HEADER,
  IDEMPOTENCY_TTL_MS,
  withIdempotency,
} from '@/lib/publish/idempotency';

import { createPublishHarness, FIXED_NOW_MS } from './support/harness';

const LEDGER_SCOPE = 'POST /api/v1/publish';

function jsonRequest(body: string, key?: string): Request {
  return new Request('https://hub.example.com/api/v1/publish', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(key === undefined ? {} : { [IDEMPOTENCY_HEADER]: key }),
    },
    body,
  });
}

/** 呼ばれた回数を数える handler。`withIdempotency` が実際に実行を止めたかを見るため。 */
function countingHandler(response: () => Response): { run: () => Promise<Response>; calls: () => number } {
  let calls = 0;
  return {
    run: async () => {
      calls += 1;
      return response();
    },
    calls: () => calls,
  };
}

function okResponse(id: string): Response {
  return Response.json({ id }, { status: 201 });
}

function setup() {
  const harness = createPublishHarness();
  return {
    harness,
    options: (rawBody: string) => ({
      ledgerScope: LEDGER_SCOPE,
      deps: { idempotency: harness.ports.idempotency, clock: harness.ports.clock },
      scope: harness.scope,
      rawBody,
    }),
  };
}

describe('鍵の検査 (T7-A)', () => {
  it('鍵が無ければ 400 で、handler は呼ばれない', async () => {
    // 既定値を与えて通すと、再試行安全性が client の実装次第になる
    const { options } = setup();
    const body = '{"project_id":"proj-1"}';
    const handler = countingHandler(() => okResponse('req-1'));

    const response = await withIdempotency(jsonRequest(body), options(body), handler.run);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'idempotency_key_required' });
    expect(handler.calls()).toBe(0);
  });

  it.each([
    ['空文字', ''],
    ['空白だけ', '   '],
  ])('%s の鍵も 400 として扱う', async (_label, key) => {
    const { options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    const response = await withIdempotency(jsonRequest(body, key), options(body), handler.run);

    expect(response.status).toBe(400);
    expect(handler.calls()).toBe(0);
  });

  it.each([
    ['7 文字 (下限未満)', 'a'.repeat(7), 400],
    ['8 文字 (下限ちょうど)', 'a'.repeat(8), 201],
    ['255 文字 (上限ちょうど)', 'a'.repeat(255), 201],
    ['256 文字 (上限超過)', 'a'.repeat(256), 400],
  ])('%s の鍵は %s', async (_label, key, expected) => {
    // 長さの境目は `idempotencyKeySchema` (min 8 / max 255) が正本。
    // ここで固定しておかないと、短すぎる鍵 (= 衝突しやすい鍵) が静かに通るようになる
    const { options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    const response = await withIdempotency(jsonRequest(body, key), options(body), handler.run);

    expect(response.status).toBe(expected);
  });

  it('前後の空白は落として同じ鍵とみなす', async () => {
    const { options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    const second = await withIdempotency(jsonRequest(body, '  key-00000001  '), options(body), handler.run);

    expect(second.status).toBe(201);
    expect(handler.calls()).toBe(1);
  });
});

describe('同一鍵・同一内容の再生 (T7-B)', () => {
  it('2 回目は handler を呼ばず 1 回目の応答を返す', async () => {
    const { options } = setup();
    const body = '{"project_id":"proj-1"}';
    const handler = countingHandler(() => okResponse('req-1'));

    const first = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    const second = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);

    expect(handler.calls()).toBe(1);
    expect(second.status).toBe(first.status);
    expect(await second.json()).toEqual({ id: 'req-1' });
  });

  it('再生であることを header で伝える', async () => {
    // client が「本当に今作られたのか」を判別できないと、再試行の成否を記録できない
    const { options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    const first = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    const second = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);

    expect(first.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBeNull();
    expect(second.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBe('true');
    expect(second.headers.get('cache-control')).toBe('no-store');
  });

  it('1 回目の応答本文は消費されず、呼び出し側へも届く', async () => {
    // 台帳へ記録するために本文を読むので、複製せずに読むと呼び出し側が空を受け取る
    const { options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    const first = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);

    expect(await first.json()).toEqual({ id: 'req-1' });
  });
});

describe('同一鍵・別内容の拒否 (T7-C)', () => {
  it('内容が違えば 422 で、handler は呼ばれない', async () => {
    // 同じ鍵で別の要求を通すと、鍵が識別子として機能しなくなる
    const { options } = setup();
    const first = '{"project_id":"proj-1"}';
    const second = '{"project_id":"proj-2"}';
    const handler = countingHandler(() => okResponse('req-1'));

    await withIdempotency(jsonRequest(first, 'key-00000001'), options(first), handler.run);
    const response = await withIdempotency(jsonRequest(second, 'key-00000001'), options(second), handler.run);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'idempotency_key_reused' });
    expect(handler.calls()).toBe(1);
  });

  it('本文が同じでも別 endpoint なら別内容として扱う', async () => {
    // 指紋に method と path を含める理由。同じ鍵で別 endpoint を叩く誤用を検出する
    const { options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));
    const other = new Request('https://hub.example.com/api/v1/channels', {
      method: 'POST',
      headers: { [IDEMPOTENCY_HEADER]: 'key-00000001' },
      body,
    });

    await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    const response = await withIdempotency(other, options(body), handler.run);

    expect(response.status).toBe(422);
  });

  it('台帳の scope が違えば別の鍵空間になる', async () => {
    // endpoint ごとに分けないと、別 endpoint の鍵と衝突して正当な要求が 422 になる
    const { options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    const response = await withIdempotency(
      jsonRequest(body, 'key-00000001'),
      { ...options(body), ledgerScope: 'POST /api/v1/channels' },
      handler.run,
    );

    expect(response.status).toBe(201);
    expect(handler.calls()).toBe(2);
  });

  it('テナントが違えば別の鍵空間になる', async () => {
    const { harness, options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    const response = await withIdempotency(
      jsonRequest(body, 'key-00000001'),
      { ...options(body), scope: harness.otherTenantScope },
      handler.run,
    );

    expect(response.status).toBe(201);
    expect(handler.calls()).toBe(2);
  });
});

describe('記録するのは 2xx だけ (T7-D)', () => {
  it.each([
    ['400', 400],
    ['409', 409],
    ['422', 422],
    ['500', 500],
  ])('%s の応答は台帳へ記録せず、同じ鍵で再実行できる', async (_label, status) => {
    // 失敗まで記録すると、原因を直して同じ鍵で再送しても失敗が再生され続け、
    // client は鍵を変えるしかなくなる (= 冪等鍵の意味が失われる)
    const { options } = setup();
    const body = '{}';
    let calls = 0;
    const handler = async (): Promise<Response> => {
      calls += 1;
      return calls === 1 ? Response.json({ error: 'x' }, { status }) : okResponse('req-1');
    };

    const first = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler);
    const second = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler);

    expect(first.status).toBe(status);
    expect(second.status).toBe(201);
    expect(calls).toBe(2);
  });

  it('204 (本文なし) も記録して再生できる', async () => {
    // 2xx の下限・上限の境目を確かめる。204 は本文が無いだけで成功である
    const { options } = setup();
    const body = '{}';
    const handler = countingHandler(() => new Response(null, { status: 204 }));

    await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    const second = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);

    expect(second.status).toBe(204);
    expect(handler.calls()).toBe(1);
  });

  it('300 番台は記録しない (2xx の上限)', async () => {
    const { options } = setup();
    const body = '{}';
    let calls = 0;
    const handler = async (): Promise<Response> => {
      calls += 1;
      return calls === 1 ? new Response(null, { status: 302 }) : okResponse('req-1');
    };

    await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler);
    const second = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler);

    expect(second.status).toBe(201);
    expect(calls).toBe(2);
  });
});

describe('保持期間 (T7-E)', () => {
  it('TTL 内は再生する', async () => {
    const { harness, options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    harness.setNow(FIXED_NOW_MS + IDEMPOTENCY_TTL_MS - 1);
    const second = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);

    expect(handler.calls()).toBe(1);
    expect(second.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBe('true');
  });

  it('TTL を過ぎた記録は再生せず、新しい要求として扱う', async () => {
    // 期限切れは「記録が無い」と同じ。ここで 422 にすると、鍵を再利用する
    // 正当な client (日次バッチなど) が永久に通らなくなる
    const { harness, options } = setup();
    const body = '{}';
    const handler = countingHandler(() => okResponse('req-1'));

    await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);
    harness.setNow(FIXED_NOW_MS + IDEMPOTENCY_TTL_MS + 1);
    const second = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler.run);

    expect(handler.calls()).toBe(2);
    expect(second.status).toBe(201);
    expect(second.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBeNull();
  });

  it('期限切れなら内容が違っても 422 にしない', async () => {
    const { harness, options } = setup();
    const first = '{"a":1}';
    const second = '{"a":2}';
    const handler = countingHandler(() => okResponse('req-1'));

    await withIdempotency(jsonRequest(first, 'key-00000001'), options(first), handler.run);
    harness.setNow(FIXED_NOW_MS + IDEMPOTENCY_TTL_MS + 1);
    const response = await withIdempotency(jsonRequest(second, 'key-00000001'), options(second), handler.run);

    expect(response.status).toBe(201);
  });

  it('TTL は 24 時間である', () => {
    // 短いと正当な再試行が新規要求に化け、長すぎると鍵の誤用が何日も 422 として残る
    expect(IDEMPOTENCY_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe('並行する同一鍵要求', () => {
  it('同時に到達しても、その後の再生は先着の応答へ収束する', async () => {
    // 台帳を引いた時点で両方とも空なら、2 本とも handler を通りうる。
    // 冪等鍵が保証するのは「同時到達の直列化」ではなく「以降の再試行が同じ応答を得ること」で、
    // 同時到達そのものを止めるのは channel の partial UNIQUE index の役目。
    // 記録は onConflictDoNothing なので**先着が残り、後着で上書きされない**
    const { options } = setup();
    const body = '{}';
    let calls = 0;
    const handler = async (): Promise<Response> => {
      calls += 1;
      return okResponse(`req-${calls}`);
    };

    const [first, second] = await Promise.all([
      withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler),
      withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler),
    ]);
    const firstBody = await first.clone().json();

    const third = await withIdempotency(jsonRequest(body, 'key-00000001'), options(body), handler);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBe('true');
    expect(await third.json()).toEqual(firstBody);
    // 3 本目は handler を通っていない
    expect(calls).toBeLessThanOrEqual(2);
  });
});
