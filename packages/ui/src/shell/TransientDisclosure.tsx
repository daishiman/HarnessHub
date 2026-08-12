'use client';

/**
 * メニューなど、一時的に開く `<details>` の共通開閉規則。
 *
 * disclosure は dialog ではないためフォーカスを閉じ込めない。一方で、開いたまま
 * 別の操作へ移る煩わしさを残さないよう、外側クリック・Escape・別 disclosure の
 * open を 1 箇所で扱う。
 */
import { type ComponentPropsWithoutRef, type ReactNode, useEffect, useRef } from 'react';

export interface TransientDisclosureProps
  extends Omit<ComponentPropsWithoutRef<'details'>, 'children' | 'onToggle' | 'open'> {
  children: ReactNode;
}

/**
 * 非モーダルの一時 UI 用 disclosure。
 *
 * - Escape: 閉じて summary へフォーカスを戻す
 * - 外側クリック: 閉じるが、クリック先からフォーカスを奪わない
 * - 別 disclosure の open: 前のものを閉じ、新しい開閉元のフォーカスを維持する
 */
export function TransientDisclosure({ children, ...props }: TransientDisclosureProps): ReactNode {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (details === null) return;
    const ownerDocument = details.ownerDocument;

    const closeFromOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (!details.open || details.contains(target)) return;
      details.open = false;
      // details を閉じると一部環境は body へフォーカスを逃がすため、新しい summary を押した
      // 場合だけクリック先を維持する。その他の外側クリックでは標準の移動に触れない。
      (target as Element).closest?.<HTMLElement>('summary')?.focus();
    };

    const closeFromEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || !details.open) return;
      const target = event.target as Element;
      // 前面の modal が Escape を所有する。背面 disclosure まで同時に閉じない。
      if (target.closest?.('[aria-modal="true"]')) return;
      details.open = false;
      details.querySelector<HTMLElement>(':scope > summary')?.focus();
    };

    ownerDocument.addEventListener('click', closeFromOutside);
    ownerDocument.addEventListener('keydown', closeFromEscape);
    return () => {
      ownerDocument.removeEventListener('click', closeFromOutside);
      ownerDocument.removeEventListener('keydown', closeFromEscape);
    };
  }, []);

  return (
    <details {...props} ref={detailsRef} data-hh-transient-disclosure="">
      {children}
    </details>
  );
}
