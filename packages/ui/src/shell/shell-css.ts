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

import { mediaUp } from '../tokens/token-names.js';
import {
  screenHeaderHeightVariable,
  screenHeaderOffsetVariable,
  shellHeaderHeightVariable,
  shellHeaderMinHeight,
  shellHeaderOffsetVariable,
} from './sticky-stack.js';

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
  /* mobile は viewport がスクロールする。ScreenHeader は ShellHeader の実測高を、
     その次の FilterBar は両 header の実測高を空ける。JS 前は 56px を使う。 */
  ${shellHeaderOffsetVariable}: var(${shellHeaderHeightVariable}, ${shellHeaderMinHeight});
  ${screenHeaderOffsetVariable}: calc(var(${shellHeaderOffsetVariable}) + var(${screenHeaderHeightVariable}, 0px));
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

/* スマホではページ全体を普通にスクロールさせる。
   本文だけを独立スクロールにすると、アドレスバーの伸縮で可視領域が変わる端末で
   下端が切れる (100vh 問題)。常時見える導線は sticky なヘッダーと固定タブバーが担う。 */
.hh-shell__main {
  flex: 1;
  min-width: 0;
  /* 見出し帯を画面端まで広げる (sticky 時の背景) ために、左右の余白を変数として公開する */
  --hh-main-padding-inline: var(--hh-space-4);
  padding: var(--hh-space-4) var(--hh-main-padding-inline);
  padding-bottom: var(--hh-space-5);
}

/* ヘッダーとフッターは本文の量に関わらず縮ませない。
   flex の既定 (shrink: 1) のままだと、本文が長い画面で下端の余白から先に潰れる。 */
.hh-shell__body > header,
.hh-shell__body > footer {
  flex-shrink: 0;
  background: var(--hh-color-surface);
}

/* mobile の footer は通常フローに置く。固定タブの裏へ最終行が潜らないよう、
   footer の後ろにだけ safe-area 込みのスクロール余白を確保する。 */
.hh-shell__body > footer {
  margin-block-end: calc(var(--hh-control-height) + env(safe-area-inset-bottom, 0px));
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

/* サイドバーの分類。区切り線は「グループの上」に置く。
   下に置くと最後のグループの下にも線が残り、何も無い場所を区切ってしまう。 */
.hh-shell__nav-group + .hh-shell__nav-group {
  margin-block-start: var(--hh-space-3);
  padding-block-start: var(--hh-space-3);
  border-block-start: 1px solid var(--hh-color-border);
}

/* 折りたたみ幅 (md〜lg) では分類名を読み上げ専用にする。
   アイコンだけの 64px にラベルを出すと 2 文字で折り返して読めないため。
   区切り線は残るので、目で見ても分類の切れ目は分かる。 */
.hh-shell__nav-group-title {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* --- md 以上: サイドバー常設。ボトムタブは畳む --- */
${mediaUp('md')} {
  .hh-shell {
    grid-template-columns: ${shellSidebarCollapsedWidth} minmax(0, 1fr);
    /* md 以上は main 自体がスクロールコンテナ。ShellHeader はその外側なので、
       ScreenHeader の貼り付き位置へ ShellHeader の高さを足さない。 */
    ${shellHeaderOffsetVariable}: 0px;
  }

  .hh-shell__sidebar {
    display: revert;
  }

  /* md 以上ではシェルの高さを画面に固定し、縦スクロールを本文ペインだけに閉じる。
     こうするとヘッダー (上) とフッター (下) は flex の両端に留まり続け、
     どれだけ本文を送っても画面から消えない。sticky を足すのではなく
     「そもそもスクロールしない場所へ置く」ほうが、重なり順の調整が要らず壊れにくい。 */
  .hh-shell {
    height: 100vh;
    min-height: 100vh;
    overflow: hidden;
  }

  .hh-shell__body {
    height: 100vh;
    overflow: hidden;
  }

  .hh-shell__main {
    overflow-y: auto;
    --hh-main-padding-inline: var(--hh-space-5);
    padding: var(--hh-space-5) var(--hh-main-padding-inline);
    padding-bottom: var(--hh-space-5);
  }

  /* desktop は footer が本文ペインの外側に常時残り、固定タブも無い。 */
  .hh-shell__body > footer {
    margin-block-end: 0;
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

  .hh-shell__nav-group-title {
    position: static;
    width: auto;
    height: auto;
    margin: 0 0 var(--hh-space-1);
    padding: 0 var(--hh-space-3);
    overflow: visible;
    clip-path: none;
    font-size: var(--hh-font-size-sm);
    font-weight: var(--hh-font-weight-bold);
    color: var(--hh-color-text-muted);
  }

  .hh-shell__nav-link {
    justify-content: flex-start;
    padding: 0 var(--hh-space-3);
  }
}
`.trim();
}
