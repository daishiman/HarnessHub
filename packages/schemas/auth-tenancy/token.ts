/**
 * token 発行・rotation・失効の公開契約 (downstream token contract)。
 * consumer (feat-publisher-plugin) はこの形にだけ依存する。
 * **保存 API はここに無い** — OS 資格情報域への保存は consumer 側の責務 (normative closure)。
 */
import { z } from 'zod';

import {
  epochSecondsSchema,
  publisherTokenScopeSchema,
  refreshTokenSchema,
  sessionRoleSchema,
  tenantSlugSchema,
} from './primitives.js';

/**
 * access token (JWT) の claims。
 * `typ` を literal で固定して session token と取り違えないようにする。
 * 署名鍵が同じでも、`typ` が違えば片方の token をもう片方の経路で使い回せない。
 */
export const accessTokenClaimsSchema = z.object({
  typ: z.literal('access'),
  sub: z.string().min(1),
  tenant_id: z.string().min(1),
  /** access token は単一 Workspace に束縛する (CLI は 1 台 1 Workspace で使う想定)。 */
  workspace_id: z.string().min(1),
  /** 失効操作の対象を特定するための token 行 ID。 */
  token_id: z.string().min(1),
  role: sessionRoleSchema,
  scope: z.array(publisherTokenScopeSchema),
  iat: epochSecondsSchema,
  exp: epochSecondsSchema,
});
export type AccessTokenClaims = z.output<typeof accessTokenClaimsSchema>;

/**
 * token 発行応答 (RFC 6749 §5.1)。
 * `token_type` を literal に固定するのは、client が Bearer 以外を実装しないことを契約で保証するため。
 */
export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('Bearer'),
  /** access token の残り秒数。短命 (15 分) である前提を client に伝える。 */
  expires_in: z.number().int().positive(),
  /** rotation されるため、client は毎回この値で上書き保存する。 */
  refresh_token: refreshTokenSchema,
  /** 実際に付与された scope。要求と異なりうる (要求の部分集合になる)。 */
  scope: z.array(publisherTokenScopeSchema),
});
export type TokenResponse = z.output<typeof tokenResponseSchema>;

/** `POST /api/v1/token/refresh` の要求 (RFC 6749 §6)。 */
export const refreshRequestSchema = z.object({
  grant_type: z.literal('refresh_token'),
  refresh_token: refreshTokenSchema,
  /** device token 要求と同じ理由でテナントスコープを必須にする (D4)。 */
  tenant_slug: tenantSlugSchema,
});
export type RefreshRequest = z.output<typeof refreshRequestSchema>;

/**
 * token 一覧の 1 件。
 * **平文の token 値を含めない** — 一覧経路から資格情報が漏れないようにするための契約上の保証。
 */
export const tokenSummarySchema = z.object({
  id: z.string().min(1),
  device_label: z.string().min(1).nullable(),
  scope: z.array(publisherTokenScopeSchema),
  workspace_id: z.string().min(1),
  created_at: z.string().min(1),
  last_used_at: z.string().min(1).nullable(),
  expires_at: z.string().min(1),
  status: z.enum(['active', 'revoked', 'expired']),
});
export type TokenSummary = z.output<typeof tokenSummarySchema>;

export const tokenListResponseSchema = z.object({
  items: z.array(tokenSummarySchema),
});
export type TokenListResponse = z.output<typeof tokenListResponseSchema>;

/** 失効応答。冪等 (べきとう = 何回実行しても結果が同じ) にするため、既に失効済みでも成功を返す。 */
export const tokenRevocationResponseSchema = z.object({
  id: z.string().min(1),
  status: z.literal('revoked'),
  /** family 全体を巻き込んだ場合の件数 (再利用検知時は 1 より大きくなる)。 */
  revoked_count: z.number().int().positive(),
});
export type TokenRevocationResponse = z.output<typeof tokenRevocationResponseSchema>;
