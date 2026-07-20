// App Router のルートレイアウト。P0 シェルの最小骨格 (lang / ランドマーク / design token 供給) のみを定義する
// design system は @harness-hub/ui が正本。ここで token や部品を再定義しない
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { UiProvider, buildThemeCss } from '@harness-hub/ui';

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
        <style dangerouslySetInnerHTML={{ __html: buildThemeCss() }} />
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
