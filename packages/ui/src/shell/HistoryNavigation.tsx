'use client';

/** browser 履歴の戻る/進むだけを担う、共通ヘッダー用の小さな client island。 */
import type { ReactNode } from 'react';

export function HistoryNavigation(): ReactNode {
  return (
    <nav className="hh-shell__history-navigation" aria-label="ページ履歴">
      <button
        type="button"
        title="戻る"
        aria-label="戻る"
        data-hh-focusable=""
        onClick={() => window.history.back()}
        className="hh-shell__history-button"
      >
        <span data-icon="arrowLeft" aria-hidden="true">
          ←
        </span>
      </button>
      <button
        type="button"
        title="進む"
        aria-label="進む"
        data-hh-focusable=""
        onClick={() => window.history.forward()}
        className="hh-shell__history-button"
      >
        <span data-icon="arrowRight" aria-hidden="true">
          →
        </span>
      </button>
    </nav>
  );
}
