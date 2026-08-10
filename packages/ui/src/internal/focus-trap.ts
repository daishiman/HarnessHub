/**
 * モーダル層のフォーカス制御。公開 API ではない (index.ts から export しない)。
 *
 * ConfirmDialog と Modal が別々に同じ罠 (Tab の巻き戻し漏れ・復帰先の取りこぼし) を
 * 踏まないよう、閉じ込めと復帰の規則をここ 1 箇所に持たせている。
 */
import { type KeyboardEvent as ReactKeyboardEvent, type RefObject, useCallback, useEffect } from 'react';

/** フォーカス可能とみなす要素。無効化された部品と `tabindex="-1"` は対象外。 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusablesIn(container: HTMLElement | null): HTMLElement[] {
  return [...(container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])];
}

/**
 * open の間だけ、コンテナ内へフォーカスを閉じ込める。
 *
 * - 開いた時点のフォーカス位置を覚えて、閉じたら必ずそこへ戻す
 * - Escape で `onClose`
 * - Tab / Shift+Tab が端に来たら反対の端へ巻き戻す
 *
 * 返り値の `onKeyDown` はダイアログ要素に付ける。`keydown` を document 側で
 * 拾わないのは、同時に複数のモーダルが開いたときに手前のものだけが反応してほしいため。
 */
export function useFocusTrap(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): { onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void } {
  useEffect(() => {
    if (!open) return;

    const returnFocus = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    (focusablesIn(container)[0] ?? container)?.focus();

    return () => {
      returnFocus?.focus?.();
    };
  }, [open, containerRef]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = focusablesIn(containerRef.current);

      // 件数ではなく値そのものを確かめる。空配列の除外と型の絞り込みが 1 度で済む
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (first === undefined || last === undefined) return;

      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [containerRef, onClose],
  );

  return { onKeyDown };
}

/**
 * モーダルが開いている間、背後のページのスクロールを止める。
 * 復元は「元の値へ戻す」であり `''` の決め打ちにしない (呼び出し側が
 * 独自の overflow を持っていても壊さないため)。
 */
export function useScrollLock(open: boolean): void {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previous;
    };
  }, [open]);
}
