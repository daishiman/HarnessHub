/**
 * API のエラー応答 (RFC 9457 problem+json) から利用者向けの一行メッセージを組み立てる。
 * 固定文言に潰さず title/detail/errors[].message を拾う。`docs-cms/api-error.ts` と同方針(client JS 予算のため軽量実装)。
 */
type ProblemLike = { title?: unknown; detail?: unknown; errors?: unknown };

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

export function problemDetailsToMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback;
  const p = body as ProblemLike;
  const parts = [str(p.title), str(p.detail)].filter((v): v is string => v !== null);
  if (Array.isArray(p.errors)) {
    const msgs = p.errors
      .map((e) => (e && typeof e === 'object' ? str((e as { message?: unknown }).message) : null))
      .filter((v): v is string => v !== null);
    if (msgs.length > 0) parts.push(msgs.join(' / '));
  }
  return parts.length > 0 ? parts.join(': ') : fallback;
}

/** Response から problem details を読み取り、失敗理由を一行メッセージにする。本文が JSON でなければ fallback を返す。 */
export async function extractApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    return problemDetailsToMessage(await response.json(), fallback);
  } catch {
    return fallback;
  }
}
