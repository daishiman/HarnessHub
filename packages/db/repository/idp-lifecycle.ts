/**
 * idp_connections の credential lifecycle 契約。
 *
 * 永続化の SQL から状態語彙・遷移規則・CAS 入力を分離し、repository 本体を
 * 「どの列をどう更新するか」に集中させる。公開型は引き続き `repository/idp` から
 * re-export するため、既存の呼び出し側は import 先を変えなくてよい。
 */

import type { idpConnections } from '../schema/core/identity';

export type IdpCredentialMode = (typeof idpConnections.credentialMode)['_']['data'];
export type IdpCredentialStatus = (typeof idpConnections.credentialStatus)['_']['data'];

/** 認証解決に使ってよい唯一の状態。 */
export const RESOLVABLE_CREDENTIAL_STATUS: IdpCredentialStatus = 'active';

/** 識別用に保持する secret 末尾の文字数。全値は保存後に返さない。 */
export const CLIENT_SECRET_LAST4_LENGTH = 4;

export function clientSecretLast4(clientSecret: string): string {
  return clientSecret.slice(-CLIENT_SECRET_LAST4_LENGTH);
}

/** 共有方式の行は credential を持たない。空文字はその保存表現であり、平文 secret ではない。 */
export const SHARED_CREDENTIAL_PLACEHOLDER = '';

export interface IdpConnectionRow {
  readonly id: string;
  readonly tenantId: string;
  readonly issuerUrl: string;
  readonly clientId: string;
  readonly clientSecretEnc: string;
  readonly scopes: string;
  readonly createdAt: number;
  readonly credentialMode: IdpCredentialMode;
  readonly allowedWorkspaceDomains: string | null;
  readonly credentialStatus: IdpCredentialStatus;
  readonly clientSecretLast4: string | null;
  readonly pendingClientSecretEnc: string | null;
  readonly pendingClientSecretLast4: string | null;
  readonly pendingClientId: string | null;
  readonly pendingCredentialMode: IdpCredentialMode | null;
  readonly pendingAllowedWorkspaceDomains: string | null;
  readonly pendingTestedAt: number | null;
  readonly lastTestedAt: number | null;
  readonly updatedAt: number | null;
}

export class SharedCredentialSecretAccessError extends Error {
  constructor(rowId: string) {
    super(`idp_connections(${rowId}) は共有 credential 方式のため行に client_secret を持ちません`);
    this.name = 'SharedCredentialSecretAccessError';
  }
}

export class PendingCredentialAbsentError extends Error {
  constructor(rowId: string) {
    super(`idp_connections(${rowId}) は rotation 中でないため pending client_secret を持ちません`);
    this.name = 'PendingCredentialAbsentError';
  }
}

export class InvalidCredentialStatusTransitionError extends Error {
  constructor(from: IdpCredentialStatus, to: IdpCredentialStatus) {
    super(`idp_connections の lifecycle は ${from} → ${to} の遷移を許可していません`);
    this.name = 'InvalidCredentialStatusTransitionError';
  }
}

/** disabled から active へ直接戻さず、再登録・再テストを必須にする。 */
const ALLOWED_STATUS_TRANSITIONS: Readonly<Record<IdpCredentialStatus, readonly IdpCredentialStatus[]>> = {
  pending: ['tested', 'disabled'],
  tested: ['active', 'disabled'],
  active: ['disabled'],
  disabled: ['pending'],
};

export function assertCredentialStatusTransition(from: IdpCredentialStatus, to: IdpCredentialStatus): void {
  if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
    throw new InvalidCredentialStatusTransitionError(from, to);
  }
}

/** staging 中の secret を固定する CAS（比較してから更新する仕組み）の期待値。 */
export interface PendingSecretCas {
  readonly id: string;
  readonly expectedPendingSecretEnc: string;
}

/** 現行 secret と状態を固定し、テスト結果を別 credential へ誤適用しないための期待値。 */
export interface CurrentSecretCas {
  readonly id: string;
  readonly expectedClientSecretEnc: string;
  readonly expectedStatus: IdpCredentialStatus;
}
