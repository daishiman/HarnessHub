/**
 * middleware が現在の pathname を Server Component へ渡すための内部 header。
 *
 * Next.js の layout は「自分がどの URL で描かれているか」を受け取れない。
 * `usePathname()` を使うと nav 一式が client component になり First Load JS が増えるため、
 * middleware で 1 個 header を足し、layout 側が `headers()` で読む形にしている。
 *
 * `x-` 始まりの独自 header なので、外から同名を送られても middleware が必ず上書きする
 * (Headers.set は既存値を捨てる) 点が安全側の担保。
 */
export const PATHNAME_HEADER = 'x-hh-pathname';
