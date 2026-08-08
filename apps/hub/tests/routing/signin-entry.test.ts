/**
 * ランディング (`/`) からテナント別サインインへの動線の検査。
 *
 * 検査対象は 2 つ。
 *   1. slug の正規化と拒否 (path segment になるため、遷移先を作り替えられないこと)
 *   2. `/signin` route handler が 303 と cookie で「次回の直リンク」を残すこと
 * さらに、この入口が認証前に到達できること (public path) も併せて固定する。
 * public にし忘れると入口自体が 401 になり、サインインへ到達する経路が消える。
 */
import { tenantSlugSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { GET } from '../../src/app/signin/route.js';
import {
  LAST_TENANT_COOKIE_NAME,
  readTenantSlug,
  resolveSigninEntry,
  SIGNIN_ENTRY_PATH,
  TENANT_ERROR_QUERY_PARAM,
  tenantSigninPath,
} from '../../src/lib/routing/signin-entry.js';
import { isPublicPath } from '../../src/middleware/authz.js';

function request(query: string): Request {
  return new Request(`https://hub.example.com${SIGNIN_ENTRY_PATH}${query}`);
}

describe('テナント slug の受理と正規化', () => {
  it('前後の空白と大文字を吸収して受理する (手入力の揺れで弾かない)', () => {
    expect(readTenantSlug('  Harness-Hub  ')).toBe('harness-hub');
  });

  it('空・未指定は受理しない', () => {
    expect(readTenantSlug(null)).toBeNull();
    expect(readTenantSlug(undefined)).toBeNull();
    expect(readTenantSlug('   ')).toBeNull();
  });

  it.each([
    ['path 区切り', 'foo/bar'],
    ['親ディレクトリ', '..'],
    ['先頭ハイフン', '-foo'],
    ['末尾ハイフン', 'foo-'],
    ['アンダースコア', 'foo_bar'],
    ['全角', 'テナント'],
    ['長すぎる', 'a'.repeat(64)],
  ])('%s は受理しない', (_label, value) => {
    expect(readTenantSlug(value)).toBeNull();
  });

  it('受理できない値は遷移先を組み立てず、入力値もそのまま返さない', () => {
    const resolution = resolveSigninEntry('../../evil');
    expect(resolution.ok).toBe(false);
    expect(resolution.location).toBe(`/?${TENANT_ERROR_QUERY_PARAM}=1`);
    expect(resolution.location).not.toContain('evil');
  });
});

describe('GET /signin', () => {
  it('正しい slug は `/{slug}/signin` へ 303 で送る', () => {
    const response = GET(request('?tenant=harness-hub'));
    expect(response.status).toBe(303);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/harness-hub/signin');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('正しい slug のときだけ直近テナントを記憶する', () => {
    const response = GET(request('?tenant=Harness-Hub'));
    const cookie = response.cookies.get(LAST_TENANT_COOKIE_NAME);
    expect(cookie?.value).toBe('harness-hub');
    // 認可には使わないが、script から読める理由も無いので httpOnly を外さない
    expect(cookie?.httpOnly).toBe(true);
  });

  it('不正な slug はランディングへ差し戻し、記憶も残さない', () => {
    const response = GET(request('?tenant=%2Fetc%2Fpasswd'));
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/');
    expect(location.searchParams.get(TENANT_ERROR_QUERY_PARAM)).toBe('1');
    expect(response.cookies.get(LAST_TENANT_COOKIE_NAME)).toBeUndefined();
  });

  it('tenant 未指定もランディングへ差し戻す', () => {
    const response = GET(request(''));
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/');
  });
});

describe('入口の到達性', () => {
  it('`/signin` は認証前に到達できる', () => {
    expect(isPublicPath(SIGNIN_ENTRY_PATH)).toBe(true);
  });

  it('テナント別サインイン画面も認証前に到達できる', () => {
    expect(isPublicPath('/harness-hub/signin')).toBe(true);
  });

  /**
   * middleware の public 判定と画面側の slug 検証がずれると、直リンク (`/ACME/signin`) は
   * middleware を通るのに画面が 404 を返す、という入口ごとの挙動差になる。
   * どちらも `tenantSlugSchema` を唯一の正本にしていることを、受理/拒否の一致で固定する。
   */
  it.each([
    ['小文字とハイフン', 'harness-hub'],
    ['数字始まり', '9lives'],
    ['大文字', 'ACME'],
    ['アンダースコア', 'tenant_a'],
    ['先頭ハイフン', '-foo'],
    ['末尾ハイフン', 'foo-'],
    ['長すぎる', 'a'.repeat(64)],
  ])('%s: middleware の到達可否が slug schema の受理と一致する', (_label, slug) => {
    // 手入力の吸収 (trim/小文字化) は `readTenantSlug` 側の責務なので、ここでは schema の生の判定と突き合わせる
    expect(isPublicPath(tenantSigninPath(slug))).toBe(tenantSlugSchema.safeParse(slug).success);
  });
});
