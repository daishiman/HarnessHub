/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628) の wire 契約。
 * 本 package が所有するのは Hub 側の code/approve/token だけで、
 * OS 資格情報域への保存は feat-publisher-plugin の責務 (保存 API はここに存在しない)。
 */
import { z } from 'zod';

import { deviceCodeSchema, tenantSlugSchema, userCodeSchema } from './primitives.js';

/** `POST /api/v1/device/code` の要求。RFC 8628 §3.1。 */
export const deviceCodeRequestSchema = z.object({
  /** どのテナントへ繋ぐ device かを最初に確定させる (テナント跨ぎの候補提示をしないため)。 */
  tenant_slug: tenantSlugSchema,
  /** 要求 scope。空配列は「scope なし」を明示する。省略と同義にしない。 */
  scope: z.array(z.string().min(1)).default([]),
  /** 表示用のデバイス名 (例: `daishi-macbook`)。監査と token 一覧で人が識別するために使う。 */
  device_label: z.string().min(1).max(64).optional(),
});
export type DeviceCodeRequest = z.output<typeof deviceCodeRequestSchema>;

/** `POST /api/v1/device/code` の応答。RFC 8628 §3.2。 */
export const deviceCodeResponseSchema = z.object({
  device_code: deviceCodeSchema,
  user_code: userCodeSchema,
  /** 利用者がブラウザで開く URL。 */
  verification_uri: z.string().min(1),
  /** user_code を埋め込んだ URL。RFC 8628 §3.3.1 の任意項目だが、手入力を減らすため常に返す。 */
  verification_uri_complete: z.string().min(1),
  /** device_code の有効秒数。 */
  expires_in: z.number().int().positive(),
  /** polling 間隔の秒数。`slow_down` を受けたら client はこの値を増やす。 */
  interval: z.number().int().positive(),
});
export type DeviceCodeResponse = z.output<typeof deviceCodeResponseSchema>;

/** `POST /api/v1/device/token` の要求。RFC 8628 §3.4。 */
export const deviceTokenRequestSchema = z.object({
  grant_type: z.literal('urn:ietf:params:oauth:grant-type:device_code'),
  device_code: deviceCodeSchema,
  /**
   * RFC 8628 には無い追加項目。
   * 全ての問い合わせにテナントスコープを要求する D4 (row-level scope) を守るため、
   * device_code だけで全テナントを横断検索する経路を作らない。client は §3.1 で送った値を再送する。
   */
  tenant_slug: tenantSlugSchema,
});
export type DeviceTokenRequest = z.output<typeof deviceTokenRequestSchema>;

/** `POST /api/v1/device/approve` の要求。ブラウザ側で session を持つ利用者が承認する。 */
export const deviceApproveRequestSchema = z.object({
  user_code: userCodeSchema,
  /** 承認を紐づける Workspace。device token は必ず単一 Workspace に束縛する。 */
  workspace_id: z.string().min(1),
});
export type DeviceApproveRequest = z.output<typeof deviceApproveRequestSchema>;

/**
 * device 認可のエラー語彙。RFC 8628 §3.5 + RFC 6749 §5.2 のうち本 flow で返しうるものだけ。
 * 語彙を絞るのは、client が未知コードを「一時エラー」と誤解して無限に polling するのを防ぐため。
 */
export const deviceErrorCodeSchema = z.enum([
  /** まだ承認されていない。client は polling を続ける。 */
  'authorization_pending',
  /** polling が速すぎる。client は interval を増やす。 */
  'slow_down',
  /** 利用者が拒否した、または user_code 試行上限に達した。 */
  'access_denied',
  /** device_code の TTL 切れ。最初からやり直す。 */
  'expired_token',
  /** device_code が不明・使用済み。 */
  'invalid_grant',
  /** 要求の形が不正。 */
  'invalid_request',
]);
export type DeviceErrorCode = z.output<typeof deviceErrorCodeSchema>;

export const deviceErrorResponseSchema = z.object({
  error: deviceErrorCodeSchema,
  /** 人向けの補足。機械判定には使わせない (判定は `error` のみ)。 */
  error_description: z.string().min(1).optional(),
});
export type DeviceErrorResponse = z.output<typeof deviceErrorResponseSchema>;
