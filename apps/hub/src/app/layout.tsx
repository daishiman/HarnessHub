// App Router のルートレイアウト。シェルの骨格 (lang / ランドマーク / design token 供給) のみを定義する
// design system は @harness-hub/ui が正本。ここで token や部品を再定義しない

// design token / base 層の CSS。**inline ではなく外部 stylesheet として読む** (HarnessHub-2fo1)。
// 以前は <style>{buildThemeCss()}</style> で毎レスポンスに 7.7KB を同梱していたため、
// 文書をまたぐ再訪で stylesheet としてキャッシュできなかった
// (CPU 12x では document の Style & Layout が最大ロングタスク 219〜300ms)。
// import すると Next が content hash 付きの <link rel="stylesheet"> を出すため、再訪時の
// 再転送を避けられる。初回の parse / CSSOM / layout は残るので効果は再計測で判定する。
// 中身の正本は packages/ui/src/tokens/{tokens,base-css}.ts で、
// tokens.css との一致は packages/ui のドリフト検出テストが fail-closed に守る。
import '@harness-hub/ui/tokens.css';
import { UiProvider } from '@harness-hub/ui';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Harness Hub',
  description: 'Harness Hub の実行基盤',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // WCAG 2.2 AA (qa-018): html の lang 指定は axe の html-has-lang 対象
    <html lang="ja">
      {/* stylesheet は import から Next が <head> へ注入するため、ここで <head> を書かない。
          テナント固有の色などを動的に流し込む要件が出たら、文字列連結で <style> を復活させず
          body へ style 属性で CSS 変数を上書きする (静的部分のキャッシュ性を保ったまま差分だけ可変にできる) */}
      <body>
        {/*
          root layout は骨格 (lang / token 供給 / 設定 Context) だけを持ち、ここでは
          ランドマークを作らない。header / main / スキップリンクは領域ごとに 1 つだけ置く:
          - 業務画面 ((dashboard) / (workspace)) … components/shell/hub-shell.tsx
          - 公開画面 (/ , /legal , /device , サインイン等) … components/shell/public-shell.tsx
          root でも包むと業務画面で main が入れ子になり、支援技術の本文ジャンプが壊れる。
        */}
        <UiProvider>{children}</UiProvider>
      </body>
    </html>
  );
}
