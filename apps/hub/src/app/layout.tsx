// App Router のルートレイアウト。P0 シェルの最小骨格 (lang / ランドマーク / design token 供給) のみを定義する
// design system は @harness-hub/ui が正本。ここで token や部品を再定義しない

import { buildThemeCss, UiProvider } from '@harness-hub/ui';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Harness Hub',
  description: 'Harness Hub の実行基盤 (P0 シェル)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // WCAG 2.2 AA (qa-018): html の lang 指定は axe の html-has-lang 対象
    <html lang="ja">
      <head>
        {/* design token の CSS カスタムプロパティ。値の正本は packages/ui/src/tokens */}
        {/* React は style を raw text 要素として扱い子要素をエスケープしないため dangerouslySetInnerHTML は不要 */}
        <style>{buildThemeCss()}</style>
      </head>
      <body>
        <UiProvider>
          <header>
            {/* ブロックスキップ (WCAG 2.4.1)。ランドマーク外に置かないよう header 内に含める */}
            <a href="#main">本文へスキップ</a>
            <h1>Harness Hub</h1>
          </header>
          <main id="main">{children}</main>
        </UiProvider>
      </body>
    </html>
  );
}
