/**
 * API のエラー応答 (RFC 9457 problem+json, `packages/schemas/src/envelope.ts` の problemDetailsSchema) から
 * 利用者向けの一行メッセージを組み立てる。
 *
 * 従来は `!response.ok` を検知した時点で固定文言 (「作成できませんでした。」等) に潰しており、
 * zod のフィールド単位エラーや 403 の権限不足など、実際の失敗理由が画面から分からなかった。
 * ここで problem details の title/detail/errors[].message を拾い、無ければ fallback へ落とす。
 */

/** problem+json の最小限の形。zod スキーマそのものは import せず、構造だけを緩く見る (壊れた応答でも例外にしない)。 */
interface ProblemDetailsLike {
  readonly title?: unknown;
  readonly detail?: unknown;
  readonly errors?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** problem details 相当の値からメッセージを組み立てる。JSON パース後の値を渡す (fetch 非依存で単体テストしやすくするため分離)。 */
export function problemDetailsToMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback;
  const problem = body as ProblemDetailsLike;
  const parts: string[] = [];

  if (isNonEmptyString(problem.title)) parts.push(problem.title);
  if (isNonEmptyString(problem.detail)) parts.push(problem.detail);

  if (Array.isArray(problem.errors)) {
    const fieldMessages = problem.errors
      .map((entry) => {
        if (typeof entry !== 'object' || entry === null) return null;
        const message = (entry as { message?: unknown }).message;
        return isNonEmptyString(message) ? message : null;
      })
      .filter((message): message is string => message !== null);
    if (fieldMessages.length > 0) parts.push(fieldMessages.join(' / '));
  }

  return parts.length > 0 ? parts.join(': ') : fallback;
}

/** Response から problem details を読み取り、失敗理由を一行メッセージにする。本文が JSON でなければ fallback を返す。 */
export async function extractApiErrorMessage(response: Response, fallback: string): Promise<string> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fallback;
  }
  return problemDetailsToMessage(body, fallback);
}
