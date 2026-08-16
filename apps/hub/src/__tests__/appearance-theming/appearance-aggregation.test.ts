/**
 * 配色の採用状況を API 形へ畳む処理の検証。
 *
 * 「何を数えているか」がこの層の全てなので、次の 3 点を固定する。
 * - 分母は「外観を保存した人 (measured_users)」であって全利用者ではない
 * - 個人を特定できる値 (userId・メール) がレスポンスへ出ない
 * - schema の enum に載らない値は 0 人として混ぜず、集計対象外にする
 */

import type { CoreRepositories } from '@harness-hub/db';
import { describe, expect, it } from 'vitest';

import { createUserOrgAdminService } from '../../features/user-org-admin/service.js';

type Bucket = {
  readonly palette: string;
  readonly theme: string;
  readonly resolvedTheme: string;
  readonly users: number;
};

/** 集計以外の依存は呼ばれない。呼ばれたら気付けるよう、触ると落ちる形で渡す。 */
function serviceWith(totalUsers: number, buckets: readonly Bucket[]) {
  const userSettings = {
    aggregateAppearance: async () => ({
      totalUsers,
      measuredUsers: buckets.reduce((sum, bucket) => sum + bucket.users, 0),
      buckets,
    }),
  } as unknown as CoreRepositories['userSettings'];

  const unused = new Proxy(
    {},
    {
      get() {
        throw new Error('集計はこの依存を使わないはず');
      },
    },
  ) as never;

  return createUserOrgAdminService({
    users: unused,
    userSettings,
    audit: unused,
    coefficients: unused,
    notifications: unused,
  });
}

describe('getAppearanceUsage', () => {
  it('現在人数・構成比・計測率を返す (分母は保存済みの人数)', async () => {
    const usage = await serviceWith(40, [
      { palette: 'blue', theme: 'dark', resolvedTheme: 'dark', users: 15 },
      { palette: 'gray', theme: 'system', resolvedTheme: 'light', users: 10 },
    ]).getAppearanceUsage();

    expect(usage.total_users).toBe(40);
    expect(usage.measured_users).toBe(25);
    expect(usage.measurement_rate).toBe(0.625);
    expect(usage.by_palette).toEqual([
      { palette: 'blue', users: 15, share: 0.6 },
      { palette: 'gray', users: 10, share: 0.4 },
    ]);
  });

  it('同じ配色は明るさが違っても配色ごとに合算する', async () => {
    const usage = await serviceWith(3, [
      { palette: 'navy', theme: 'dark', resolvedTheme: 'dark', users: 2 },
      { palette: 'navy', theme: 'light', resolvedTheme: 'light', users: 1 },
    ]).getAppearanceUsage();

    expect(usage.by_palette).toEqual([{ palette: 'navy', users: 3, share: 1 }]);
    expect(usage.by_palette_theme).toHaveLength(2);
    expect(usage.by_resolved_theme).toEqual([
      { resolved_theme: 'dark', users: 2, share: 0.6667 },
      { resolved_theme: 'light', users: 1, share: 0.3333 },
    ]);
  });

  it('人数が同じ行はキー昇順で安定させる (実行ごとに並びが揺れない)', async () => {
    const usage = await serviceWith(2, [
      { palette: 'green', theme: 'light', resolvedTheme: 'light', users: 1 },
      { palette: 'beige', theme: 'light', resolvedTheme: 'light', users: 1 },
    ]).getAppearanceUsage();

    expect(usage.by_palette.map((row) => row.palette)).toEqual(['beige', 'green']);
  });

  it('schema にない配色は分母ごと集計対象外にする', async () => {
    // 0 人として混ぜると「その配色は不人気」と読めてしまう。存在しない選択肢は数えない。
    const usage = await serviceWith(10, [
      { palette: 'blue', theme: 'dark', resolvedTheme: 'dark', users: 4 },
      { palette: 'sunset', theme: 'dark', resolvedTheme: 'dark', users: 6 },
    ]).getAppearanceUsage();

    expect(usage.measured_users).toBe(4);
    expect(usage.by_palette).toEqual([{ palette: 'blue', users: 4, share: 1 }]);
  });

  it('誰も保存していなければ 0 除算せず、率を 0 で返す', async () => {
    const usage = await serviceWith(0, []).getAppearanceUsage();

    expect(usage).toEqual({
      total_users: 0,
      measured_users: 0,
      measurement_rate: 0,
      by_palette: [],
      by_palette_theme: [],
      by_resolved_theme: [],
    });
  });

  it('個人を特定できる値をレスポンスへ含めない', async () => {
    const usage = await serviceWith(1, [
      { palette: 'gray', theme: 'system', resolvedTheme: 'light', users: 1 },
    ]).getAppearanceUsage();

    const serialized = JSON.stringify(usage);
    expect(serialized).not.toMatch(/user_id|userId|email/i);
  });
});
