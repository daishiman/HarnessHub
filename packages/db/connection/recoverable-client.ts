// ロック競合で壊れた libSQL 接続を隔離・復旧する薄いラッパ (HarnessHub-njkm)。
//
// **何を防いでいるか。** ローカル libSQL の backend は `SQLITE_BUSY` で失敗した単発 `execute()`
// を後片付けしない。その接続は未終了 statement を抱えたまま固まり、以降の書き込みは
// **自分からは見えるが commit されない**。放置すると repository は成功を返し、行は消える —
// 例外も警告も出ない静かなデータ喪失になる。実測の詳細は `repository/conflict.ts` のヘッダ。
//
// **なぜ driver ではなくここで包むか。** 復旧手段は接続を捨てることだけで、`Client.reconnect()`
// は公開 API だが drizzle は `Client` を内部に隠すので drizzle インスタンスからは呼べない。
// かつ毒の検知は **read も止める**必要がある (毒接続の read は commit されない自分の書き込みを
// 見せる)。drizzle の上で包むと read 経路が漏れるので、`Client` インターフェースそのものを包む。
//
// **なぜ drizzle インスタンスを差し替えないか。** `__tests__/support/test-db.ts` は
// `{ ...adapter, close() {...} }` で adapter を複製する。spread は getter を**評価して値に固定**
// するため、「`client` を getter にして reconnect で差し替える」設計は複製後に古い接続を掴む。
// raw を内側で差し替えれば公開する参照は不変のままで、複製しても状態が追従する。
//
// **なぜ毒を検知した瞬間に自動復旧しないか。** 2 つ理由がある。(1) 同じ接続を使っている
// 並行操作を巻き込む — トランザクション途中の別の Promise の足元で接続が入れ替わる。
// (2) 「壊れた」という事実が観測できなくなる (`isPoisoned()` が常に false になり、
// 静かなデータ喪失を静かな再接続に置き換えるだけになる)。
// かつ `process-local` になるのは CLI (`scripts/*.ts`) とテストだけで、どちらも 1 プロセス
// 1 タスクなので毒を踏んだら異常終了させるのが正しい。常駐する本番経路 (Workers) は
// `request-bound` で毒の対象外である。だから自動復旧の司令塔は要らない。

import type { Client, InArgs, InStatement, ResultSet, Transaction, TransactionMode } from '@libsql/client';
import type { WriteConcurrencyScope } from '../src/adapter';
import { ConnectionPoisonedError } from '../src/errors';
import { isLockConflict } from '../src/lock-conflict';

export interface RecoverableClient {
  /**
   * driver へ渡す `Client`。内側の raw が差し替わってもこの参照は不変なので、
   * drizzle インスタンスを作り直す必要がない。
   */
  readonly client: Client;
  /** 毒になった接続を捨てて作り直す。毒でなくても呼べる (冪等な復旧手段として扱える)。 */
  reconnect(): void;
  /** 未 commit の文を抱えたまま固まっているか。診断と運用判断のために公開する。 */
  isPoisoned(): boolean;
}

/**
 * `create` で開いた libSQL 接続を、ロック競合からの復旧が可能な形で包む。
 *
 * `scope` が `request-bound` (Turso remote) のときは隔離しない。remote backend は 1 文が
 * 1 HTTP 要求で接続に状態が残らないため、サーバ側が返す BUSY は再試行が有効な失敗であり、
 * ここで毒にすると正常な再試行経路を殺してしまう。
 */
export function createRecoverableClient(create: () => Client, scope: WriteConcurrencyScope): RecoverableClient {
  let raw = create();
  /** 毒の原因となった driver 例外。null でない間は接続を使わせない。 */
  let poison: { readonly cause: unknown } | null = null;
  const isolates = scope === 'process-local';

  /**
   * 接続を捨てて開き直す。
   *
   * `Client.reconnect()` (driver 自身の復旧) は使わない。型宣言が `void` なのに実装は `async`
   * で、Node (`sqlite3.js`) と remote (`http.js` / `ws.js`) で後始末の範囲も違う。
   * ファクトリから作り直せば entry 差で挙動が分岐せず、driver 内部に残った状態
   * (statement cache など) も接続オブジェクトごと捨てられる。
   */
  function recover(): void {
    const previous = raw;
    // 先に新しい接続を確保する。`create` が失敗したら毒と古い接続を保ったまま例外を上げ、
    // 「復旧したつもりで接続が無い」状態を作らない。
    raw = create();
    poison = null;
    try {
      previous.close();
    } catch {
      // 壊れた接続の close は失敗しうる。捨てるのが目的なので握り潰す。
    }
  }

  /**
   * 毒を踏んだ操作を `ConnectionPoisonedError` へ翻訳する。
   * 毒でない失敗 (UNIQUE 違反など) は接続を壊さないのでそのまま通す。
   */
  function capture(operation: string, error: unknown): unknown {
    if (!isolates || poison !== null || !isLockConflict(error)) return error;
    poison = { cause: error };
    return new ConnectionPoisonedError(operation, error);
  }

  /**
   * 毒チェックを前置きしてから driver 操作を実行する。
   *
   * 事前チェックで read も止めるのが要点。毒接続の read を許すと「commit されない行」を
   * 読んでしまい、アプリが存在しないデータを前提に判断する。
   * 毒の後は毎回新しい例外を作る — どの操作で止められたか (`operation`) と
   * なぜ壊れたか (`cause`) の両方を、2 回目以降の呼び出しでも残すため。
   */
  async function guard<TResult>(operation: string, run: () => Promise<TResult>): Promise<TResult> {
    if (poison !== null) throw new ConnectionPoisonedError(operation, poison.cause);
    try {
      return await run();
    } catch (error) {
      throw capture(operation, error);
    }
  }

  /**
   * トランザクションも同じ檻に入れる。`commit` が BUSY で落ちた接続も復旧不能で、
   * かつ drizzle は `catch` 時に `rollback()` を呼ぶ — 毒接続の ROLLBACK は
   * `SQLITE_ERROR` (有効なトランザクションが無い) で失敗し、元の原因を覆い隠す。
   * ここで止めれば毒エラーが呼び出し側へ届く。
   */
  function wrapTransaction(tx: Transaction): Transaction {
    return {
      execute: (stmt: InStatement) => guard('transaction.execute', () => tx.execute(stmt)),
      batch: (stmts: Array<InStatement>) => guard('transaction.batch', () => tx.batch(stmts)),
      executeMultiple: (statements: string) =>
        guard('transaction.executeMultiple', () => tx.executeMultiple(statements)),
      commit: () => guard('transaction.commit', () => tx.commit()),
      rollback: () => guard('transaction.rollback', () => tx.rollback()),
      close: () => tx.close(),
      get closed(): boolean {
        return tx.closed;
      },
    };
  }

  const client: Client = {
    execute(stmt: InStatement | string, args?: InArgs): Promise<ResultSet> {
      return guard('execute', () => (typeof stmt === 'string' ? raw.execute(stmt, args) : raw.execute(stmt)));
    },
    batch(stmts: Array<InStatement | [string, InArgs?]>, mode?: TransactionMode): Promise<Array<ResultSet>> {
      return guard('batch', () => raw.batch(stmts, mode));
    },
    migrate(stmts: Array<InStatement>): Promise<Array<ResultSet>> {
      return guard('migrate', () => raw.migrate(stmts));
    },
    async transaction(mode?: TransactionMode): Promise<Transaction> {
      return wrapTransaction(await guard('transaction', () => raw.transaction(mode)));
    },
    executeMultiple(statements: string): Promise<void> {
      return guard('executeMultiple', () => raw.executeMultiple(statements));
    },
    sync() {
      return guard('sync', () => raw.sync());
    },
    // close は毒でも通す。ここを止めるとファイルハンドルを解放できず、後始末ができない。
    close(): void {
      raw.close();
    },
    // driver が公開している復旧口。`RecoverableClient.reconnect()` と同じ処理へ寄せ、
    // どちらから呼んでも毒が解ける (経路によって復旧の意味が変わらないようにする)。
    reconnect(): void {
      recover();
    },
    get closed(): boolean {
      return raw.closed;
    },
    get protocol(): string {
      return raw.protocol;
    },
  };

  return {
    client,
    reconnect: recover,
    isPoisoned(): boolean {
      return poison !== null;
    },
  };
}
