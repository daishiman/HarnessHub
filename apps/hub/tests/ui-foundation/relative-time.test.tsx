/** @vitest-environment jsdom */
/**
 * 相対表記 (「3 日前」) の契約。
 *
 * 押さえたいのは 3 点。
 * 1. **「昨日」の境目がカレンダーの日付にあること。** 経過 24 時間で数えると、
 *    昨日の 23:00 が「今日」に、今日の 0:30 が「昨日」になり、読み手の感覚と逆になる。
 * 2. **絶対表記が消えないこと。** 相対表記は併記であって置き換えではない。
 * 3. **最初の描画に相対表記が含まれないこと。** サーバとブラウザで違う文字列を描くと
 *    React が不一致を報告する。この部品はそれを避けるために描画後まで待つ設計になっている。
 */
import { render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DateTimeText } from '../../src/components/format/date-time-text.js';
import { formatRelativeTime, RELATIVE_TIME_MAX_AGE_DAYS } from '../../src/lib/format/datetime.js';

/** 基準時刻: JST 2026/08/12 10:00。 */
const NOW = new Date('2026-08-12T01:00:00Z');

afterEach(() => {
  vi.useRealTimers();
});

describe('RT-FMT: formatRelativeTime', () => {
  it('RT-FMT-001: 直近は分・時間で数える', () => {
    expect(formatRelativeTime('2026-08-12T00:59:40Z', NOW)).toBe('たった今');
    expect(formatRelativeTime('2026-08-12T00:35:00Z', NOW)).toBe('25 分前');
    expect(formatRelativeTime('2026-08-11T22:00:00Z', NOW)).toBe('3 時間前');
  });

  it('RT-FMT-002: 「昨日」の境目は 24 時間ではなく JST の日付', () => {
    // JST 8/11 23:00 = 11 時間前。24 時間で数えると「今日」になってしまうが、人は昨日と読む
    expect(formatRelativeTime('2026-08-11T14:00:00Z', NOW)).toBe('昨日');
    // JST 8/12 00:30 = 9.5 時間前。同じ日なので時間で数える
    expect(formatRelativeTime('2026-08-11T15:30:00Z', NOW)).toBe('9 時間前');
    // 25 時間前 (JST 8/11 09:00) は日付が 1 つ前なので「昨日」。経過時間ではなく日付で数えている証拠
    expect(formatRelativeTime('2026-08-11T00:00:00Z', NOW)).toBe('昨日');
    // 35 時間前 (JST 8/10 23:00) は日付が 2 つ前。24 時間で割ると 1 日前になってしまう
    expect(formatRelativeTime('2026-08-10T14:00:00Z', NOW)).toBe('2 日前');
  });

  it(`RT-FMT-003: ${RELATIVE_TIME_MAX_AGE_DAYS} 日を超えたら相対表記は付けない`, () => {
    const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(daysAgo(RELATIVE_TIME_MAX_AGE_DAYS), NOW)).toBe(`${RELATIVE_TIME_MAX_AGE_DAYS} 日前`);
    expect(formatRelativeTime(daysAgo(RELATIVE_TIME_MAX_AGE_DAYS + 1), NOW)).toBeNull();
  });

  it('RT-FMT-004: 未来と読めない値には付けない (時計のずれぶんだけは「たった今」)', () => {
    // 数秒先はサーバと端末の時計のずれ。ここに「1 分後」と出すと記録が壊れて見える
    expect(formatRelativeTime('2026-08-12T01:00:30Z', NOW)).toBe('たった今');
    expect(formatRelativeTime('2026-08-12T02:00:00Z', NOW)).toBeNull();
    expect(formatRelativeTime(null, NOW)).toBeNull();
    expect(formatRelativeTime('これは日付ではない', NOW)).toBeNull();
  });
});

describe('RT-UI: DateTimeText', () => {
  it('RT-UI-001: 絶対表記を残したまま相対表記を併記する', async () => {
    vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
    const { container } = render(<DateTimeText value="2026-08-11T14:00:00Z" />);

    // 絶対表記は消さない (記録として日付を控える用途があるため)
    expect(container.textContent).toContain('2026/08/11 23:00');
    expect(await screen.findByText('昨日')).toBeTruthy();
  });

  it('RT-UI-002: サーバ側で描いた時点では相対表記を含めない', () => {
    vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
    // サーバ側の描画には useEffect が無い。ここに相対表記が入ると、
    // ブラウザが描き直したときに文字列が食い違い React が不一致を報告する
    const ssr = renderToStaticMarkup(<DateTimeText value="2026-08-11T14:00:00Z" />);

    expect(ssr).toContain('2026/08/11 23:00');
    expect(ssr).not.toContain('昨日');
    expect(ssr).not.toContain('<small>');
  });

  it('RT-UI-003: 日時が無いときは画面が決めた語を出す (相対表記は付かない)', () => {
    const { container } = render(<DateTimeText value={null} fallback="未実施" />);
    expect(container.textContent).toBe('未実施');
  });

  it('RT-UI-004: 古い日時は絶対表記だけになる', async () => {
    vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
    const { container } = render(<DateTimeText value="2026-08-11T14:00:00Z" />);
    // 併記が出る条件では出ることを先に確かめてから…
    await within(container).findByText('昨日');

    // …古い日時では出ないことを見る (「まだ描き終わっていないだけ」と区別する)
    const old = render(<DateTimeText value="2025-01-05T00:00:00Z" />);
    await Promise.resolve();
    expect(old.container.textContent).toBe('2025/01/05 09:00 JST');
    expect(container.textContent).toContain('昨日');
  });
});
