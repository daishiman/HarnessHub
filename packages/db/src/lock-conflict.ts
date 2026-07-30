// driver 例外から「ロック競合か」を読み取る共通語彙。
//
// **なぜ src/ に居るか。** 判定は 2 つの層が必要とする — `repository/conflict.ts` は
// 「再試行してよいか」を決めるために、`connection/recoverable-client.ts` は
// 「接続を毒として隔離するか」を決めるために使う。connection が repository を import すると
// 依存が逆流するので、両方が仰ぐ語彙を境界の側 (src/) に置く。
// `repository/conflict.ts` は後方互換のためここを re-export している。

import { ConnectionPoisonedError } from './errors';

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
 * 復旧不能な接続 (`ConnectionPoisonedError`) を含む連鎖か。
 *
 * `instanceof` だけでは足りない。毒エラーは driver 境界で投げられるので drizzle が
 * `DrizzleQueryError` で包み直し、`instanceof ConnectionPoisonedError` が false になる。
 * `errorChainText` と同じ深さまで辿って探す。
 */
export function isConnectionPoisoned(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current instanceof Error && depth < CAUSE_DEPTH; depth += 1) {
    if (current instanceof ConnectionPoisonedError) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * 書き込みロックの競合 (`SQLITE_BUSY` / `database is locked`) で、**まだ再試行に意味がある**か。
 *
 * UNIQUE 違反は含めない。UNIQUE は「同じ値をもう入れられない」という確定的な失敗で、
 * 再試行しても結果は変わらない (25 回叩いて同じ例外を返すだけ遅くなる)。
 * 監査 append だけは UNIQUE(tenant_id, seq) を直列化の検出手段に使っているので、
 * あちらは独自の述語で `unique` も再試行対象に含める。
 *
 * 毒エラーも含めない。毒エラーは `cause` に元の `SQLITE_BUSY` を残すので (原因調査に必要)
 * 文字列判定だけでは再試行対象に見えてしまうが、壊れた接続を叩き直しても状態は戻らない。
 * ここで除外しないと `retryOnConflict` が 25 回空回りし、バックオフぶんだけ復旧が遅れる。
 */
export function isLockConflict(error: unknown): boolean {
  if (isConnectionPoisoned(error)) return false;
  return /busy|locked/i.test(errorChainText(error));
}
