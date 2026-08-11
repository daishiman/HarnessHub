/**
 * UIS-DN-*: ヘッダーに出す表示名の決め方と、それを session claims へ載せる/載せないの境界。
 *
 * ここで固定したいのは「名前が無い利用者が実在する」という前提そのもの。
 * NOT NULL を「値がある」と読んだ実装は、空白のヘッダーか、ULID を氏名の位置に置いた
 * 「読めない名前」のどちらかを作る。どちらも落ちずに出てしまうので、テストで押さえる。
 */
import { describe, expect, it } from 'vitest';

import { serializeSessionCookie } from '../../lib/auth/config.js';
import { resolveAccountDisplayName } from '../../lib/auth/display-name.js';
import { JWT_ENVELOPE_CHARS } from '../../lib/auth/jwt.js';
import type { DirectoryUser } from '../../lib/auth/ports.js';
import { buildSessionClaims } from '../../lib/auth/session.js';

function user(overrides: Partial<DirectoryUser> = {}): DirectoryUser {
  return {
    id: 'user-1',
    tenantId: 'tenant-a',
    idpSubject: 'idp-1',
    name: '',
    email: '',
    role: 'member',
    status: 'active',
    workspaceIds: [],
    ...overrides,
  };
}

describe('UIS-DN: resolveAccountDisplayName の三段フォールバック', () => {
  it('UIS-DN-001: 氏名があれば氏名', () => {
    expect(resolveAccountDisplayName({ name: '山田 太郎', email: 'yamada@example.com' })).toBe('山田 太郎');
  });

  it('UIS-DN-002: 氏名が空文字ならメールアドレス (JIT provisioning 直後の状態)', () => {
    expect(resolveAccountDisplayName({ name: '', email: 'yamada@example.com' })).toBe('yamada@example.com');
  });

  it('UIS-DN-003: どちらも空文字なら undefined (呼び出し側が識別子表示へ落とす)', () => {
    expect(resolveAccountDisplayName({ name: '', email: '' })).toBeUndefined();
  });

  /** 空白だけの氏名は「入っている」ように見えて画面では空白になる。全角空白も同じ。 */
  it('UIS-DN-004: 空白だけの氏名は名前として扱わない', () => {
    expect(resolveAccountDisplayName({ name: '  ', email: 'yamada@example.com' })).toBe('yamada@example.com');
    expect(resolveAccountDisplayName({ name: '　', email: '' })).toBeUndefined();
  });
});

describe('UIS-DN: buildSessionClaims が載せる表示情報', () => {
  it('UIS-DN-005: 表示名が決まれば name claim に載る', () => {
    expect(buildSessionClaims(user({ name: '山田 太郎' }), 1000)).toMatchObject({ name: '山田 太郎' });
  });

  /** 空文字を載せると受け手が「名前がある」と読む。キーごと無いことを固定する。 */
  it('UIS-DN-006: 表示名が 1 つも無ければ name claim を載せない', () => {
    expect(buildSessionClaims(user(), 1000)).not.toHaveProperty('name');
  });

  it('UIS-DN-007: Workspace 名は表示専用の対応表として載る', () => {
    const claims = buildSessionClaims(
      user({ workspaceIds: ['ws-1', 'ws-2'], workspaceNames: { 'ws-1': '営業部' } }),
      1000,
    );

    // 名前が引けない ws-2 は対応表から欠けるが、到達可否を決める workspace_ids には残る
    expect(claims.workspace_names).toStrictEqual({ 'ws-1': '営業部' });
    expect(claims.workspace_ids).toStrictEqual(['ws-1', 'ws-2']);
  });

  it('UIS-DN-008: 名前が 1 件も無ければ workspace_names を載せない', () => {
    expect(buildSessionClaims(user({ workspaceIds: ['ws-1'] }), 1000)).not.toHaveProperty('workspace_names');
  });
});

/**
 * UIS-SZ-*: session cookie の 4096 バイト上限。
 *
 * `workspace_names` は所属数に比例して伸びる唯一の claim で、上限を越えるとブラウザが
 * cookie を**黙って捨てる**。サインインは成功するのに保存されず、次の要求で
 * サインイン画面へ戻る — エラーも出ないので、症状から原因に辿り着けない。
 *
 * しかも**所属の多い利用者だけが踏む**。開発用のアカウントは所属が 1〜2 件なので、
 * この検査が無いと手元でも CI でも一生再現しない。
 */
describe('UIS-SZ: session claims のサイズ上限', () => {
  /** 実在しうる形に寄せる。ULID は 26 文字なので、鍵の長さが効く。 */
  function manyWorkspaces(count: number): { ids: string[]; names: Record<string, string> } {
    const ids: string[] = [];
    const names: Record<string, string> = {};
    for (let index = 0; index < count; index += 1) {
      const id = `01J${index.toString().padStart(23, '0')}`;
      ids.push(id);
      names[id] = `第 ${index} 事業部 業務改善プロジェクト`;
    }
    return { ids, names };
  }

  const encodedCookieBytes = (claims: unknown): number => {
    const payload = new TextEncoder().encode(JSON.stringify(claims)).length;
    // base64url は 3 バイト → 4 文字。envelope (header/署名/区切り) と cookie の属性を足す
    return Math.ceil(payload / 3) * 4 + JWT_ENVELOPE_CHARS + serializeSessionCookie('').length;
  };

  it('UIS-SZ-001: 所属が少なければ Workspace 名はそのまま載る', () => {
    const { ids, names } = manyWorkspaces(3);
    const claims = buildSessionClaims(user({ workspaceIds: ids, workspaceNames: names }), 1000);

    expect(claims.workspace_names).toStrictEqual(names);
  });

  it('UIS-SZ-002: 所属が多いと workspace_names を落とし、cookie の上限に収める', () => {
    const { ids, names } = manyWorkspaces(60);
    const claims = buildSessionClaims(user({ workspaceIds: ids, workspaceNames: names }), 1000);

    // 名前を載せたままなら上限を超えていた、という前提そのものを固定する。
    // ここが崩れると「落とす検査」が何も検査していない状態で緑になる
    expect(encodedCookieBytes({ ...claims, workspace_names: names })).toBeGreaterThan(4096);

    expect(claims).not.toHaveProperty('workspace_names');
    expect(encodedCookieBytes(claims)).toBeLessThanOrEqual(4096);
  });

  /** 名前を落とすつもりが所属まで削る実装になっていないこと。ここが到達可否の境界。 */
  it('UIS-SZ-003: workspace_names を落としても workspace_ids は 1 件も欠けない', () => {
    const { ids, names } = manyWorkspaces(60);
    const claims = buildSessionClaims(user({ workspaceIds: ids, workspaceNames: names }), 1000);

    expect(claims.workspace_ids).toStrictEqual(ids);
    expect(claims.workspace_ids).toHaveLength(60);
  });

  /** 表示名は 1 件しか無いのでサイズに効かない。巻き添えで消さない。 */
  it('UIS-SZ-004: workspace_names を落としても name は残る', () => {
    const { ids, names } = manyWorkspaces(60);
    const claims = buildSessionClaims(user({ name: '山田 太郎', workspaceIds: ids, workspaceNames: names }), 1000);

    expect(claims.name).toBe('山田 太郎');
    expect(claims).not.toHaveProperty('workspace_names');
  });

  /** 落とす/落とさないの境目で、到達可否と role/status が変わらないこと。 */
  it('UIS-SZ-005: 落としても認可に使う claim は同じ', () => {
    const small = manyWorkspaces(3);
    const large = manyWorkspaces(60);
    const shared = { name: '山田 太郎', role: 'workspace-admin', status: 'active' } as const;

    const kept = buildSessionClaims(user({ ...shared, workspaceIds: small.ids, workspaceNames: small.names }), 1000);
    const dropped = buildSessionClaims(user({ ...shared, workspaceIds: large.ids, workspaceNames: large.names }), 1000);

    for (const claims of [kept, dropped]) {
      expect(claims.role).toBe('workspace-admin');
      expect(claims.status).toBe('active');
      expect(claims.name).toBe('山田 太郎');
    }
    expect(kept.workspace_ids).toHaveLength(3);
    expect(dropped.workspace_ids).toHaveLength(60);
  });
});
