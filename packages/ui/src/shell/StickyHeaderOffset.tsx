'use client';

/**
 * sticky stack の ShellHeader / ScreenHeader 実高さを CSS 変数へ書き出す。
 *
 * なぜ要るか: 絞り込み帯を「見出しの真下」に貼り付けたいが、貼り付ける位置
 * (`top`) は見出し帯の高さそのもので、その高さはパンくず・説明文・状態チップの
 * 有無と折り返しで画面ごとに変わる。CSS だけでは兄弟要素の高さを参照できないため、
 * ShellHeader と ScreenHeader を測って共通の CSS 変数へ渡す。
 *
 * route 遷移や loading → loaded では見出し DOM 自体が後から現れたり交換されたりする。
 * ResizeObserver だけでは交換後の node を発見できないため、MutationObserver で対象を
 * 再発見し、現在の 2 node だけを ResizeObserver へ登録する。
 */
import { useEffect } from 'react';

import {
  screenHeaderHeightVariable,
  shellHeaderHeightVariable,
  shellHeaderSelector,
  stickyScreenHeaderSelector,
} from './sticky-stack.js';

function measuredHeight(element: Element | null): string {
  return element === null ? '0px' : `${Math.round(element.getBoundingClientRect().height)}px`;
}

export function StickyHeaderOffset(): null {
  useEffect(() => {
    const root = document.documentElement;
    let shellHeader: Element | null = null;
    let screenHeader: Element | null = null;

    const syncHeights = (): void => {
      root.style.setProperty(shellHeaderHeightVariable, measuredHeight(shellHeader));
      root.style.setProperty(screenHeaderHeightVariable, measuredHeight(screenHeader));
    };

    // ResizeObserver が無い環境でも描画自体は壊さない。SSR のテスト環境や古い
    // WebView では既定高へ安全に縮退し、対応ブラウザだけが実高さへ追従する。
    if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') {
      return () => {
        root.style.removeProperty(shellHeaderHeightVariable);
        root.style.removeProperty(screenHeaderHeightVariable);
      };
    }

    // 折り返しや viewport 変更で高さが変わっても stack 全体を追従させる。
    const resizeObserver = new ResizeObserver(syncHeights);

    const rediscoverHeaders = (): void => {
      const nextShellHeader = document.querySelector(shellHeaderSelector);
      const nextScreenHeader = document.querySelector(stickyScreenHeaderSelector);

      if (shellHeader !== nextShellHeader) {
        if (shellHeader !== null) resizeObserver.unobserve(shellHeader);
        shellHeader = nextShellHeader;
        if (shellHeader !== null) resizeObserver.observe(shellHeader);
      }

      if (screenHeader !== nextScreenHeader) {
        if (screenHeader !== null) resizeObserver.unobserve(screenHeader);
        screenHeader = nextScreenHeader;
        if (screenHeader !== null) resizeObserver.observe(screenHeader);
      }

      // ResizeObserver の通知を待つ間にも正しい位置を使えるよう、発見時に同期する。
      syncHeights();
    };

    rediscoverHeaders();

    const mutationObserver = new MutationObserver(rediscoverHeaders);
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-hh-shell-header', 'data-hh-screen-header'],
    });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      root.style.removeProperty(shellHeaderHeightVariable);
      root.style.removeProperty(screenHeaderHeightVariable);
    };
  }, []);

  return null;
}
