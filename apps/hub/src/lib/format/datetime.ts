/**
 * 日時の表示書式。全画面でここだけを使う。
 *
 * 画面ごとに `new Date(x).toLocaleDateString('ja-JP')` を書き写していたため、
 * 同じ「更新日」でも画面によって `2026/8/11` と `2026-08-11T…` が混在していた。
 * どちらが新しいかを読み比べる利用者にとって、書式の揺れはそれだけで読み直しの手間になる。
 *
 * 桁を固定 (2-digit) にするのは、`2026/8/1` と `2026/12/11` が縦に並ぶと
 * 桁数の違いで数字の位置がずれ、一覧で見比べにくくなるため。
 */

/**
 * 表示に使う時計。**JST 固定**であり、端末の時計設定には従わない。
 *
 * `Intl.DateTimeFormat` は `timeZone` を省略すると実行環境のローカル TZ で整形する。
 * 画面を描くのはブラウザなので、これは「利用者の端末が置かれている場所の時刻」になる。
 * ところが集計側 (日次・週次の rollup、cron の期間窓) は JST 固定で日付を切っている。
 * 揃えないと、たとえば海外から見た利用者の画面では「8/11 の集計」に含まれる出来事が
 * `08/10` と表示され、数字が合わない理由を誰も説明できない状態になる。
 *
 * 集計側の基準は `features/metrics-tracking/date-jst.ts` が UTC からの差 (ミリ秒) で持つ。
 * あちらは日付の切り方の計算、ここは表示の整形と役割が違うので、同じ「JST」でも
 * 持ち方が分かれている。TZ 名の文字列としてはここが唯一の置き場。
 */
export const DISPLAY_TIME_ZONE = 'Asia/Tokyo';

const DATE_FORMAT = new Intl.DateTimeFormat('ja-JP', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ja-JP', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  // 時刻まで出すときだけ「どの時計か」を添える。端末の時計と 1 時間でもずれていれば、
  // 表示だけ見て自分の時計と引き算した利用者が必ず間違える。
  // 日付だけの表示に付けないのは、日付の粒度では時計の違いが読み取りに影響しないため。
  timeZoneName: 'short',
});

/** 値が日時として読めないときに出す語。空欄にすると「取得できていない」のか「無い」のか分からない。 */
const UNKNOWN = '不明';

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 日付だけ (作成日・締め日など、その日のどこかであれば十分な場面)。
 *
 * **更新日時には使わない**。同じ日に何度も更新される値を日付だけで出すと、
 * 一覧に同じ文字列の行が並び、新しい順に並べ替えても順序の根拠が画面から消える
 * (「並べ替えたのに順番が変」に見える)。その場合は `formatDateTime` を使う。
 */
export function formatDate(value: string | number | Date | null | undefined, fallback = UNKNOWN): string {
  const date = toDate(value);
  return date === null ? fallback : DATE_FORMAT.format(date);
}

/** 日付 + 時刻 (履歴・実行結果など、同じ日の前後関係が意味を持つ場面)。 */
export function formatDateTime(value: string | number | Date | null | undefined, fallback = UNKNOWN): string {
  const date = toDate(value);
  return date === null ? fallback : DATE_TIME_FORMAT.format(date);
}
