/**
 * T-OIDC-01 〜 T-OIDC-18 (QC-1 / QC-6)。
 *
 * IdP は**立てない**。検証契約が純関数 (`verifyOidcIdToken`) なので、claims を直接組んで全分岐を通せる。
 * これは ADR AD-5 の「検証契約を Auth.js から切り離す」判断がテスト可能性として現れたもの。
 */

import { oidcIdTokenClaimsSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import * as authPublicSurface from '../../src/lib/auth/index.js';
import { resolveSignIn } from '../../src/lib/auth/index.js';
import { type OidcVerificationInput, resolveTenantOidcConfig, verifyOidcIdToken } from '../../src/lib/auth/oidc.js';
import type { TenantOidcConnection } from '../../src/lib/auth/ports.js';
import {
  createInMemoryOidcConnections,
  createInMemoryUsers,
  oidcConnection,
  TENANT_A,
  TENANT_B,
} from './support/in-memory-ports.js';

const NOW = 1_800_000_000;

const CONNECTION_A: TenantOidcConnection = oidcConnection({
  tenantId: TENANT_A,
  tenantSlug: 'tenant-a',
  issuer: 'https://idp-a.example.com',
  clientId: 'client-a',
  displayName: 'Tenant A IdP',
});

const CONNECTION_B: TenantOidcConnection = oidcConnection({
  tenantId: TENANT_B,
  tenantSlug: 'tenant-b',
  issuer: 'https://idp-b.example.com',
  clientId: 'client-b',
  displayName: 'Tenant B IdP',
});

/** 全条件を満たす入力。各テストは**壊したい 1 点だけ**を上書きする。 */
function baseInput(overrides: Partial<OidcVerificationInput> = {}): OidcVerificationInput {
  return {
    claims: {
      iss: CONNECTION_A.issuer,
      aud: CONNECTION_A.clientId,
      sub: 'idp-subject-1',
      iat: NOW - 10,
      exp: NOW + 300,
      nonce: 'nonce-value',
      email: 'user@example.com',
      email_verified: true,
      ...overrides.claims,
    },
    connection: CONNECTION_A,
    discoveredIssuer: CONNECTION_A.issuer,
    expectedNonce: 'nonce-value',
    expectedState: 'state-value',
    receivedState: 'state-value',
    codeChallengeMethod: 'S256',
    nowSeconds: NOW,
    ...overrides,
  };
}

describe('T-OIDC: テナント別 OIDC 解決 (QC-1)', () => {
  it('T-OIDC-01: tenant_slug ごとに異なる issuer / client_id が返る', async () => {
    const port = createInMemoryOidcConnections([CONNECTION_A, CONNECTION_B]);

    const a = await resolveTenantOidcConfig(port, 'tenant-a');
    const b = await resolveTenantOidcConfig(port, 'tenant-b');

    expect(a?.issuer).toBe('https://idp-a.example.com');
    expect(b?.issuer).toBe('https://idp-b.example.com');
    expect(a?.clientId).not.toBe(b?.clientId);
  });

  it('T-OIDC-02: 未登録 tenant_slug は null (既定 provider へ落とさない)', async () => {
    const port = createInMemoryOidcConnections([CONNECTION_A]);
    expect(await resolveTenantOidcConfig(port, 'tenant-unknown')).toBeNull();
  });

  it('T-OIDC-03: 無効化された接続は null', async () => {
    const port = createInMemoryOidcConnections([{ ...CONNECTION_A, enabled: false }]);
    expect(await resolveTenantOidcConfig(port, 'tenant-a')).toBeNull();
  });

  it('T-OIDC-02 補: slug の形が不正なら DB を引く前に null', async () => {
    const port = createInMemoryOidcConnections([CONNECTION_A]);
    // 大文字を許すと同一テナントが 2 通りの URL を持つため、slug 段階で弾く
    expect(await resolveTenantOidcConfig(port, 'Tenant-A')).toBeNull();
  });
});

describe('T-OIDC: ID token 検証契約 (QC-1)', () => {
  it('T-OIDC-04: claims.iss が設定値と違えば issuer_mismatch', () => {
    const result = verifyOidcIdToken(baseInput({ claims: { ...baseInput().claims, iss: 'https://evil.example.com' } }));
    expect(result).toEqual({ ok: false, reason: 'issuer_mismatch' });
  });

  it('T-OIDC-05: discovery の issuer が設定値と違えば issuer_mismatch', () => {
    const result = verifyOidcIdToken(baseInput({ discoveredIssuer: 'https://idp-a.example.net' }));
    expect(result).toEqual({ ok: false, reason: 'issuer_mismatch' });
  });

  it('T-OIDC-06: aud 不一致は audience_mismatch', () => {
    const result = verifyOidcIdToken(baseInput({ claims: { ...baseInput().claims, aud: 'client-other' } }));
    expect(result).toEqual({ ok: false, reason: 'audience_mismatch' });
  });

  it('T-OIDC-07: aud が配列で azp が自分でなければ audience_mismatch', () => {
    const result = verifyOidcIdToken(
      baseInput({ claims: { ...baseInput().claims, aud: ['client-a', 'client-other'], azp: 'client-other' } }),
    );
    expect(result).toEqual({ ok: false, reason: 'audience_mismatch' });
  });

  it('T-OIDC-07 補: aud が配列でも azp が自分なら受理される', () => {
    const result = verifyOidcIdToken(
      baseInput({ claims: { ...baseInput().claims, aud: ['client-a', 'client-other'], azp: 'client-a' } }),
    );
    expect(result.ok).toBe(true);
  });

  it('T-OIDC-08: nonce 欠落は nonce_mismatch (検査省略にしない)', () => {
    const { nonce: _dropped, ...claimsWithoutNonce } = baseInput().claims;
    const result = verifyOidcIdToken(baseInput({ claims: claimsWithoutNonce }));
    expect(result).toEqual({ ok: false, reason: 'nonce_mismatch' });
  });

  it('T-OIDC-09: nonce 不一致は nonce_mismatch', () => {
    const result = verifyOidcIdToken(baseInput({ claims: { ...baseInput().claims, nonce: 'replayed-nonce' } }));
    expect(result).toEqual({ ok: false, reason: 'nonce_mismatch' });
  });

  it('T-OIDC-10: state 欠落は state_mismatch', () => {
    expect(verifyOidcIdToken(baseInput({ receivedState: null }))).toEqual({ ok: false, reason: 'state_mismatch' });
  });

  it('T-OIDC-10 補: state 不一致も state_mismatch', () => {
    expect(verifyOidcIdToken(baseInput({ receivedState: 'other-state' }))).toEqual({
      ok: false,
      reason: 'state_mismatch',
    });
  });

  it('T-OIDC-11: PKCE plain は pkce_required', () => {
    expect(verifyOidcIdToken(baseInput({ codeChallengeMethod: 'plain' }))).toEqual({
      ok: false,
      reason: 'pkce_required',
    });
  });

  it('T-OIDC-12: PKCE 未使用は pkce_required', () => {
    expect(verifyOidcIdToken(baseInput({ codeChallengeMethod: null }))).toEqual({
      ok: false,
      reason: 'pkce_required',
    });
  });

  it('T-OIDC-13: email_verified が true でなければ email_unverified', () => {
    expect(verifyOidcIdToken(baseInput({ claims: { ...baseInput().claims, email_verified: false } }))).toEqual({
      ok: false,
      reason: 'email_unverified',
    });

    const { email_verified: _dropped, ...withoutFlag } = baseInput().claims;
    expect(verifyOidcIdToken(baseInput({ claims: withoutFlag }))).toEqual({
      ok: false,
      reason: 'email_unverified',
    });
  });

  it('T-OIDC-13 補: exp 超過は token_expired', () => {
    expect(verifyOidcIdToken(baseInput({ nowSeconds: NOW + 301 }))).toEqual({ ok: false, reason: 'token_expired' });
  });

  it('T-OIDC-14: 全条件充足で受理し tenant_id / sub を返す', () => {
    const result = verifyOidcIdToken(baseInput());
    expect(result).toEqual({
      ok: true,
      tenantId: TENANT_A,
      idpSubject: 'idp-subject-1',
      email: 'user@example.com',
    });
  });

  it('T-OIDC-15: sub が同値でもテナントが違えば別 principal に解決される', async () => {
    const users = createInMemoryUsers();

    const verifiedA = verifyOidcIdToken(baseInput());
    const verifiedB = verifyOidcIdToken(
      baseInput({
        connection: CONNECTION_B,
        discoveredIssuer: CONNECTION_B.issuer,
        claims: { ...baseInput().claims, iss: CONNECTION_B.issuer, aud: CONNECTION_B.clientId },
      }),
    );
    if (!verifiedA.ok || !verifiedB.ok) throw new Error('前提: 両方とも受理されるはず');
    expect(verifiedA.idpSubject).toBe(verifiedB.idpSubject);

    const signedInA = await resolveSignIn({
      users,
      tenantId: verifiedA.tenantId,
      idpSubject: verifiedA.idpSubject,
      email: verifiedA.email,
      allowJitProvisioning: true,
    });
    const signedInB = await resolveSignIn({
      users,
      tenantId: verifiedB.tenantId,
      idpSubject: verifiedB.idpSubject,
      email: verifiedB.email,
      allowJitProvisioning: true,
    });

    if (!signedInA.ok || !signedInB.ok) throw new Error('前提: 両方とも provisioning されるはず');
    // (tenant_id, idp_subject) の複合で束縛されているので、同じ sub でも別行になる
    expect(signedInA.user.id).not.toBe(signedInB.user.id);
    expect(signedInA.user.tenantId).toBe(TENANT_A);
    expect(signedInB.user.tenantId).toBe(TENANT_B);
  });

  it('T-OIDC-16: JIT provisioning は role=member / status=active 固定', async () => {
    const users = createInMemoryUsers();
    const outcome = await resolveSignIn({
      users,
      tenantId: TENANT_A,
      idpSubject: 'brand-new',
      email: 'new@example.com',
      allowJitProvisioning: true,
    });

    if (!outcome.ok) throw new Error(`provisioning されるはず: ${outcome.reason}`);
    expect(outcome.provisioned).toBe(true);
    expect(outcome.user.role).toBe('member');
    expect(outcome.user.status).toBe('active');
  });

  it('T-OIDC-16 補: provisioning を閉じたテナントでは未知の利用者を作らない', async () => {
    const users = createInMemoryUsers();
    const outcome = await resolveSignIn({
      users,
      tenantId: TENANT_A,
      idpSubject: 'brand-new',
      email: null,
      allowJitProvisioning: false,
    });

    expect(outcome).toEqual({ ok: false, reason: 'provisioning_disabled' });
    expect(users.all()).toHaveLength(0);
  });

  it('T-OIDC-17: IdP が role claim を送ってきても無視される', async () => {
    // 契約 schema が role を持たないので、パース時点で claims から落ちる
    const parsed = oidcIdTokenClaimsSchema.parse({
      iss: CONNECTION_A.issuer,
      aud: CONNECTION_A.clientId,
      sub: 'privilege-seeker',
      iat: NOW - 10,
      exp: NOW + 300,
      nonce: 'nonce-value',
      role: 'provider-admin',
      groups: ['hub-admins'],
    });
    expect(parsed).not.toHaveProperty('role');
    expect(parsed).not.toHaveProperty('groups');

    const users = createInMemoryUsers();
    const outcome = await resolveSignIn({
      users,
      tenantId: TENANT_A,
      idpSubject: parsed.sub,
      email: null,
      allowJitProvisioning: true,
    });

    if (!outcome.ok) throw new Error('provisioning されるはず');
    // IdP 側の設定変更が Hub の権限昇格にならないことの表明
    expect(outcome.user.role).toBe('member');
  });

  it('T-OIDC-17 補: 既存利用者の role を sign-in が書き換えない', async () => {
    const users = createInMemoryUsers([
      {
        id: 'user-existing',
        tenantId: TENANT_A,
        idpSubject: 'existing-subject',
        role: 'member',
        status: 'active',
        workspaceIds: [],
      },
    ]);

    const outcome = await resolveSignIn({
      users,
      tenantId: TENANT_A,
      idpSubject: 'existing-subject',
      email: null,
      allowJitProvisioning: true,
    });

    if (!outcome.ok) throw new Error('受理されるはず');
    expect(outcome.provisioned).toBe(false);
    expect(outcome.user.role).toBe('member');
  });

  it('T-OIDC-17 補: 無効化済み利用者は IdP を通っても入れない', async () => {
    const users = createInMemoryUsers([
      {
        id: 'user-disabled',
        tenantId: TENANT_A,
        idpSubject: 'disabled-subject',
        role: 'member',
        status: 'inactive',
        workspaceIds: [],
      },
    ]);

    expect(
      await resolveSignIn({
        users,
        tenantId: TENANT_A,
        idpSubject: 'disabled-subject',
        email: null,
        allowJitProvisioning: true,
      }),
    ).toEqual({ ok: false, reason: 'user_inactive' });
  });
});

describe('T-OIDC-18: Hub 固有のパスワード認証経路が存在しない (QC-6)', () => {
  it('lib/auth の公開面にパスワード系 API が無い', () => {
    const forbidden = /password|passwd|bcrypt|argon2|scrypt|pbkdf2/i;
    const leaked = Object.keys(authPublicSurface).filter((name) => forbidden.test(name));
    expect(leaked).toEqual([]);
  });

  it('sign-in の入力に資格情報 (パスワード) を渡す余地が無い', () => {
    // resolveSignIn は「検証済み IdP subject」しか受け取らない。
    // 引数に平文資格情報が現れないことを、関数の引数個数と公開面の両方で表明する
    expect(resolveSignIn.length).toBe(1);
  });
});
