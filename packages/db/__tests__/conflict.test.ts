// repository/conflict.ts の判定・再試行・直列化ロジック (HarnessHub-b7ng)。
// DB を使わない純ロジックのテスト。driver 例外の「包まれ方」だけを再現する。

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONFLICT_MAX_RETRY,
  errorChainText,
  guardedWrite,
  isLockConflict,
  retryOnConflict,
} from '../repository/conflict';

/** drizzle が driver 例外を包んだ形。message は差し替えられ、元の例外は cause に入る。 */
function wrappedBusyError(): Error {
  const driver = Object.assign(new Error('SQLITE_BUSY: database is locked'), { code: 'SQLITE_BUSY' });
  return new Error('Failed query: insert into "publisher_tokens" (...) values (...)', { cause: driver });
}

/** run が起動と完了を記録する。tick の分だけ microtask を挟んで完了を後ろへずらす。 */
function recorder(events: string[], label: string, ticks: number) {
  return async (): Promise<string> => {
    events.push(`${label}:start`);
    for (let i = 0; i < ticks; i += 1) await Promise.resolve();
    events.push(`${label}:end`);
    return label;
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('errorChainText', () => {
  it('cause が無い error は message と code だけを畳む', () => {
    const error = Object.assign(new Error('boom'), { code: 'SQLITE_BUSY' });
    expect(errorChainText(error)).toBe('boom SQLITE_BUSY');
  });

  it('code を持たない error は空文字で埋める', () => {
    expect(errorChainText(new Error('boom'))).toBe('boom ');
  });

  it('cause が Error でなければそこで打ち切る', () => {
    const error = new Error('outer', { cause: 'ただの文字列' });
    expect(errorChainText(error)).toBe('outer ');
  });

  it('Error でない値は空文字になる', () => {
    expect(errorChainText('SQLITE_BUSY')).toBe('');
    expect(errorChainText(null)).toBe('');
  });

  it('cause の連鎖を辿って奥の message と code まで含める', () => {
    const text = errorChainText(wrappedBusyError());
    expect(text).toContain('Failed query');
    expect(text).toContain('SQLITE_BUSY');
    expect(text).toContain('database is locked');
  });

  it('連鎖は 5 段までで打ち切る', () => {
    let error = new Error('depth-6');
    for (let depth = 5; depth >= 1; depth -= 1) {
      error = new Error(`depth-${depth}`, { cause: error });
    }
    const text = errorChainText(error);
    expect(text).toContain('depth-5');
    expect(text).not.toContain('depth-6');
  });
});

describe('isLockConflict', () => {
  it('包まれた SQLITE_BUSY を cause 経由で検出する', () => {
    expect(isLockConflict(wrappedBusyError())).toBe(true);
  });

  it('database is locked を検出する', () => {
    expect(isLockConflict(new Error('database is locked'))).toBe(true);
  });

  it('UNIQUE 違反は再試行対象にしない', () => {
    expect(isLockConflict(new Error('UNIQUE constraint failed: releases.channel_id, releases.version'))).toBe(false);
  });

  it('包まれた message だけでは判定できない error を false にしない (cause を見る)', () => {
    expect(isLockConflict(new Error('Failed query: insert into "releases"'))).toBe(false);
  });
});

describe('retryOnConflict', () => {
  it('競合で失敗した後に成功したら結果を返す', async () => {
    let calls = 0;
    const result = await retryOnConflict(async () => {
      calls += 1;
      if (calls < 3) throw wrappedBusyError();
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('再試行対象でない error は即座に投げ直す', async () => {
    const run = vi.fn(async () => {
      throw new Error('UNIQUE constraint failed');
    });
    await expect(retryOnConflict(run)).rejects.toThrow(/UNIQUE/);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('isRetryable を差し替えると既定の述語ではなくそちらに従う', async () => {
    let calls = 0;
    const result = await retryOnConflict(
      async () => {
        calls += 1;
        if (calls < 2) throw new Error('UNIQUE constraint failed');
        return 'ok';
      },
      (error) => error instanceof Error && /unique/i.test(error.message),
    );
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('CONFLICT_MAX_RETRY 回まで試して、それでも競合し続けたら最後の error を投げる', async () => {
    vi.useFakeTimers();
    const run = vi.fn(async () => {
      throw wrappedBusyError();
    });
    // backoff の setTimeout を実時間で待たないよう、拒否を先に購読してから timer を進める。
    const settled = expect(retryOnConflict(run)).rejects.toThrow(/Failed query/);
    await vi.runAllTimersAsync();
    await settled;
    expect(run).toHaveBeenCalledTimes(CONFLICT_MAX_RETRY);
  });
});

describe('guardedWrite', () => {
  it('process-local の書き込みを到着順に直列化する', async () => {
    const owner = { writeConcurrencyScope: 'process-local' as const };
    const events: string[] = [];

    await Promise.all([
      guardedWrite(owner, recorder(events, 'first', 5)),
      guardedWrite(owner, recorder(events, 'second', 0)),
    ]);

    expect(events).toStrictEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });

  it('process-local でも owner が違えば互いに待たない', async () => {
    const ownerA = { writeConcurrencyScope: 'process-local' as const };
    const ownerB = { writeConcurrencyScope: 'process-local' as const };
    const events: string[] = [];

    await Promise.all([guardedWrite(ownerA, recorder(events, 'a', 5)), guardedWrite(ownerB, recorder(events, 'b', 0))]);

    expect(events).toStrictEqual(['a:start', 'b:start', 'b:end', 'a:end']);
  });

  it('先行した書き込みの失敗を後続へ伝播させない', async () => {
    const owner = { writeConcurrencyScope: 'process-local' as const };
    const failing = guardedWrite(owner, async () => {
      throw new Error('UNIQUE constraint failed');
    });
    await expect(failing).rejects.toThrow(/UNIQUE/);
    await expect(guardedWrite(owner, async () => 'ok')).resolves.toBe('ok');
  });

  it('request-bound は直列化せず、競合の再試行だけを行う', async () => {
    const owner = { writeConcurrencyScope: 'request-bound' as const };
    const events: string[] = [];

    await Promise.all([
      guardedWrite(owner, recorder(events, 'first', 5)),
      guardedWrite(owner, recorder(events, 'second', 0)),
    ]);

    expect(events).toStrictEqual(['first:start', 'second:start', 'second:end', 'first:end']);

    let calls = 0;
    const retried = await guardedWrite(owner, async () => {
      calls += 1;
      if (calls < 2) throw wrappedBusyError();
      return 'ok';
    });
    expect(retried).toBe('ok');
    expect(calls).toBe(2);
  });
});
