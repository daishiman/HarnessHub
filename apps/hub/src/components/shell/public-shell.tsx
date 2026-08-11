/**
 * 公開画面 (未サインインでも到達する画面) の骨格。
 *
 * トップ・利用規約・端末承認・サインインなどは、まだテナントも Workspace も
 * 確定していないため、サイドバーやワークスペース切替を持つ業務画面のシェル
 * (components/shell/hub-shell.tsx) を出すと「選べないメニュー」だけが並ぶ。
 * そこで公開画面は @harness-hub/ui の AppShell (ブランド + 本文コンテナのみ) を使う。
 *
 * 直接 `<AppShell brand="Harness Hub">` と書かずこの薄いラッパーを挟むのは、
 * ブランド名や本文幅を変えるときの変更点を 1 箇所に閉じるため
 * (公開画面は route group にまとまっておらず、呼び出し側が複数ファイルに散る)。
 *
 * ヘッダーとフッターの常時表示について (HarnessHub-vaov):
 * ヘッダーは `AppShell` が `position: sticky` で上端に貼り付けており、業務画面と同じ扱い。
 * 一方でフッターは公開画面に無く、未サインインの利用者からは利用規約への導線が
 * どこにも出ていなかった (サインイン前にこそ読む文書なのに)。業務画面と同じ
 * `ShellFooter` をここで 1 回だけ足し、公開画面 4 種すべてに同じ位置で出す。
 */
import { AppShell, ShellFooter } from '@harness-hub/ui';
import type { ReactNode } from 'react';

import { footerLinks } from './nav-items.js';

export interface PublicShellProps {
  readonly children: ReactNode;
}

export function PublicShell({ children }: PublicShellProps): ReactNode {
  return (
    <AppShell brand="Harness Hub" footer={<ShellFooter label="フッター情報" links={footerLinks} />}>
      {children}
    </AppShell>
  );
}
