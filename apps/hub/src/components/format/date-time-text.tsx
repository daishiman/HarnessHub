'use client';

/**
 * 日時の共通表示。絶対表記に、直近であれば相対表記 (「3 日前」) を併記する。
 *
 * 画面ごとに `formatDateTime(...)` を直接呼ぶのをやめてこの部品へ寄せている。理由は 2 つ。
 *
 * 1. **相対表記を出す条件を 1 か所に閉じるため。** 「何日前まで出すか」「未来をどう扱うか」を
 *    画面ごとに書くと、同じ日付が画面によって違って見える。読み手はその差を
 *    「データが違う」と受け取る。
 * 2. **サーバとブラウザで描き分ける必要があるため。** 相対表記は現在時刻に依存するので、
 *    サーバで描いた文字列とブラウザが描き直した文字列が一致しない
 *    (サーバで「2 分前」と描いた 30 秒後にブラウザが「3 分前」と描く)。
 *    React はこれを不一致として警告し、条件によっては描き直す。
 *    そこで **描画が終わってから相対表記を足す**。初回の描画には絶対表記しか含まれないため、
 *    サーバとブラウザの出力は必ず一致する。
 *
 * 絶対表記を常に残すのは、記録として日付を控える用途があるため
 * (問い合わせ番号と一緒に「いつのものか」を書き写す、など)。相対表記だけにはしない。
 *
 * **時刻の自動更新はしない。** 1 分ごとに数字を書き換えるには行の数だけタイマーが要り、
 * 一覧では割に合わない。相対表記は「画面を開いた時点で」どれくらい前か、という意味で使う。
 * 開いたまま放置した画面が古い相対表記を出し続けることは、この設計で受け入れている
 * (絶対表記が併記されているので、読み違えても日付そのものは失われない)。
 */

import { useEffect, useState } from 'react';

import { formatDateTime, formatRelativeTime } from '../../lib/format/datetime.js';

export interface DateTimeTextProps {
  /** ISO 文字列・epoch ミリ秒・Date。読めない値と `null` は `fallback` になる。 */
  readonly value: string | number | Date | null | undefined;
  /** 日時が無いときの語。「不明」と「未実施」では意味が違うので画面が決める。 */
  readonly fallback?: string;
}

export function DateTimeText({ value, fallback }: DateTimeTextProps) {
  // 初回描画では null のまま = 絶対表記だけ。ブラウザで描き終えてから基準時刻が入る
  const [now, setNow] = useState<number | null>(null);
  // 依存は空。基準時刻は「この画面を開いた時刻」であって、行の値が差し替わるたびに
  // 取り直すものではない (差し替わっても相対表記はその基準時刻から計算し直される)
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const absolute = fallback === undefined ? formatDateTime(value) : formatDateTime(value, fallback);
  const relative = now === null ? null : formatRelativeTime(value, now);

  if (relative === null) return <>{absolute}</>;

  return (
    <>
      {absolute} <small>{relative}</small>
    </>
  );
}
