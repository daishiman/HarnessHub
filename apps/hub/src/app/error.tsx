'use client';

/**
 * エラー境界。Next の仕様で client component 必須。
 *
 * 表示本体を `React.lazy` で遅延させているのは、エラー画面は「起きたときだけ」要るのに、
 * 静的に import すると全 route の First Load JS (予算 120KiB) へ常時載ってしまうため。
 * 実測で /catalog/[projectId] が予算を 1.3KiB 超えた。遅延させると別 chunk へ切り出され、
 * 平常時のダウンロード量は増えない。
 *
 * `next/dynamic` ではなく `React.lazy` を使うのは、前者が loadable の追加ランタイムを
 * client bundle へ持ち込む一方、React は既に共有 chunk に居るため後者は増分ゼロだから
 * (実測でも next/dynamic 版のほうが重かった)。
 * fallback を null にするのは、エラー画面の一瞬前に別の中間表示を挟むと状況が読めなくなるため。
 */
import { lazy, Suspense } from 'react';

const ErrorScreen = lazy(() => import('../components/error-screen.js').then((m) => ({ default: m.ErrorScreen })));

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Suspense fallback={null}>
      <ErrorScreen error={error} reset={reset} />
    </Suspense>
  );
}
