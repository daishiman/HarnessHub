/**
 * TID-LAND-01〜07: サインイン後の着地先解決 (`resolvePostSigninLanding`) の入力分類。
 * 05〜07 は design-review.md 指摘1 (open redirect のランタイム挙動検査) に対応する境界値。
 *
 * feat-post-signin-scope-routing P06 (docs/features/feat-post-signin-scope-routing/test-design.md)
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_POST_SIGNIN_LANDING, resolvePostSigninLanding } from '../../src/lib/routing/post-signin-landing.js';

describe('TID-LAND: 着地先解決の入力分類', () => {
  it('TID-LAND-01: 遷移元が無い (null / undefined) -> 既定着地', () => {
    expect(resolvePostSigninLanding(null)).toBe(DEFAULT_POST_SIGNIN_LANDING);
    expect(resolvePostSigninLanding(undefined)).toBe(DEFAULT_POST_SIGNIN_LANDING);
  });

  it('TID-LAND-02: 同一 origin の相対 path -> そのまま採用', () => {
    expect(resolvePostSigninLanding('/sheets/new')).toBe('/sheets/new');
  });

  it('TID-LAND-03: 絶対 URL -> 既定着地へフォールバック', () => {
    expect(resolvePostSigninLanding('https://evil.com/phish')).toBe(DEFAULT_POST_SIGNIN_LANDING);
  });

  it('TID-LAND-04: スキーム付き -> 既定着地へフォールバック', () => {
    expect(resolvePostSigninLanding('javascript:alert(1)')).toBe(DEFAULT_POST_SIGNIN_LANDING);
  });

  it('TID-LAND-05: protocol-relative (先頭2連スラッシュ) -> 既定着地へフォールバック', () => {
    expect(resolvePostSigninLanding('//evil.com')).toBe(DEFAULT_POST_SIGNIN_LANDING);
  });

  it('TID-LAND-06: バックスラッシュによるホスト解釈トリック -> 既定着地へフォールバック', () => {
    expect(resolvePostSigninLanding('/\\evil.com')).toBe(DEFAULT_POST_SIGNIN_LANDING);
  });

  it('TID-LAND-07: 資格情報付き URL -> 既定着地へフォールバック', () => {
    expect(resolvePostSigninLanding('http://user@evil.com')).toBe(DEFAULT_POST_SIGNIN_LANDING);
  });

  it('既定着地の定数値は /sheets (画面ごとに散らさない単一定数)', () => {
    expect(DEFAULT_POST_SIGNIN_LANDING).toBe('/sheets');
  });
});
