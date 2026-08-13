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
 * 閾値の正本は `breakpointTokens` (480 / 641 / 1025)。ここで px を直書きせず必ず
 * `mediaUp()` を通す (frontend-ui-foundation-spec §2)。既定をスマホ表示にして
 * `mediaUp()` で広げる mobile-first にしてあるのは、`mediaUp()` が min-width しか
 * 作らないためで、max-width の規則を残すと閾値の直書きがここへ戻ってしまうから。
 *
 * 3 区分は Harness Studio デザインシステム §4 に対応する。
 *   〜640px      サイドバー非表示 → 下部固定タブバー
 *   641〜1024px  サイドバーをアイコンのみ 68px へ縮小 (ラベル非表示)
 *   1025px〜     フルサイドバー 212px (アイコン + ラベル)
 */

import { mediaUp } from '../tokens/token-names.js';
import {
  screenHeaderHeightVariable,
  screenHeaderOffsetVariable,
  shellHeaderHeightVariable,
  shellHeaderMinHeight,
  shellHeaderOffsetVariable,
} from './sticky-stack.js';

/** デスクトップ (lg 以上) の常設幅。アイコン + ラベル (デザインシステム §4/§7)。 */
export const shellSidebarWidth = '212px';
/** タブレット (md〜lg) の折りたたみ幅 (アイコンのみ)。44px のタップ域 + 左右余白。 */
export const shellSidebarCollapsedWidth = '68px';
/**
 * モバイルで本文の下端に確保する余白。
 * 固定タブバー本体の高さ (76px) + ホームバー等のセーフエリアを足す。
 * この値を切ると、最後の行やフッターがタブバーの裏へ潜って読めなくなる。
 */
export const shellTabbarSafeOffset = 'calc(76px + env(safe-area-inset-bottom, 0px))';

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
  /* サイドバーは本文より一段沈んだ面 (デザインシステム §7)。
     本文の surface と同色にすると、境界線 1 本でしか区別できなくなる。 */
  background: var(--hh-color-surface-muted);
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
   本文と footer をまとめた body の後ろに safe-area 込みのスクロール余白を確保する。
   main と footer の両方に余白を付けると、footer がある画面だけ二重に空く。
   body に 1 回だけ付ければ、footer の有無に関わらず最後の行がタブバーの上に出る
   (デザインシステム §4「メイン領域下部に calc(76px + safe-area) の padding」)。 */
.hh-shell__body {
  padding-block-end: ${shellTabbarSafeOffset};
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
  /* 下から迫り上がる面なので BottomSheet と同じ frame 段。lg は廃止段 */
  border-start-start-radius: var(--hh-radius-frame);
  border-start-end-radius: var(--hh-radius-frame);
  background: var(--hh-color-surface);
  box-shadow: var(--hh-shadow-raised);
}

/* 折りたたみ時はアイコンを中央に置き、ラベルは支援技術にだけ残す */
.hh-shell__nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--hh-space-2);
  min-height: var(--hh-control-height);
  padding: 0 var(--hh-space-2);
  /* 現在地だけに border を足すと 1px ぶん箱が伸びて、選択のたびに行が揺れる。
     全項目に透明な border を敷いておき、現在地は色を変えるだけにする。 */
  border: 1px solid transparent;
  border-radius: var(--hh-radius-sm);
  color: var(--hh-color-text-muted);
  text-decoration: none;
}

.hh-shell__nav-link:hover {
  background: var(--hh-color-surface-muted);
  color: var(--hh-color-text);
}

/* 現在地は色だけに頼らず、浮き上がった面 + 輪郭 + 太字でも示す (色覚特性への配慮)。
   沈んだサイドバー (surface-muted) の中で現在地だけを surface へ持ち上げる構成は
   デザインシステム §7「ナビ項目(アクティブ) = surface 背景 + border + 影、太字」に対応する。
   アンバー (accent) を使わないのは、あれが「動作中」専用で現在地の意味を持たないため。 */
.hh-shell__nav-link[aria-current='page'] {
  background: var(--hh-color-surface);
  color: var(--hh-color-text);
  font-weight: var(--hh-font-weight-bold);
  border: 1px solid var(--hh-color-border);
  box-shadow: var(--hh-shadow-frame);
}

/* タブバーの現在地は、ユーザー仕様で明示された唯一のナビ例外としてアイコンをアンバーで示す。
   サイドバーと違い、狭い画面では
   面の持ち上げ (背景色 + 影) が 1 行の高さの中で読み取れないため、
   ここだけは色 + 太字 + aria-current の 3 重符号化にする。 */
.hh-shell__tabbar .hh-shell__nav-link[aria-current='page'] {
  background: transparent;
  border: none;
  box-shadow: none;
  color: var(--hh-color-accent);
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
    /* 外枠の分だけ画面より低い。100vh のままだと枠の下辺を突き抜け、
       角丸で切られた分の項目が押し出されて見えなくなる。 */
    height: calc(100vh - var(--hh-shell-frame-inset) * 2);
  }

  /* md 以上ではシェルの高さを画面に固定し、縦スクロールを本文ペインだけに閉じる。
     こうするとヘッダー (上) とフッター (下) は flex の両端に留まり続け、
     どれだけ本文を送っても画面から消えない。sticky を足すのではなく
     「そもそもスクロールしない場所へ置く」ほうが、重なり順の調整が要らず壊れにくい。

     同時にここで「アプリの外枠」を作る (デザインシステム §7)。body の pageBg を
     外周に少しだけ覗かせ、シェル本体を角丸 + 輪郭 + 影で一段持ち上げる。
     縁の太さは変数 1 つに閉じてあるので、高さの引き算 (calc) が本体と body でずれない。
     overflow は clip ではなく hidden のままでよい (角の内側をはみ出す面をここで切る)。
     モバイルでこれを適用しないのは、狭い画面では外周の余白が本文の幅を削るだけで、
     「浮いている」という情報が可読性の損失に見合わないため。 */
  .hh-shell {
    --hh-shell-frame-inset: var(--hh-space-3);
    height: calc(100vh - var(--hh-shell-frame-inset) * 2);
    min-height: auto;
    margin: var(--hh-shell-frame-inset);
    border: 1px solid var(--hh-color-border);
    border-radius: var(--hh-radius-frame);
    box-shadow: var(--hh-shadow-frame);
    overflow: hidden;
  }

  .hh-shell__body {
    height: calc(100vh - var(--hh-shell-frame-inset) * 2);
    overflow: hidden;
  }

  .hh-shell__main {
    overflow-y: auto;
    --hh-main-padding-inline: var(--hh-space-5);
    padding: var(--hh-space-5) var(--hh-main-padding-inline);
    padding-bottom: var(--hh-space-5);
  }

  /* md 以上は固定タブが無いので、タブバー分の下端余白は不要。 */
  .hh-shell__body {
    padding-block-end: 0;
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

/* --- サイドバー開閉トグル (HarnessHub 配色統一・サイドバートグル対応) ---
   開閉 state は SidebarToggleButton が document root に立てる
   data-hh-sidebar-collapsed で受け取る。属性セレクタなので、後段に置くだけで
   md/lg の幅ごとの grid-template-columns を上書きできる (JS 未実行時は
   常に "展開" のまま、既存のレスポンシブ規則だけが効く)。 */
${mediaUp('md')} {
  [data-hh-sidebar-collapsed='true'] .hh-shell {
    grid-template-columns: minmax(0, 1fr);
  }
}

[data-hh-sidebar-collapsed='true'] .hh-shell__sidebar {
  display: none;
}

/* トグル自体はモバイルのタブバーと役割が重なるため、サイドバーが実在する
   md 以上でだけ出す (hh-shell__desktop-only と同じ閾値)。 */
[data-hh-sidebar-toggle] {
  display: none;
  align-items: center;
  justify-content: center;
  min-width: var(--hh-control-height);
  min-height: var(--hh-control-height);
  padding: 0;
  color: var(--hh-color-text);
  background: transparent;
  border: none;
  border-radius: var(--hh-radius-full);
  cursor: pointer;
}

${mediaUp('md')} {
  [data-hh-sidebar-toggle] {
    display: inline-flex;
  }
}
`.trim();
}
