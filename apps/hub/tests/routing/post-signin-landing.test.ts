// spec: harness-hub-post-signin-workspace-scope-addendum §B (AC1/AC2)
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LANDING_PATH,
  isSafeRelativePath,
  resolvePostSigninLanding,
} from '../../src/lib/routing/post-signin-landing.js';

describe('resolvePostSigninLanding', () => {
  it('AC1: 遷移元が無ければ既定着地 (/sheets) に落ちる', () => {
    expect(resolvePostSigninLanding(null)).toBe(DEFAULT_LANDING_PATH);
    expect(resolvePostSigninLanding(undefined)).toBe(DEFAULT_LANDING_PATH);
    expect(resolvePostSigninLanding('')).toBe(DEFAULT_LANDING_PATH);
  });

  it('安全な相対 path はそのまま採用する', () => {
    expect(resolvePostSigninLanding('/catalog')).toBe('/catalog');
    expect(resolvePostSigninLanding('/sheets/new')).toBe('/sheets/new');
  });

  it('AC2: 絶対URL・スキーム付きは既定着地へ落ちる (外部遷移を許さない)', () => {
    expect(resolvePostSigninLanding('https://evil.example.com/phish')).toBe(DEFAULT_LANDING_PATH);
    expect(resolvePostSigninLanding('javascript:alert(1)')).toBe(DEFAULT_LANDING_PATH);
    expect(resolvePostSigninLanding('evil.example.com')).toBe(DEFAULT_LANDING_PATH);
  });

  it('AC2: protocol-relative (//) は既定着地へ落ちる', () => {
    expect(resolvePostSigninLanding('//evil.example.com')).toBe(DEFAULT_LANDING_PATH);
  });

  it('AC2: ブラウザが //  と同一視する /\\ トリックも既定着地へ落ちる', () => {
    expect(resolvePostSigninLanding('/\\evil.example.com')).toBe(DEFAULT_LANDING_PATH);
  });

  it('クエリ文字列内のコロンは弾かない (誤検知の回避)', () => {
    expect(isSafeRelativePath('/sheets?time=12:30')).toBe(true);
  });
});
