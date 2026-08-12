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

/**
 * 相対表記を添える上限 (日)。これより古いものは絶対表記だけにする。
 *
 * 上限を設ける理由は、古い日付ほど相対表記の情報量が絶対表記を下回るため。
 * 「412 日前」は読み手が結局 2025 年のいつかを数え直すことになり、
 * 併記した分だけ行が長くなるだけで判断は速くならない。
 * 逆に直近であるほど「いつか」より「どれくらい前か」が効くので、そこだけに絞る。
 *
 * この 1 つの定数が全画面の境目。画面ごとに「ここは 7 日で」と変えないこと
 * (同じ日付が画面によって相対表記が出たり出なかったりすると、出ていないことを
 * 「まだ新しくない」の意味だと読まれる)。
 */
export const RELATIVE_TIME_MAX_AGE_DAYS = 30;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * JST における通算日番号。日付の「差」を数えるために使う。
 *
 * 経過ミリ秒を 86,400,000 で割る方法を採らないのは、それが「24 時間ぶん経ったか」の
 * 計算であって、人が読む「昨日」ではないため。昨日の 23:00 は 2 時間前でも昨日であり、
 * 今日の 0:30 は 25 時間前の出来事より新しい。境目はカレンダーの日付にある。
 *
 * どの時計で日付を切るかは `DATE_FORMAT` (= `DISPLAY_TIME_ZONE`) に委ねる。
 * ここで JST のオフセット (+9h) を書き直すと、時計の定義がこのファイル内で 2 つになる。
 */
function jstDayNumber(date: Date): number {
  const [year, month, day] = DATE_FORMAT.format(date).split('/').map(Number);
  return Date.UTC(year as number, (month as number) - 1, day as number) / DAY_MS;
}

/**
 * 「3 日前」のような相対表記。**絶対表記の置き換えではなく併記用**。
 *
 * 添えるものが無いときは `null` を返す (呼び出し側は絶対表記だけを出す)。`null` になるのは
 * 未来の日時・読めない値・`RELATIVE_TIME_MAX_AGE_DAYS` より古いもの。
 * 未来を除くのは、時計のずれで数秒先になった値に「1 分後」と出すと、
 * 記録の不整合ではなく利用者の誤操作に見えるため (数秒程度は「たった今」に寄せる)。
 *
 * `now` を引数で受けるのは、この関数自身が現在時刻を読むとテストが書けなくなるのと、
 * 呼び出し側 (描画後に一度だけ時刻を確定する) が基準時刻を握る必要があるため。
 */
export function formatRelativeTime(
  value: string | number | Date | null | undefined,
  now: Date | number,
): string | null {
  const date = toDate(value);
  if (date === null) return null;

  const nowDate = now instanceof Date ? now : new Date(now);
  const elapsedMs = nowDate.getTime() - date.getTime();

  // 時計のずれで数秒先を指す値は「たった今」に寄せる。それ以上先なら相対表記は付けない
  if (elapsedMs < -MINUTE_MS) return null;
  if (elapsedMs < MINUTE_MS) return 'たった今';
  if (elapsedMs < HOUR_MS) return `${Math.floor(elapsedMs / MINUTE_MS)} 分前`;

  const dayDiff = jstDayNumber(nowDate) - jstDayNumber(date);
  if (dayDiff <= 0) return `${Math.floor(elapsedMs / HOUR_MS)} 時間前`;
  if (dayDiff === 1) return '昨日';
  if (dayDiff <= RELATIVE_TIME_MAX_AGE_DAYS) return `${dayDiff} 日前`;
  return null;
}
