// connection 層の毒検知・fail-fast・reconnect のテスト (HarnessHub-njkm)。
//
// 状態遷移の細部は fake Client で決定的に検証し、受入条件の「別プロセスが同じ file を掴む」
// 経路は実 libSQL の子プロセスを 1 ケースだけ起動して検証する。fake だけでは driver の
// 実際の例外連鎖や、接続層への結線漏れを検出できないためである。
//
// 実 libSQL の正常系でも、reconnect が commit 済みデータを壊さないことを別ケースで固定する。

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Client, Transaction } from '@libsql/client';
import { sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { createRecoverableClient } from '../connection/recoverable-client';
import { createTursoClient } from '../connection/turso';
import { ConnectionPoisonedError } from '../src/errors';
import { isConnectionPoisoned, isLockConflict } from '../src/lock-conflict';

const EXTERNAL_WRITE_LOCK_SCRIPT = String.raw`
  import { createClient } from '@libsql/client';

  const client = createClient({ url: process.argv[1] });
  const transaction = await client.transaction('write');
  await transaction.execute('insert into connection_recovery_probe (value) values (100)');
  process.stdout.write('LOCKED\n');

  let releasing = false;
  async function release() {
    if (releasing) return;
    releasing = true;
    try {
      await transaction.rollback();
    } finally {
      transaction.close();
      client.close();
      process.exit(0);
    }
  }

  process.on('SIGTERM', () => void release());
  process.on('SIGINT', () => void release());
  await new Promise(() => {});
`;

async function startExternalWriteLock(url: string): Promise<ChildProcessWithoutNullStreams> {
  const child = spawn(process.execPath, ['--input-type=module', '--eval', EXTERNAL_WRITE_LOCK_SCRIPT, url], {
    cwd: join(import.meta.dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  await new Promise<void>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      cleanup();
      child.kill('SIGKILL');
      reject(new Error(`別プロセスのロック取得がタイムアウトしました (stdout=${stdout}, stderr=${stderr})`));
    }, 30_000);

    const cleanup = () => {
      clearTimeout(timeout);
      child.off('error', onError);
      child.off('exit', onExit);
      child.stdout.off('data', onStdout);
      child.stderr.off('data', onStderr);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `ロック取得前に別プロセスが終了しました (code=${String(code)}, signal=${String(signal)}, stderr=${stderr})`,
        ),
      );
    };
    const onStdout = (chunk: string) => {
      stdout += chunk;
      if (!stdout.includes('LOCKED\n')) return;
      cleanup();
      resolve();
    };
    const onStderr = (chunk: string) => {
      stderr += chunk;
    };

    child.on('error', onError);
    child.on('exit', onExit);
    child.stdout.on('data', onStdout);
    child.stderr.on('data', onStderr);
  });

  return child;
}

async function stopExternalWriteLock(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('別プロセスのロック解放がタイムアウトしました'));
    }, 10_000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

/** drizzle が driver の BUSY を包んだ形。message は差し替えられ、元の例外は cause に入る。 */
function busyError(): Error {
  const driver = Object.assign(new Error('SQLITE_BUSY: database is locked'), { code: 'SQLITE_BUSY' });
  return new Error('Failed query: insert into "audit_events" (...) values (...)', { cause: driver });
}

/** ロック競合ではない確定的な失敗。毒にしてはいけない側の代表。 */
function uniqueError(): Error {
  const driver = Object.assign(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email'), {
    code: 'SQLITE_CONSTRAINT',
  });
  return new Error('Failed query: insert into "users" (...) values (...)', { cause: driver });
}

/** raw 接続 1 本ぶんの観測点。何世代目か・どの呼び出しを受けたか・閉じられたかを記録する。 */
interface FakeRaw {
  readonly generation: number;
  readonly calls: string[];
  /** 次の 1 回だけこの例外で失敗する。transaction 系は tx 側の失敗指定にも使う。 */
  failNext: Error | null;
  closed: boolean;
}

function takeFailure(raw: FakeRaw): void {
  const error = raw.failNext;
  if (error === null) return;
  raw.failNext = null;
  throw error;
}

function fakeTransaction(raw: FakeRaw): Transaction {
  const tx = {
    async execute() {
      raw.calls.push('tx.execute');
      takeFailure(raw);
      return { rows: [] };
    },
    async batch() {
      raw.calls.push('tx.batch');
      takeFailure(raw);
      return [];
    },
    async executeMultiple() {
      raw.calls.push('tx.executeMultiple');
      takeFailure(raw);
    },
    async commit() {
      raw.calls.push('tx.commit');
      takeFailure(raw);
    },
    async rollback() {
      raw.calls.push('tx.rollback');
      takeFailure(raw);
    },
    close() {
      raw.calls.push('tx.close');
    },
    get closed() {
      return raw.closed;
    },
  };
  return tx as unknown as Transaction;
}

function fakeClient(raw: FakeRaw): Client {
  const client = {
    async execute() {
      raw.calls.push('execute');
      takeFailure(raw);
      return { rows: [] };
    },
    async batch() {
      raw.calls.push('batch');
      takeFailure(raw);
      return [];
    },
    async migrate() {
      raw.calls.push('migrate');
      takeFailure(raw);
      return [];
    },
    async transaction() {
      raw.calls.push('transaction');
      takeFailure(raw);
      return fakeTransaction(raw);
    },
    async executeMultiple() {
      raw.calls.push('executeMultiple');
      takeFailure(raw);
    },
    async sync() {
      raw.calls.push('sync');
      takeFailure(raw);
      return { frames_synced: 0 };
    },
    close() {
      raw.calls.push('close');
      raw.closed = true;
    },
    get closed() {
      return raw.closed;
    },
    get protocol() {
      return 'file';
    },
  };
  return client as unknown as Client;
}

/** 世代ごとの raw を記録する driver factory。reconnect で作り直されたかを世代数で見る。 */
function fakeDriver(): { create: () => Client; raws: FakeRaw[]; at: (generation: number) => FakeRaw } {
  const raws: FakeRaw[] = [];
  return {
    create(): Client {
      const raw: FakeRaw = { generation: raws.length, calls: [], failNext: null, closed: false };
      raws.push(raw);
      return fakeClient(raw);
    },
    raws,
    /** n 世代目の raw。未生成ならテストの前提そのものが崩れているので落とす。 */
    at(generation: number): FakeRaw {
      const raw = raws[generation];
      if (raw === undefined) throw new Error(`raw #${generation} は未生成です (生成済み ${raws.length} 世代)`);
      return raw;
    },
  };
}

describe('createRecoverableClient — process-local (ローカル libSQL)', () => {
  it('ロック競合を毒として記録し、呼び出し側には毒エラーを返す', async () => {
    const driver = fakeDriver();
    const recoverable = createRecoverableClient(driver.create, 'process-local');
    driver.at(0).failNext = busyError();

    const error = await recoverable.client.execute('insert into t values (1)').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConnectionPoisonedError);
    // 元の driver 例外は診断のため cause に残す (どの文で壊れたかが追えないと原因調査ができない)。
    expect((error as ConnectionPoisonedError).cause).toBeInstanceOf(Error);
    expect(recoverable.isPoisoned()).toBe(true);
  });

  it('毒の後は read も fail-fast する — 自分にしか見えない未 commit を読ませない', async () => {
    const driver = fakeDriver();
    const recoverable = createRecoverableClient(driver.create, 'process-local');
    driver.at(0).failNext = busyError();
    await recoverable.client.execute('insert into t values (1)').catch(() => undefined);

    const error = await recoverable.client.execute('select * from t').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConnectionPoisonedError);
    // raw へ届いていないこと。届いてしまうと「commit されない行」が見えてしまう。
    expect(driver.at(0).calls).toEqual(['execute']);
  });

  it('毒エラーは再試行対象にならない — 壊れた接続を 25 回叩いて待たない', async () => {
    const driver = fakeDriver();
    const recoverable = createRecoverableClient(driver.create, 'process-local');
    driver.at(0).failNext = busyError();

    const error = await recoverable.client.execute('insert into t values (1)').catch((e: unknown) => e);

    // cause に BUSY が残っていても再試行対象と誤判定しないこと (chain text には busy が現れる)。
    expect(isLockConflict(error)).toBe(false);
  });

  it('drizzle が毒エラーを包み直しても再試行対象にならない', () => {
    const poisoned = new ConnectionPoisonedError('execute', busyError());
    const wrapped = new Error('Failed query: select 1', { cause: poisoned });

    expect(isLockConflict(wrapped)).toBe(false);
  });

  it('reconnect() で接続を作り直し、毒を解いて再び使えるようにする', async () => {
    const driver = fakeDriver();
    const recoverable = createRecoverableClient(driver.create, 'process-local');
    driver.at(0).failNext = busyError();
    await recoverable.client.execute('insert into t values (1)').catch(() => undefined);
    // 毒になっていることを先に固定する。ここを省くと「毒にならない実装」でも後段が通ってしまう。
    expect(recoverable.isPoisoned()).toBe(true);

    recoverable.reconnect();

    expect(recoverable.isPoisoned()).toBe(false);
    await recoverable.client.execute('insert into t values (1)');
    // 新しい世代へ届いていること。古い接続は捨てられ、抱えていた未終了 statement ごと消える。
    expect(driver.raws).toHaveLength(2);
    expect(driver.at(1).calls).toEqual(['execute']);
    expect(driver.at(0).closed).toBe(true);
  });

  it('ロック競合でない失敗では毒にしない — UNIQUE 違反は接続を壊さない', async () => {
    const driver = fakeDriver();
    const recoverable = createRecoverableClient(driver.create, 'process-local');
    driver.at(0).failNext = uniqueError();

    const error = await recoverable.client.execute('insert into users values (1)').catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ConnectionPoisonedError);
    expect(recoverable.isPoisoned()).toBe(false);
    await recoverable.client.execute('select 1');
    expect(driver.at(0).calls).toEqual(['execute', 'execute']);
  });

  it.each(['batch', 'executeMultiple', 'migrate', 'transaction'] as const)(
    '%s のロック競合も毒として扱う',
    async (method) => {
      const driver = fakeDriver();
      const recoverable = createRecoverableClient(driver.create, 'process-local');
      driver.at(0).failNext = busyError();

      const invoke = {
        batch: () => recoverable.client.batch([]),
        executeMultiple: () => recoverable.client.executeMultiple('select 1'),
        migrate: () => recoverable.client.migrate([]),
        // libSQL の TransactionMode は "write" | "read" | "deferred"。drizzle 側の
        // `behavior: 'immediate'` (BEGIN IMMEDIATE) とは別語彙なので取り違えないこと。
        transaction: () => recoverable.client.transaction('write'),
      }[method];
      const error = await invoke().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConnectionPoisonedError);
      expect(recoverable.isPoisoned()).toBe(true);
    },
  );

  it('transaction の commit がロック競合したら毒にする — 復旧不能なのはここも同じ', async () => {
    const driver = fakeDriver();
    const recoverable = createRecoverableClient(driver.create, 'process-local');
    const tx = await recoverable.client.transaction('write');
    driver.at(0).failNext = busyError();

    const error = await tx.commit().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConnectionPoisonedError);
    expect(recoverable.isPoisoned()).toBe(true);
    // 毒の後は同じ tx からの操作も止める。
    await expect(tx.execute('select 1')).rejects.toBeInstanceOf(ConnectionPoisonedError);
  });

  it('毒の後は close() だけは通す — ファイルハンドルを解放できないと後始末ができない', async () => {
    const driver = fakeDriver();
    const recoverable = createRecoverableClient(driver.create, 'process-local');
    driver.at(0).failNext = busyError();
    await recoverable.client.execute('insert into t values (1)').catch(() => undefined);

    recoverable.client.close();

    expect(driver.at(0).closed).toBe(true);
  });
});

describe('createRecoverableClient — request-bound (Turso remote)', () => {
  it('ロック競合でも毒にしない — 1 文 1 HTTP 要求で接続に状態が残らないため再試行が有効', async () => {
    const driver = fakeDriver();
    const recoverable = createRecoverableClient(driver.create, 'request-bound');
    driver.at(0).failNext = busyError();

    const error = await recoverable.client.execute('insert into t values (1)').catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ConnectionPoisonedError);
    // 再試行の判定が従来どおり効くこと。ここを毒にすると remote の正常な再試行が死ぬ。
    expect(isLockConflict(error)).toBe(true);
    expect(recoverable.isPoisoned()).toBe(false);
    await recoverable.client.execute('insert into t values (1)');
    expect(driver.at(0).calls).toEqual(['execute', 'execute']);
  });
});

describe('createTursoClient — adapter 境界への露出', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function tempFileUrl(): string {
    const dir = mkdtempSync(join(tmpdir(), 'dmdb-recovery-'));
    dirs.push(dir);
    return `file:${join(dir, 'test.db')}`;
  }

  it('file: 経路は process-local scope で毒検知を有効にする', () => {
    const adapter = createTursoClient({ url: tempFileUrl() });
    try {
      expect(adapter.writeConcurrencyScope).toBe('process-local');
      expect(adapter.isPoisoned()).toBe(false);
    } finally {
      adapter.close();
    }
  });

  it('spread で複製した adapter も同じ接続状態を共有する — test-db.ts の close 差し替えを壊さない', async () => {
    const adapter = createTursoClient({ url: tempFileUrl() });
    // support/test-db.ts が実際に行っている複製。spread は getter を値へ固定するので、
    // 接続状態を getter で公開する設計はここで壊れる。関数越しに引くことで複製後も追従する。
    const cloned = { ...adapter, close: () => adapter.close() };
    try {
      await adapter.client.run(sql`create table t (a integer)`);
      await cloned.client.run(sql`insert into t values (1)`);
      const read = await adapter.client.get<{ a: number }>(sql`select a from t`);
      expect(read?.a).toBe(1);
      expect(cloned.isPoisoned()).toBe(false);
    } finally {
      cloned.close();
    }
  });

  it('別プロセスの書き込みロックで BUSY を踏んでも silent loss にせず、reconnect 後の書き込みが別接続から見える', async () => {
    const url = tempFileUrl();
    const writer = createTursoClient({ url });
    const reader = createTursoClient({ url });
    let lockHolder: ChildProcessWithoutNullStreams | null = null;
    try {
      await writer.client.run(sql`create table connection_recovery_probe (value integer not null)`);
      lockHolder = await startExternalWriteLock(url);

      const busy = await writer.client
        .run(sql`insert into connection_recovery_probe (value) values (1)`)
        .catch((error: unknown) => error);

      expect(isConnectionPoisoned(busy)).toBe(true);
      expect(writer.isPoisoned()).toBe(true);
      const blockedRead = await writer.client
        .get(sql`select count(*) as count from connection_recovery_probe`)
        .catch((error: unknown) => error);
      expect(isConnectionPoisoned(blockedRead)).toBe(true);

      await stopExternalWriteLock(lockHolder);
      lockHolder = null;

      const beforeRecovery = await reader.client.get<{ count: number }>(
        sql`select count(*) as count from connection_recovery_probe`,
      );
      expect(beforeRecovery?.count).toBe(0);

      writer.reconnect();
      await writer.client.run(sql`insert into connection_recovery_probe (value) values (2)`);

      const afterRecovery = await reader.client.get<{ count: number }>(
        sql`select count(*) as count from connection_recovery_probe`,
      );
      expect(afterRecovery?.count).toBe(1);
    } finally {
      if (lockHolder !== null) await stopExternalWriteLock(lockHolder);
      reader.close();
      writer.close();
    }
  }, 60_000);

  it('reconnect() 後も commit 済みの内容を読める — 復旧が正常経路を壊さない', async () => {
    const adapter = createTursoClient({ url: tempFileUrl() });
    try {
      await adapter.client.run(sql`create table t (a integer)`);
      await adapter.client.run(sql`insert into t values (42)`);

      adapter.reconnect();

      const read = await adapter.client.get<{ a: number }>(sql`select a from t`);
      expect(read?.a).toBe(42);
    } finally {
      adapter.close();
    }
  });
});
