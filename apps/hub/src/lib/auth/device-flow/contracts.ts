/**
 * Device Authorization Grant の公開契約。
 *
 * `service.ts` は状態遷移と token 発行だけに集中させ、呼び出し側が使う型をここへ分離する。
 * これにより実装ファイルを 500 行未満に保ちつつ、公開 API の変更点を 1 ファイルで確認できる。
 */

import type { DeviceCodeResponse, DeviceErrorResponse, TokenResponse, TokenSummary } from '@harness-hub/schemas';

import type { AuditLogger } from '../../../shared/audit/index.js';
import type { AuthPorts } from '../ports.js';
import type { RandomBytes } from './codes.js';

export interface DeviceFlowDeps {
  readonly ports: AuthPorts;
  /** 監査は共通層 (src/shared/audit) の単一実装に載せる。ここで独自に記録経路を作らない。 */
  readonly audit: AuditLogger;
  /** access token の署名鍵。session とは別鍵にできるよう独立して受け取る。 */
  readonly accessTokenSecret: string;
  /** 利用者が user_code を入力する画面の URL。 */
  readonly verificationUri: string;
  readonly randomBytes?: RandomBytes;
  readonly newId?: () => string;
}

export type DeviceFlowResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DeviceErrorResponse };

export type ApproveRejection = 'not_found' | 'expired' | 'denied' | 'already_used';

export type ApproveResult =
  | { readonly ok: true; readonly deviceLabel: string | null }
  | { readonly ok: false; readonly reason: ApproveRejection };

export interface DeviceFlowService {
  requestCode(input: {
    tenantId: string;
    scope: readonly string[];
    deviceLabel: string | null;
  }): Promise<DeviceCodeResponse>;
  approve(input: { tenantId: string; userCode: string; userId: string; workspaceId: string }): Promise<ApproveResult>;
  exchangeToken(input: { tenantId: string; deviceCode: string }): Promise<DeviceFlowResult<TokenResponse>>;
  refresh(input: { tenantId: string; refreshToken: string }): Promise<DeviceFlowResult<TokenResponse>>;
  revokeToken(input: {
    tenantId: string;
    tokenId: string;
    actorUserId: string;
  }): Promise<{ readonly revokedCount: number } | null>;
  listTokensForUser(input: { tenantId: string; userId: string }): Promise<readonly TokenSummary[]>;
  listTokensForWorkspace(input: { tenantId: string; workspaceId: string }): Promise<readonly TokenSummary[]>;
}
