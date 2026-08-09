/**
 * 共通シェルのレスポンシブ規則。
 *
 * インライン style ではメディアクエリを書けないため、
 * 「幅で切り替わる部分だけ」をこの 1 枚の CSS に集約する。
 * 色・余白は design token の CSS カスタムプロパティを参照し、ここでは値を持たない。
 *
 * JS の resize 監視を使わないのは、サーバ描画と初回描画がずれる (hydration mismatch)
 * のを避けるためと、シェルは全画面に載るので追加の client JS を持たせたくないため。
 *
 * 閾値の正本は `breakpointTokens` (480 / 768 / 1120)。ここで px を直書きせず必ず
 * `mediaUp()` を通す (frontend-ui-foundation-spec §2)。既定をスマホ表示にして
 * `mediaUp()` で広げる mobile-first にしてあるのは、`mediaUp()` が min-width しか
 * 作らないためで、max-width の規則を残すと閾値の直書きがここへ戻ってしまうから。
 */

import { mediaUp } from '../tokens/tokens.js';

/** サイドバー常設幅 (mockup 実測値, frontend-spec §3.0)。 */
export const shellSidebarWidth = '220px';
/** md〜lg の折りたたみ幅 (アイコンのみ)。44px のタップ域 + 左右余白。 */
export const shellSidebarCollapsedWidth = '64px';

/**
 * シェル CSS を組み立てる。
 * `buildThemeCss()` と同じく文字列を返し、consumer 側が `<style>` に流し込む。
 */
export function buildShellCss(): string {
  return `
/* --- 既定 (< md): スマホ。サイドバーは描画せずボトムタブへ寄せる (frontend-spec §6) --- */
.hh-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100vh;
  background: var(--hh-color-bg);
  color: var(--hh-color-text);
}

.hh-shell__sidebar {
  display: none;
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  overflow-y: auto;
  border-inline-end: 1px solid var(--hh-color-border);
  background: var(--hh-color-surface);
}

.hh-shell__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hh-shell__main {
  flex: 1;
  min-width: 0;
  padding: var(--hh-space-4);
  /* ボトムタブに隠れる分を確保する */
  padding-bottom: calc(var(--hh-control-height) + var(--hh-space-6));
}

.hh-shell__nav-label,
.hh-shell__desktop-only {
  display: none;
}

.hh-shell__mobile-only {
  display: revert;
}

.hh-shell__tabbar {
  position: fixed;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border-block-start: 1px solid var(--hh-color-border);
  background: var(--hh-color-surface);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* 「その他」は details/summary の標準開閉に寄せている (JS を全画面へ配らないため)。
   既定の三角マーカーは 5 つ目の tab として見せる邪魔になるので消す */
/* details 自身を位置基準にするとパネルが 5 番目の slot 幅へ縮む。
   static のままにして、position: fixed の tabbar 全体を位置基準にする */
.hh-shell__more {
  position: static;
}

.hh-shell__more-summary {
  list-style: none;
  cursor: pointer;
}

.hh-shell__more-summary::-webkit-details-marker {
  display: none;
}

/* 開いたシートはタブバー全幅で、その上へ迫り上がる */
.hh-shell__more-panel {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 100%;
  z-index: 31;
  max-height: 60vh;
  overflow-y: auto;
  padding: var(--hh-space-3) var(--hh-space-2);
  border-block-start: 1px solid var(--hh-color-border);
  border-start-start-radius: var(--hh-radius-lg);
  border-start-end-radius: var(--hh-radius-lg);
  background: var(--hh-color-surface);
  box-shadow: 0 -8px 24px rgb(0 0 0 / 0.18);
}

/* 折りたたみ時はアイコンを中央に置き、ラベルは支援技術にだけ残す */
.hh-shell__nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--hh-space-2);
  min-height: var(--hh-control-height);
  padding: 0 var(--hh-space-2);
  border-radius: var(--hh-radius-sm);
  color: var(--hh-color-text-muted);
  text-decoration: none;
}

.hh-shell__nav-link:hover {
  background: var(--hh-color-surface-muted);
  color: var(--hh-color-text);
}

/* 現在地は色だけに頼らず、左の縦棒と太字でも示す (色覚特性への配慮) */
.hh-shell__nav-link[aria-current='page'] {
  background: var(--hh-color-primary-soft);
  color: var(--hh-color-primary);
  font-weight: var(--hh-font-weight-bold);
  box-shadow: inset 3px 0 0 0 var(--hh-color-primary);
}

/* --- md 以上: サイドバー常設。ボトムタブは畳む --- */
${mediaUp('md')} {
  .hh-shell {
    grid-template-columns: ${shellSidebarCollapsedWidth} minmax(0, 1fr);
  }

  .hh-shell__sidebar {
    display: revert;
  }

  .hh-shell__main {
    padding: var(--hh-space-5);
    padding-bottom: var(--hh-space-5);
  }

  .hh-shell__desktop-only {
    display: revert;
  }

  .hh-shell__mobile-only,
  .hh-shell__tabbar {
    display: none;
  }
}

/* --- lg 以上: サイドバーを展開してラベルを出す --- */
${mediaUp('lg')} {
  .hh-shell {
    grid-template-columns: ${shellSidebarWidth} minmax(0, 1fr);
  }

  .hh-shell__nav-label {
    display: inline;
  }

  .hh-shell__nav-link {
    justify-content: flex-start;
    padding: 0 var(--hh-space-3);
  }
}
`.trim();
}
