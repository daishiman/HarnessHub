/**
 * 共通 Google OAuth client 方式の単体契約 (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * この issue の受入条件は「どこか 1 箇所が守れば成立する」形ではない。
 * 署名付き state (テナント束縛) と `hd` 照合 (Workspace 帰属) は**互いに補えない**:
 *
 *   - state だけ通す実装は、テナント A の state で テナント B の Workspace 利用者を通す。
 *   - `hd` だけ見る実装は、同じ Workspace を許可した別テナントへ利用者を通す。
 *
 * だから両方を別々の describe で固定し、さらに「片方が欠けても閉じる」ことを
 * fail-closed の describe で表明する。
 *
 * IdP は立てない。ここで検査するのは純関数と設定組立だけで、HTTP 経路を含む往復は
 * `shared-google-oidc-callback-flow.test.ts` と `shared-google-oidc-policy-flow.test.ts` が
 * 実 `Auth()` で通す。
 */

import { describe, expect, it } from 'vitest';

import {
  createOidcCredentialResolver,
  GOOGLE_OIDC_ISSUER,
  type OidcVerificationInput,
  readSharedGoogleCredentials,
  resolveTenantOidcConfig,
  SHARED_GOOGLE_CLIENT_ID_ENV,
  SHARED_GOOGLE_CLIENT_SECRET_ENV,
  type TenantOidcConnection,
  verifyOidcIdToken,
} from '../../src/lib/auth/index.js';
import { createInMemoryOidcConnections, oidcConnection, TENANT_A, TENANT_B } from './support/in-memory-ports.js';

const NOW = 1_800_000_000;
const SHARED_CLIENT_ID = 'shared-client.apps.googleusercontent.com';
const SHARED_CLIENT_SECRET = 'shared-client-secret';

/** 共有方式のテナント。issuer は Google 固定、許可ドメインは 1 件。 */
const SHARED_A: TenantOidcConnection = oidcConnection({
  tenantId: TENANT_A,
  tenantSlug: 'tenant-a',
  issuer: GOOGLE_OIDC_ISSUER,
  clientId: SHARED_CLIENT_ID,
  displayName: 'Tenant A (共通 client)',
  credentialMode: 'shared_google',
  allowedWorkspaceDomains: ['a-corp.example'],
});

/** 顧客持ち込み方式のテナント。既存挙動の対照群。 */
const CUSTOMER_B: TenantOidcConnection = oidcConnection({
  tenantId: TENANT_B,
  tenantSlug: 'tenant-b',
  issuer: 'https://idp-b.example.com',
  clientId: 'client-b',
  displayName: 'Tenant B (顧客 client)',
});

const SHARED_CREDENTIALS = readSharedGoogleCredentials({
  [SHARED_GOOGLE_CLIENT_ID_ENV]: SHARED_CLIENT_ID,
  [SHARED_GOOGLE_CLIENT_SECRET_ENV]: SHARED_CLIENT_SECRET,
});
if (SHARED_CREDENTIALS === null) throw new Error('前提: 共有 credential が読めるはず');

/**
 * 実行時にだけ現れうる「未知の credential mode」。
 *
 * 列挙は型で閉じているので、この状態は TypeScript のコードからは作れない。
 * それでも検査するのは、値の出所が **DB の TEXT 列**だから — 列挙を増やした migration が
 * 先に本番へ入った場合や、手で書き換えられた行では実際に到達する。
 * 「型で防げているから実行時は見ない」にすると、その瞬間に既定 (= 共有) へ落ちる実装が通る。
 */
const UNKNOWN_MODE = oidcConnection({
  tenantId: TENANT_A,
  tenantSlug: 'tenant-a',
  issuer: GOOGLE_OIDC_ISSUER,
  clientId: SHARED_CLIENT_ID,
  displayName: '未知 mode',
  credentialMode: 'future_mode' as TenantOidcConnection['credentialMode'],
  allowedWorkspaceDomains: ['a-corp.example'],
});

// ---------------------------------------------------------------------------
// 受入条件 4: 共有 secret を行へ複製せず、ログ・レスポンスへ出さない
// ---------------------------------------------------------------------------

describe('共有 credential の読み取り (受入条件 4)', () => {
  it('client_id と secret が揃っているときだけ読める', () => {
    expect(SHARED_CREDENTIALS.clientId).toBe(SHARED_CLIENT_ID);
    expect(SHARED_CREDENTIALS.clientSecret).toBe(SHARED_CLIENT_SECRET);
  });

  it('片方だけの設定は null (半端に有効な状態を作らない)', () => {
    expect(readSharedGoogleCredentials({ [SHARED_GOOGLE_CLIENT_ID_ENV]: SHARED_CLIENT_ID })).toBeNull();
    expect(readSharedGoogleCredentials({ [SHARED_GOOGLE_CLIENT_SECRET_ENV]: SHARED_CLIENT_SECRET })).toBeNull();
    expect(readSharedGoogleCredentials({})).toBeNull();
  });

  it('空文字は未設定と同じ扱い', () => {
    expect(
      readSharedGoogleCredentials({
        [SHARED_GOOGLE_CLIENT_ID_ENV]: SHARED_CLIENT_ID,
        [SHARED_GOOGLE_CLIENT_SECRET_ENV]: '',
      }),
    ).toBeNull();
  });

  it('JSON 直列化で secret が伏せられる (構造化ログ・API 応答への露出を型の側で塞ぐ)', () => {
    const serialized = JSON.stringify({ credentials: SHARED_CREDENTIALS });

    expect(serialized).not.toContain(SHARED_CLIENT_SECRET);
    expect(serialized).toContain('[redacted]');
    // client_id は秘密ではない。障害調査でどの client を見ているか分かる必要がある
    expect(serialized).toContain(SHARED_CLIENT_ID);
  });
});

describe('credential 出所の解決 (受入条件 4 / 5)', () => {
  /** 顧客方式の呼び出し記録つき resolver。委譲の有無を観測するために使う。 */
  function createResolver(options: { readonly sharedGoogle?: typeof SHARED_CREDENTIALS | null } = {}) {
    const customerCalls: string[] = [];
    const resolve = createOidcCredentialResolver({
      sharedGoogle: options.sharedGoogle === undefined ? SHARED_CREDENTIALS : options.sharedGoogle,
      customerClientSecretFor: async (tenantId) => {
        customerCalls.push(tenantId);
        return `customer-secret-${tenantId}`;
      },
    });
    return { resolve, customerCalls };
  }

  it('共有方式は環境単位の secret を返し、テナント行を引かない', async () => {
    const { resolve, customerCalls } = createResolver();

    expect(await resolve(SHARED_A)).toBe(SHARED_CLIENT_SECRET);
    // テナント行へ問い合わせないこと自体が「行へ複製していない」ことの表明
    expect(customerCalls).toEqual([]);
  });

  it('顧客方式はテナント行の復号へ委譲する (既存経路が変わらない)', async () => {
    const { resolve, customerCalls } = createResolver();

    expect(await resolve(CUSTOMER_B)).toBe(`customer-secret-${TENANT_B}`);
    expect(customerCalls).toEqual([TENANT_B]);
  });

  it('共有 credential 未設定の環境では共有方式が解決できない', async () => {
    const { resolve } = createResolver({ sharedGoogle: null });
    expect(await resolve(SHARED_A)).toBeNull();
  });

  it('共有 credential 未設定でも顧客方式は従来どおり動く (受入条件 5)', async () => {
    const { resolve } = createResolver({ sharedGoogle: null });
    expect(await resolve(CUSTOMER_B)).toBe(`customer-secret-${TENANT_B}`);
  });

  it('Google 以外の issuer を名乗る共有接続へ共有 secret を渡さない', async () => {
    const { resolve } = createResolver();
    const impostor = { ...SHARED_A, issuer: 'https://accounts.google.com.evil.example' };

    expect(await resolve(impostor)).toBeNull();
  });

  it('未知の mode は fail-closed で、顧客経路にも共有経路にも落ちない (受入条件 5)', async () => {
    const { resolve, customerCalls } = createResolver();

    expect(await resolve(UNKNOWN_MODE)).toBeNull();
    expect(customerCalls).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 受入条件 2: hd の欠落・不一致を拒否する
// ---------------------------------------------------------------------------

describe('Google hd claim の照合 (受入条件 2)', () => {
  /** 共有方式で全条件を満たす入力。各テストは壊したい 1 点だけを上書きする。 */
  function sharedInput(overrides: Partial<OidcVerificationInput> = {}): OidcVerificationInput {
    return {
      claims: {
        iss: GOOGLE_OIDC_ISSUER,
        aud: SHARED_CLIENT_ID,
        sub: 'google-subject-1',
        iat: NOW - 10,
        exp: NOW + 300,
        nonce: 'nonce-value',
        email: 'member@a-corp.example',
        email_verified: true,
        hd: 'a-corp.example',
        ...overrides.claims,
      },
      connection: SHARED_A,
      discoveredIssuer: GOOGLE_OIDC_ISSUER,
      expectedNonce: 'nonce-value',
      expectedState: 'state-value',
      receivedState: 'state-value',
      codeChallengeMethod: 'S256',
      nowSeconds: NOW,
      ...overrides,
    };
  }

  it('許可 Workspace ドメインと一致する hd は受理される', () => {
    expect(verifyOidcIdToken(sharedInput())).toEqual({
      ok: true,
      tenantId: TENANT_A,
      idpSubject: 'google-subject-1',
      email: 'member@a-corp.example',
    });
  });

  it('hd の大文字小文字差は一致として扱う (IdP 由来の表記ゆれで無言拒否にしない)', () => {
    const result = verifyOidcIdToken(sharedInput({ claims: { ...sharedInput().claims, hd: 'A-Corp.Example' } }));
    expect(result.ok).toBe(true);
  });

  it('hd 欠落 (個人 Google アカウント) は workspace_domain_missing', () => {
    const { hd: _dropped, ...withoutHd } = sharedInput().claims;
    expect(verifyOidcIdToken(sharedInput({ claims: withoutHd }))).toEqual({
      ok: false,
      reason: 'workspace_domain_missing',
    });
  });

  it('hd 空文字も欠落と同じ扱い', () => {
    expect(verifyOidcIdToken(sharedInput({ claims: { ...sharedInput().claims, hd: '' } }))).toEqual({
      ok: false,
      reason: 'workspace_domain_missing',
    });
  });

  it('別 Workspace の hd は workspace_domain_mismatch', () => {
    expect(verifyOidcIdToken(sharedInput({ claims: { ...sharedInput().claims, hd: 'b-corp.example' } }))).toEqual({
      ok: false,
      reason: 'workspace_domain_mismatch',
    });
  });

  it('サブドメインは一致しない (前方/後方一致で緩めない)', () => {
    // `endsWith` 実装だと `evil-a-corp.example` が `a-corp.example` に一致してしまう
    for (const hd of ['sub.a-corp.example', 'evil-a-corp.example', 'a-corp.example.evil']) {
      expect(verifyOidcIdToken(sharedInput({ claims: { ...sharedInput().claims, hd } }))).toEqual({
        ok: false,
        reason: 'workspace_domain_mismatch',
      });
    }
  });

  it('許可ドメインが複数あればいずれか 1 件と一致すればよい', () => {
    const connection = { ...SHARED_A, allowedWorkspaceDomains: ['a-corp.example', 'a-corp-jp.example'] };
    const result = verifyOidcIdToken(
      sharedInput({ connection, claims: { ...sharedInput().claims, hd: 'a-corp-jp.example' } }),
    );
    expect(result.ok).toBe(true);
  });

  it('共有方式で許可ドメインが空なら hd の有無に関わらず拒否 (設定不備を素通ししない)', () => {
    const misconfigured = { ...SHARED_A, allowedWorkspaceDomains: [] };

    expect(verifyOidcIdToken(sharedInput({ connection: misconfigured }))).toEqual({
      ok: false,
      reason: 'workspace_domain_unconfigured',
    });
  });

  it('顧客方式で許可ドメイン未設定なら hd を検査しない (既存テナントの境界を変えない / 受入条件 5)', () => {
    const { hd: _dropped, ...withoutHd } = sharedInput().claims;
    const result = verifyOidcIdToken(
      sharedInput({
        connection: CUSTOMER_B,
        discoveredIssuer: CUSTOMER_B.issuer,
        claims: { ...withoutHd, iss: CUSTOMER_B.issuer, aud: CUSTOMER_B.clientId },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('顧客方式でも許可ドメインを設定すれば hd 検査が効く', () => {
    const scoped = { ...CUSTOMER_B, allowedWorkspaceDomains: ['b-corp.example'] };
    const { hd: _dropped, ...withoutHd } = sharedInput().claims;

    expect(
      verifyOidcIdToken(
        sharedInput({
          connection: scoped,
          discoveredIssuer: scoped.issuer,
          claims: { ...withoutHd, iss: scoped.issuer, aud: scoped.clientId },
        }),
      ),
    ).toEqual({ ok: false, reason: 'workspace_domain_missing' });
  });

  it('aud が共有 client と違えば hd 以前に audience_mismatch', () => {
    // 共通 client では aud がテナント識別子にならないが、client 識別子としては依然必要
    expect(verifyOidcIdToken(sharedInput({ claims: { ...sharedInput().claims, aud: 'other-client' } }))).toEqual({
      ok: false,
      reason: 'audience_mismatch',
    });
  });

  it('同じ hd でもテナントが違えば別 principal になる (受入条件 3)', () => {
    const sharedTwin = {
      ...SHARED_A,
      tenantId: TENANT_B,
      tenantSlug: 'tenant-b-shared',
      displayName: 'Tenant B (共通 client)',
    };

    const first = verifyOidcIdToken(sharedInput());
    const second = verifyOidcIdToken(sharedInput({ connection: sharedTwin }));

    if (!first.ok || !second.ok) throw new Error('前提: どちらも受理されるはず');
    // 同じ Google sub でも tenantId が違うので、(tenant_id, sub) の束縛先が分かれる
    expect(first.idpSubject).toBe(second.idpSubject);
    expect(first.tenantId).toBe(TENANT_A);
    expect(second.tenantId).toBe(TENANT_B);
  });
});

// ---------------------------------------------------------------------------
// 受入条件 5: 方式不明・設定不備で共有方式へ暗黙 fallback しない
// ---------------------------------------------------------------------------

describe('接続解決の fail-closed (受入条件 5)', () => {
  it('共有方式で許可 Workspace ドメインが空なら認可を開始させない', async () => {
    const port = createInMemoryOidcConnections([{ ...SHARED_A, allowedWorkspaceDomains: [] }]);
    expect(await resolveTenantOidcConfig(port, 'tenant-a')).toBeNull();
  });

  it('未知の mode は解決しない', async () => {
    const port = createInMemoryOidcConnections([UNKNOWN_MODE]);
    expect(await resolveTenantOidcConfig(port, 'tenant-a')).toBeNull();
  });

  it('顧客方式は許可ドメインが空でも従来どおり解決できる', async () => {
    const port = createInMemoryOidcConnections([CUSTOMER_B]);
    expect(await resolveTenantOidcConfig(port, 'tenant-b')).toMatchObject({ tenantId: TENANT_B });
  });
});
