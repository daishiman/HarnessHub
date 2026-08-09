// App Router のルートレイアウト。シェルの骨格 (lang / ランドマーク / design token 供給) のみを定義する
// design system は @harness-hub/ui が正本。ここで token や部品を再定義しない

import { buildBaseCss, buildThemeCss, UiProvider } from '@harness-hub/ui';
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
      <head>
        {/* design token の CSS カスタムプロパティ。値の正本は packages/ui/src/tokens */}
        {/* 安全な根拠は buildThemeCss() / buildBaseCss() がどちらも引数を取らず token 定数だけから組み立てる閉じた関数で、外部入力の混入経路が無いこと。
            React は style を raw text 要素として扱い子要素をエスケープしないため、この書き方も dangerouslySetInnerHTML と同じだけ危険。
            テーマ色などを動的に流し込む要件が出たら文字列連結にせず、style 属性で CSS 変数を渡すか packages/ui へ生成 API を用意する */}
        <style>{buildThemeCss()}</style>
        {/* 素の HTML 要素へ token を適用する base 層。これが無いと token を定義しても既定スタイルのまま描画される */}
        <style>{buildBaseCss()}</style>
      </head>
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
