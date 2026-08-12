'use client';

/**
 * カーソル方式のページ送り。
 *
 * 一覧画面が 4 つあり、それぞれが「前へ / 次へ」のボタン 2 つと無効条件を
 * 書き写していた。余白の有無も画面ごとにばらついていたのでここへ 1 つだけ置く。
 *
 * 総件数やページ番号を出さないのは、カーソル方式では総数が分からないため。
 * 「3 / 12 ページ」のような嘘の目安を出すより、進める・戻れるだけを正直に示す。
 */
import type { ReactNode } from 'react';

import { spaceVar } from '../internal/style.js';
import { Button } from './Button.js';

export interface CursorPagerProps {
  /** ページ送りの対象。読み上げ名に使う (例: 「ドキュメント一覧」)。 */
  label: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  /** 読み込み中は両方向とも止める。 */
  disabled?: boolean;
}

export function CursorPager({
  label,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  disabled = false,
}: CursorPagerProps): ReactNode {
  // どちらにも進めないなら操作は要らない。無効なボタンだけが残ると
  // 「押せないボタンがある画面」に見えて、原因を探させてしまう
  if (!canGoBack && !canGoForward) return null;

  return (
    <nav
      aria-label={`${label}のページ送り`}
      style={{
        display: 'flex',
        gap: spaceVar(2),
        justifyContent: 'flex-end',
        padding: spaceVar(3),
      }}
    >
      <Button type="button" variant="secondary" disabled={disabled || !canGoBack} onClick={onBack}>
        前へ
      </Button>
      <Button type="button" variant="secondary" disabled={disabled || !canGoForward} onClick={onForward}>
        次へ
      </Button>
    </nav>
  );
}
