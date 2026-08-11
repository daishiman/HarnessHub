'use client';

/**
 * 一覧の状態表示 (取得失敗 / 0 件 / 中身あり) の出し分け。
 *
 * これを共通化するのは、画面ごとに書いていたときに**取得失敗と 0 件が同時に出る**
 * 事故が起きていたため。エラー枠を上に出したうえで一覧側は「まだありません」と言う、
 * という組み合わせは「登録が 0 件なのか、読み込めなかったのか」を利用者に判別させる。
 *
 * ここでは 3 つを排他にする:
 *  - 取得に失敗した → 失敗の説明と「再試行する」だけを出す (件数の話は一切しない)
 *  - 読み込み中 → 一覧本体をそのまま出す (骨組み行が高さを保つ)
 *  - 0 件 → 空状態と次の一手だけを出す
 */
import type { ReactNode } from 'react';

import { EmptyState, ErrorState } from './Alert.js';
import { Button } from './Button.js';

export interface ListStateProps {
  /** 取得に失敗したときの説明文。`null` / 省略なら成功。 */
  error?: string | null | undefined;
  /** 再取得の手段。渡すと失敗表示に「再試行する」ボタンが出る。 */
  onRetry?: (() => void) | undefined;
  retryLabel?: string | undefined;
  /** 失敗表示の見出し。既定は取得失敗の共通語「読み込みエラー」。 */
  errorTitle?: string | undefined;
  /**
   * 読み込み中。true の間は 0 件表示へ落とさない。
   * (取得前の空配列を「登録が無い」と言い切らないため)
   */
  loading?: boolean | undefined;
  /** 表示できる件数が 0 か。 */
  isEmpty: boolean;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  /** 最初の 1 件を作る導線・絞り込みを外す導線など。 */
  emptyAction?: ReactNode;
  /** 一覧本体 (表・カード群など)。 */
  children: ReactNode;
}

export function ListState({
  error,
  onRetry,
  // 語彙はアプリ全体の再試行 (global-error / error-screen) と揃える
  retryLabel = '再試行する',
  // 既定の見出しはアプリ全体の取得失敗と同じ語にする (詳細画面の Alert も「読み込みエラー」)
  errorTitle = '読み込みエラー',
  loading = false,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}: ListStateProps): ReactNode {
  if (error !== null && error !== undefined && error !== '') {
    return (
      <ErrorState
        title={errorTitle}
        description={error}
        nextAction={
          onRetry === undefined ? undefined : (
            <Button variant="primary" onClick={onRetry}>
              {retryLabel}
            </Button>
          )
        }
      />
    );
  }

  if (!loading && isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return <>{children}</>;
}
