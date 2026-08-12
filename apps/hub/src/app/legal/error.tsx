'use client';

/**
 * エラー境界。Next の仕様で client component 必須。
 *
 * `(dashboard)/error.tsx` と同じ理由で本体を `React.lazy` で遅延させている。
 * 静的 import だと G13 client JS 予算 (route ごと First Load JS 120KiB) へ常時載る。
 */
import { lazy, Suspense } from 'react';

const ErrorScreen = lazy(() => import('../../components/error-screen.js').then((m) => ({ default: m.ErrorScreen })));

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Suspense fallback={null}>
      <ErrorScreen error={error} reset={reset} />
    </Suspense>
  );
}
