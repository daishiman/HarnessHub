// 書き込みゲートの共有範囲を検証する (HarnessHub-b7ng)。
//
// Node のローカル libSQL は同一プロセスの接続競合を避けるため直列化する。一方 Workers の
// remote adapter は要求をまたぐ Promise を共有せず、DB 側の排他と CAS に並行制御を委ねる。

import { describe, expect, it } from 'vitest';
import { guardedWrite } from '../repository/conflict';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('guardedWrite の共有範囲', () => {
  it('process-local adapter の書き込みを到着順に直列化する', async () => {
    const owner = { writeConcurrencyScope: 'process-local' as const };
    const gate = deferred();
    const events: string[] = [];

    const first = guardedWrite(owner, async () => {
      events.push('first:start');
      await gate.promise;
      events.push('first:end');
    });
    await waitUntilStarted(() => events.length === 1);

    const second = guardedWrite(owner, async () => {
      events.push('second:start');
    });
    await Promise.resolve();
    expect(events).toStrictEqual(['first:start']);

    gate.resolve();
    await Promise.all([first, second]);
    expect(events).toStrictEqual(['first:start', 'first:end', 'second:start']);
  });

  it('request-bound adapter の書き込みを module scope の Promise で連結しない', async () => {
    const owner = { writeConcurrencyScope: 'request-bound' as const };
    const gate = deferred();
    const events: string[] = [];

    const first = guardedWrite(owner, async () => {
      events.push('first:start');
      await gate.promise;
      events.push('first:end');
    });
    await waitUntilStarted(() => events.length === 1);

    const second = guardedWrite(owner, async () => {
      events.push('second:start');
    });
    await second;
    expect(events).toStrictEqual(['first:start', 'second:start']);

    gate.resolve();
    await first;
    expect(events).toStrictEqual(['first:start', 'second:start', 'first:end']);
  });
});

/** Promise callback の開始だけを待つ小さな補助。実時間の sleep は使わない。 */
async function waitUntilStarted(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 10 && !predicate(); attempt += 1) {
    await Promise.resolve();
  }
  expect(predicate()).toBe(true);
}
