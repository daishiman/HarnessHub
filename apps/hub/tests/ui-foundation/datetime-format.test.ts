/**
 * 日時表示の契約。
 *
 * ここで一番押さえたいのは **端末の時計設定に結果が左右されないこと**。
 * `timeZone` を省いた `Intl.DateTimeFormat` は実行環境のローカル TZ で整形するため、
 * 手元 (JST) では正しく見えるのに、別の TZ で開いた画面だけ日付が 1 日ずれる、
 * という気づきにくい壊れ方をする。UTC を跨ぐ時刻を題材にして固定する。
 */
import { describe, expect, it } from 'vitest';

import { DISPLAY_TIME_ZONE, formatDate, formatDateTime } from '../../src/lib/format/datetime.js';

/** UTC では 8/11、JST では 8/12 になる時刻。TZ の取り違えがそのまま日付の差に出る。 */
const CROSSES_MIDNIGHT_IN_JST = '2026-08-11T15:30:00Z';

describe('formatDate / formatDateTime', () => {
  it('表示の時計を JST に固定する', () => {
    expect(DISPLAY_TIME_ZONE).toBe('Asia/Tokyo');
  });

  it('UTC 基準では前日になる時刻を JST の日付で出す', () => {
    expect(formatDate(CROSSES_MIDNIGHT_IN_JST)).toBe('2026/08/12');
  });

  it('時刻まで出すときは「どの時計か」を添える', () => {
    // 端末の時計とずれていても、利用者が自分で引き算して間違えないようにする
    expect(formatDateTime(CROSSES_MIDNIGHT_IN_JST)).toContain('2026/08/12');
    expect(formatDateTime(CROSSES_MIDNIGHT_IN_JST)).toContain('00:30');
    expect(formatDateTime(CROSSES_MIDNIGHT_IN_JST)).toMatch(/JST|GMT\+9/);
  });

  it('日付だけの表示には時計名を付けない (日の粒度では読み取りに影響しない)', () => {
    expect(formatDate(CROSSES_MIDNIGHT_IN_JST)).not.toMatch(/JST|GMT/);
  });

  it('桁を固定して一覧で数字の位置を揃える', () => {
    expect(formatDate('2026-01-02T00:00:00+09:00')).toBe('2026/01/02');
  });

  it.each([null, undefined, '', 'これは日付ではない'])('日時として読めない値 (%s) は理由の分かる語にする', (value) => {
    // 空欄にすると「取得できていない」のか「元から無い」のか画面から判別できない
    expect(formatDate(value)).toBe('不明');
    expect(formatDateTime(value)).toBe('不明');
  });

  it('画面ごとに言い換えたいときは代わりの語を渡せる', () => {
    expect(formatDateTime(null, '未実施')).toBe('未実施');
  });
});
