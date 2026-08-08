'use client';

/**
 * RootLayout 自体が落ちたときの最後の受け皿。
 *
 * この境界では RootLayout が適用されないため、`<html>` / `<body>` を自前で持つ必要がある。
 * design token も供給されないので、ここだけは @harness-hub/ui の部品に依存しない
 * 素の HTML で書く (依存を増やすと「エラー画面自体が落ちる」経路を作ってしまう)。
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body>
        <main>
          <h1>表示できませんでした</h1>
          <p>時間をおいて、もう一度お試しください。</p>
          <button type="button" onClick={reset}>
            再試行する
          </button>
        </main>
      </body>
    </html>
  );
}
