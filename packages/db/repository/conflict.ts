// 書き込み競合の扱い — repository 共通 (HarnessHub-b7ng)。
// 「プロセス内では直列化して競合させない」+「プロセス外の競合だけ再試行する」の 2 段構え。
//
// **なぜ必要か。** 監査 append は hash chain (prev_hash) を繋ぐため read-modify-write を
// `BEGIN IMMEDIATE` で直列化する (audit.ts / ADR §7)。libSQL はこのトランザクションを
// **別接続**で開くため (@libsql/client の Sqlite3Client.transaction は保持していた接続を
// トランザクションへ渡し、以降の素の文には新しい接続を開く)、監査を書いている最中に
// 別の要求が素の INSERT/UPDATE を出すと書き込みロックが本当に競合し `SQLITE_BUSY` が返る。
// 監査はほぼ全ての状態変更に付随するので、この競合は「監査を書く経路」と「状態を変える経路」が
// 並走するたびに起きうる。device flow の並行要求 (同一 device_code / 同一 refresh token) が
// 認可の判定ではなくドライバのロックで落ちるのがこれ。
//
// **なぜ再試行だけでは駄目か (実測)。** libSQL のローカル backend は BUSY で失敗した文を
// 後片付けしない。`Sqlite3Client.batch()` / `executeMultiple()` には
// `finally { if (db.inTransaction) ROLLBACK }` があるが、**単発の `execute()` には無い**
// (@libsql/client/lib-esm/sqlite3.js)。結果その接続は未終了 statement を抱えたまま
// 「SQL statements in progress」状態で固まり、
//   - 以降その接続の書き込みは**自分からは見えるが他接続からは見えない** (commit されない)
//   - 接続が差し替わると丸ごと消える (成功を返したのに行が無い)
//   - あとから同じ接続で COMMIT すると `SQLITE_BUSY: cannot commit transaction` になる
//   - `ROLLBACK` では戻らない (`SQLITE_ERROR` = 有効なトランザクションが無い)
// つまり **BUSY を踏んだ時点で手遅れ**。復旧手段は接続を捨てること (`Sqlite3Client.reconnect()`)
// だけで、これは driver 内部 API なので drizzle 越しには届かない。だから踏ませない方を選ぶ。
//
// 再試行を残すのは本番 (Turso remote) 用。remote backend は 1 文が 1 HTTP 要求で接続に状態が
// 残らないため、サーバ側が返す BUSY は再試行して安全。ローカル backend の BUSY はプロセス外
// (別プロセスが同じファイルを触る) でしか起きなくなる。
//
// SQLite の 1 文はそれ自体が原子的で、`SQLITE_BUSY` は**何も適用されなかった**ことを意味する。
// だから CAS (`UPDATE ... WHERE <期待値> RETURNING`) を再試行しても二重適用にはならず、
// 再試行時に WHERE 句が改めて評価される = 先に遷移させた要求がいれば 0 行のまま返る。
// 「勝者が 1 本」という保証は再試行しても壊れない。

/** 再試行の上限。audit.ts の上限と同じ値に揃えてある (経路ごとに待ち時間の上限を変えない)。 */
export const CONFLICT_MAX_RETRY = 25;

/** cause の連鎖をどこまで辿るか。ORM 1 段 + driver 2 段を見れば足りる。 */
const CAUSE_DEPTH = 5;

/**
 * error を判定用の文字列へ畳む。**`cause` の連鎖まで辿るのが要点**。
 *
 * drizzle は driver の例外を `DrizzleQueryError` で包み、message を
 * `Failed query: insert into "publisher_tokens" …` に差し替えて元の例外を `cause` に入れる。
 * `error.message` と `error.code` だけを見ると `SQLITE_BUSY` が見えず、
 * 「再試行の実装はあるのに一度も発火しない」状態になる (実際にそうなっていた)。
 */
export function errorChainText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current instanceof Error && depth < CAUSE_DEPTH; depth += 1) {
    parts.push(current.message, (current as { code?: string }).code ?? '');
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(' ');
}

/**
 * 書き込みロックの競合 (`SQLITE_BUSY` / `database is locked`) か。
 *
 * UNIQUE 違反は**含めない**。UNIQUE は「同じ値をもう入れられない」という確定的な失敗で、
 * 再試行しても結果は変わらない (25 回叩いて同じ例外を返すだけ遅くなる)。
 * 監査 append だけは UNIQUE(tenant_id, seq) を直列化の検出手段に使っているので、
 * あちらは独自の述語で `unique` も再試行対象に含める。
 */
export function isLockConflict(error: unknown): boolean {
  return /busy|locked/i.test(errorChainText(error));
}

/** ジッタ付き線形バックオフ。同時到着した writer 同士が同じ間隔で再衝突し続けるのを避ける。 */
function backoff(attempt: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 20);
  return new Promise((resolve) => setTimeout(resolve, attempt * 10 + jitter));
}

/**
 * `run` が競合で失敗する間だけ再試行する。既定の述語はロック競合のみ。
 *
 * 冪等（べきとう＝何回実行しても結果が同じになる性質）でない操作にも使えるのは、
 * 再試行するのが「適用されなかったと判っている失敗」に限られるため。
 */
export async function retryOnConflict<TResult>(
  run: () => Promise<TResult>,
  isRetryable: (error: unknown) => boolean = isLockConflict,
): Promise<TResult> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (!isRetryable(error) || attempt >= CONFLICT_MAX_RETRY) throw error;
      await backoff(attempt);
    }
  }
}

/**
 * adapter ごとの書き込み待ち行列。**adapter の同一性で引く**ので、同じ adapter から作られた
 * repository 群は 1 本の行列を共有し、別 adapter (別 DB / 別テスト) は互いに干渉しない。
 * WeakMap なので adapter が捨てられれば行列も一緒に消える。
 */
const writeQueues = new WeakMap<object, Promise<unknown>>();

/** 待ち行列を「常に解決する Promise」に正規化する。前の書き込みの失敗を後続へ伝播させないため。 */
function settled(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    () => undefined,
  );
}

/**
 * 書き込みを **プロセス内で直列化** しつつ、外部要因の競合だけ再試行する。
 *
 * SQLite の writer は元々 1 本しか居ない (WAL でも writer は排他)。だから直列化で失う並行性は
 * 最初から存在せず、代わりに「同一プロセス内で自分の監査トランザクションと衝突して
 * 接続を壊す」経路が消える。ロックを待って BUSY を食うか、行列に並んで待つかの違いでしかない。
 *
 * **再入禁止。** ゲートの中から更にゲートを取る書き込みを呼ぶと自分の完了を待つことになり
 * 自己デッドロックする。repository の書き込み関数は互いを呼ばないこと
 * (監査 append はトランザクション内で自分の SQL しか実行しない)。
 *
 * 現状ゲートを通しているのは監査 append、device flow、users.insert、
 * user-workspaces.add/remove。残る repository 書き込みの掃き出しは HarnessHub-mb7c で行う。
 */
export function guardedWrite<TResult>(
  owner: object,
  run: () => Promise<TResult>,
  isRetryable: (error: unknown) => boolean = isLockConflict,
): Promise<TResult> {
  const previous = writeQueues.get(owner) ?? Promise.resolve();
  const result = previous.then(() => retryOnConflict(run, isRetryable));
  writeQueues.set(owner, settled(result));
  return result;
}
