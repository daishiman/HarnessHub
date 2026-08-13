'use client';

/**
 * エラー境界の表示。`error.tsx` は Next の仕様で client component 必須のため、
 * 他の画面状態 (screen-states.tsx) とはファイルを分けている。
 *
 * ここが担うのは 2 つ。
 * 1. 権限不足 (403) を汎用エラーと分けること。両者を同じ文面にすると、利用者は
 *    「再試行すれば直る」と読んで同じ所で止まり続ける。
 * 2. 例外の中身を画面へ出さないこと。Next は本番で message を伏せるが、開発時の
 *    文面をそのまま出す実装にすると内部構造が漏れる経路が残る。
 */
import { Button, Container, ErrorState } from '@harness-hub/ui';
import type { ReactNode } from 'react';

import { ForbiddenScreen } from './screen-states.js';

/**
 * server 側から「権限不足」を投げるときの目印。
 * Next は client へ渡る error から message を落とすが digest は残すため、
 * 種別の受け渡しはこの digest で行う。
 */
export const FORBIDDEN_ERROR_DIGEST = 'HH_FORBIDDEN';

/** 権限不足として投げる例外を組み立てる (digest の付け方を 1 箇所に閉じる)。 */
export function forbiddenError(message = 'forbidden'): Error & { digest: string } {
  return Object.assign(new Error(message), { digest: FORBIDDEN_ERROR_DIGEST });
}

/**
 * 受け取った error が権限不足かどうか。
 * `unknown` で受けるのは、catch 節や error boundary から来る値が Error とは限らないため。
 */
export function isForbiddenError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { digest?: unknown }).digest === FORBIDDEN_ERROR_DIGEST
  );
}

export interface ErrorScreenProps {
  error: Error & { digest?: string };
  /** Next が渡す再試行。境界内を再レンダリングする。 */
  reset: () => void;
}

export function ErrorScreen({ error, reset }: ErrorScreenProps): ReactNode {
  if (isForbiddenError(error)) {
    return <ForbiddenScreen />;
  }

  return (
    <Container size="narrow">
      <ErrorState
        title="表示できませんでした"
        description="通信または処理でエラーが発生しました。時間をおいて、もう一度お試しください。"
        nextAction={
          <Button variant="primary" onClick={reset}>
            再試行する
          </Button>
        }
      />
    </Container>
  );
}
