/**
 * 識別子 (ULID など) の見せ方を 1 つに固定する。
 *
 * これまで画面ごとに識別子を素の文字列で出していたため、`01KYRGHY94VEZWJFXXZCSQKKAX` が
 * 名前と同じ大きさ・同じ太さで並び、「読むもの」に見えていた。識別子は**読むものではなく
 * 照合と貼り付けに使うもの**なので、次の 3 点で名前より一段下げる。
 *
 * 1. 等幅・小さめ・薄めにして、隣にある名前より視覚的に後ろへ置く。
 * 2. 幅を制限し、長くても行を押し広げない (末尾は `…` で省略される)。
 * 3. **全文を DOM に残したまま**省略する。短縮した文字列だけを描くと、
 *    コピーした値が使えないという一番困る形になる。
 *
 * 省略した全文へ辿り着く経路を `<details>` で作る。以前は `title` 属性だけが全文の
 * 出しどころで、これには 2 つの問題があった。
 *
 * - **キーボードだけでは全文に辿り着けない**。`title` はポインタを重ねたときにしか出ず、
 *   フォーカスでは開かない。省略された値は、マウスを使わない利用者には永久に読めない。
 * - `title` は支援技術ごとに読むか読まないかが分かれ、表示位置も時間も制御できない。
 *   「情報を伝える唯一の手段」に使ってよい属性ではない (WCAG 1.4.13 / 4.1.2)。
 *
 * `<summary>` は素で焦点を受け取り Enter / Space で開くので、経路が 1 つで両方に効く。
 * client JS は持たない (コピーボタンを置くと、シェルに載る全画面へ JS が増えるため)。
 */
import type { ReactNode } from 'react';

export interface IdBadgeProps {
  /** 識別子の全文。省略表示は CSS が行うので、ここは必ず全文を渡す。 */
  value: string;
  /**
   * 読み上げ用の種別名 (「ワークスペース ID」など)。
   * 識別子だけを読み上げても何の ID か分からないため、原則として渡す。
   */
  label?: string | undefined;
}

export function IdBadge({ value, label }: IdBadgeProps): ReactNode {
  const spoken = label === undefined ? value : `${label}: ${value}`;

  return (
    <details data-hh-id-badge="">
      {/*
        読み上げ名は開く前から全文にする (開かないと何の ID か分からない、を避ける)。
        中の短縮表示を aria-hidden にしているのは、同じ値が名前と本文で二度読まれるのを防ぐため。
      */}
      <summary aria-label={spoken} data-hh-focusable="">
        <span aria-hidden="true" data-hh-id-badge-short="">
          {value}
        </span>
      </summary>
      {/* 開いたときだけ現れる全文。クリック 1 回で全体が選択される (user-select: all) */}
      <code data-hh-id-badge-full="">{value}</code>
    </details>
  );
}
