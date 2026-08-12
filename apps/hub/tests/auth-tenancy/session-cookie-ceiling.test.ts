/**
 * HarnessHub-alyy: session cookie に載る `workspace_ids` の 4096-byte 送出境界を
 * unit test (ブラウザを起動しない単体テスト) で固定する。
 *
 * 背景: claims 焼き込み方式では `workspace_ids` が所属数に比例して伸び、cookie の
 * 4096 バイトの保守的な可搬境界を越える。ブラウザごとの保存・破棄の実挙動は
 * この test では測っておらず、統合テスト側で別途確認する。
 *
 * この test は方式を変えない。**境界が今いくつなのかを測定し、静かに縮まないよう固定する**
 * ことだけを担う。claim を 1 つ足すと上限は下がるので、その変化をここで可視化する。
 * 方式選定 (A: 都度 DB / B: server 側 store / C: cookie 分割 / D: 所属数の製品上限) は
 * HarnessHub-alyy 本体で扱う。
 */
import { describe, expect, it } from 'vitest';

import { serializeSessionCookie } from '../../src/lib/auth/config';
import { signJwt } from '../../src/lib/auth/jwt';
import type { DirectoryUser } from '../../src/lib/auth/ports';
import { buildSessionClaims } from '../../src/lib/auth/session';

/** ブラウザ間の可搬性のために採る、Set-Cookie 1 個の保守的な送出境界。 */
const COOKIE_BYTE_LIMIT = 4096;
const SECRET = 'a'.repeat(64);
const NOW_SECONDS = 1_780_000_000;

/** ULID は 26 文字。実データと同じ長さでないと上限がずれる。 */
const ULID_LENGTH = 26;

function ulidLike(index: number): string {
  return `01K${String(index).padStart(ULID_LENGTH - 3, 'A')}`.slice(0, ULID_LENGTH);
}

function userWithMemberships(count: number, options: { readonly withNames: boolean }): DirectoryUser {
  const workspaceIds = Array.from({ length: count }, (_, i) => ulidLike(i));
  return {
    id: ulidLike(9_999),
    tenantId: ulidLike(9_998),
    idpSubject: 'idp-subject-value',
    name: '山田 太郎',
    email: 'yamada@example.com',
    role: 'member',
    status: 'active',
    workspaceIds,
    ...(options.withNames
      ? { workspaceNames: Object.fromEntries(workspaceIds.map((id) => [id, `ワークスペース ${id}`])) }
      : {}),
  } as DirectoryUser;
}

/** 所属 `count` 件のとき、実際に送出される `Set-Cookie` のバイト数。 */
async function setCookieBytes(count: number, withNames: boolean): Promise<number> {
  const claims = buildSessionClaims(userWithMemberships(count, { withNames }), NOW_SECONDS);
  const token = await signJwt(claims, SECRET);
  return new TextEncoder().encode(serializeSessionCookie(token)).length;
}

/** 上限に収まる最大の所属数を二分探索で実測する。 */
async function measureCeiling(withNames: boolean): Promise<number> {
  let lo = 0;
  let hi = 1024;
  // hi が必ず超過側であることを先に確かめる (超過しないなら探索の前提が崩れる)。
  expect(await setCookieBytes(hi, withNames)).toBeGreaterThan(COOKIE_BYTE_LIMIT);
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await setCookieBytes(mid, withNames)) <= COOKIE_BYTE_LIMIT) lo = mid;
    else hi = mid;
  }
  return lo;
}

describe('session cookie の 4096-byte 保守的送出境界 (HarnessHub-alyy)', () => {
  it('T-ALYY-01: 送出境界は測定でき、記録した水準を下回らない', async () => {
    const ceiling = await measureCeiling(false);
    // 2026-08-12 実測: 所属 95 件 (そのときの Set-Cookie は 4085 バイト) が上限。
    // claim を増やすと下がるため、下がったらこの test が落ちて気づける。
    // 上振れは害が無いので下限だけを固定する (上振れしたら記録値を引き上げてよい)。
    expect(ceiling).toBeGreaterThanOrEqual(95);
    // 上限のすぐ外側では必ず超過することも確かめる (境界が実在することの確認)。
    expect(await setCookieBytes(ceiling, false)).toBeLessThanOrEqual(COOKIE_BYTE_LIMIT);
    expect(await setCookieBytes(ceiling + 1, false)).toBeGreaterThan(COOKIE_BYTE_LIMIT);
  });

  it('T-ALYY-02: workspace_names を落としても上限は救えない (id 側が伸びるため)', async () => {
    const ceiling = await measureCeiling(false);
    // 名前つきで上限ちょうどの所属数を渡すと、名前は落ちるが id は残る = 同じ上限に収まる。
    const claims = buildSessionClaims(userWithMemberships(ceiling, { withNames: true }), NOW_SECONDS);
    expect(claims.workspace_names).toBeUndefined();
    expect(claims.workspace_ids).toHaveLength(ceiling);
    expect(await setCookieBytes(ceiling, true)).toBeLessThanOrEqual(COOKIE_BYTE_LIMIT);
    // 上限を 1 件越えると、名前を落としきってもなお超過する = 名前の切り捨てでは救えない。
    expect(await setCookieBytes(ceiling + 1, true)).toBeGreaterThan(COOKIE_BYTE_LIMIT);
  });

  it('T-ALYY-03: serializer は境界超過の Set-Cookie を throw せず返す', async () => {
    const ceiling = await measureCeiling(false);
    // ここで固定するのは server 側 serializer の送出挙動だけで、browser が
    // cookie を保存/破棄するかは実測していない。ここが throw に変わるなら方式変更を伴う設計判断であり、
    // HarnessHub-alyy の決着としてこの test を書き換えること。
    const claims = buildSessionClaims(userWithMemberships(ceiling + 50, { withNames: false }), NOW_SECONDS);
    expect(claims.workspace_ids).toHaveLength(ceiling + 50);
    expect(await setCookieBytes(ceiling + 50, false)).toBeGreaterThan(COOKIE_BYTE_LIMIT);
  });
});
