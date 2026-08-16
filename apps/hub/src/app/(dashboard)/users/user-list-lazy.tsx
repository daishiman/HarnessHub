'use client';

/**
 * S17 一覧本体の遅延読込境界。
 *
 * 一覧は開いた直後に `/api/v1/users` を取りに行くため、本体 JS を初期チャンクへ載せても
 * 描画開始は早まらない (どのみち取得待ちの読込表示から始まる)。他の一覧画面 (docs / tracking)
 * が同じ理由で `*-lazy` を挟んでおり、`/users` だけ直 import のまま client bundle 予算を
 * 押し上げていたので同じ形へ揃える。
 */
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const UserList = dynamic(() => import('./user-list.js').then((module) => module.UserList), {
  ssr: false,
  loading: () => <p aria-live="polite">ユーザー一覧を読み込んでいます…</p>,
});

export function UserListLazy(props: { readonly tenantId: string; readonly initialQuery?: string }): ReactNode {
  return <UserList {...props} />;
}
