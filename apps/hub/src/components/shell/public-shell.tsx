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
 */
import { AppShell } from '@harness-hub/ui';
import type { ReactNode } from 'react';

export interface PublicShellProps {
  readonly children: ReactNode;
}

export function PublicShell({ children }: PublicShellProps): ReactNode {
  return <AppShell brand="Harness Hub">{children}</AppShell>;
}
