/**
 * API のエラー応答 (RFC 9457 problem+json) から利用者向けの一行メッセージを組み立てる。
 * `hearing-intake/client-error.ts` / `docs-cms/client-errors.ts` と同じ理由で feature ごとに
 * 複製する (client JS 予算。他 feature への import は home-dashboard を他 feature の client
 * bundle へ結びつけてしまう)。
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

export async function extractApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    return problemDetailsToMessage(await response.json(), fallback);
  } catch {
    return fallback;
  }
}
