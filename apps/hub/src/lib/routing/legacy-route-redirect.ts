/**
 * 旧 route から正本 route への互換 redirect (ADR ui-ops §37「旧 route を第二の画面 owner として残さない」)。
 *
 * 何を: 旧 path を開いたとき、URL クエリを保ったまま正本 path へ恒久 redirect する page を作る。
 * なぜ: 画面本体を旧 route にも残すと、認可と表示の owner が 2 つに割れ、片方だけ直す事故が起きる。
 *
 * 認可はここで再評価しない。scope 解決と権限判定は移設先の page が `resolveDashboardScope()` で
 * 行うので、旧 route 側で二重に判定して差が出る余地を作らない。
 *
 * 恒久 (308) にするのは、旧 URL を bookmark やドキュメントに残した利用者・クローラへ
 * 「こちらが正本」と一度で伝えるため。一時 redirect だと旧 URL が生き続ける。
 */
import { permanentRedirect } from 'next/navigation';

/** Next.js の `searchParams` が渡してくる形。同名クエリの繰り返しは配列で届く。 */
export type LegacyRouteQuery = Record<string, string | readonly string[] | undefined>;

interface LegacyRedirectPageProps {
  readonly searchParams: Promise<LegacyRouteQuery>;
}

/**
 * 受け取ったクエリを落とさずに `canonicalPath` へ繋いだ URL を組み立てる。
 *
 * 同名クエリは `append` で残す。`set` に潰すと `?harness=a&harness=b` のような
 * 複数選択の絞り込みが共有 URL 経由で 1 件に減ってしまう。
 */
export function buildLegacyRedirectTarget(canonicalPath: string, query: LegacyRouteQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') params.append(key, value);
    else if (Array.isArray(value)) for (const item of value) params.append(key, item);
  }
  const serialized = params.toString();
  return serialized === '' ? canonicalPath : `${canonicalPath}?${serialized}`;
}

/** 旧 route の `page.tsx` が既定 export にするだけで済む redirect page を返す。 */
export function createLegacyRedirectPage(canonicalPath: string) {
  return async function LegacyRedirectPage({ searchParams }: LegacyRedirectPageProps): Promise<never> {
    permanentRedirect(buildLegacyRedirectTarget(canonicalPath, await searchParams));
  };
}
