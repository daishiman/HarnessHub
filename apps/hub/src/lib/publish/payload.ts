/**
 * `publish_requests.findings_json` に載せる封筒 (envelope) の読み書き。
 *
 * この列は元来 finding 配列だけを想定した TEXT 列だが、本 feature は
 * アップロード済みパッケージの `content_hash` も同じ要求に紐づけて保持する必要がある。
 * 専用列を足すのが素直だが、`packages/db/schema/` の owner は feat-domain-model-db であり
 * (ADR AD-1)、実装 phase で cross-feature の DDL を独断で入れない。
 *
 * よって既存 TEXT 列へ **版番号つきの封筒**として載せる。版番号を持たせるのは、
 * 後で専用列へ移すときに「旧形式 (裸の配列) / 現行形式 (封筒)」を読み分けられるようにするため。
 * 読み取りは常に寛容 (壊れていれば空扱い)、書き込みは常に現行形式。
 *
 * follow-up: `publish_requests.content_hash` 列の追加を feat-domain-model-db へ提案する。
 */

import { publishFindingSchema } from '@harness-hub/schemas';
import { z } from 'zod';

import type { PublishPayload } from './ports.js';

/** 現行の封筒版。形を変えるときは必ず上げる。 */
export const PUBLISH_PAYLOAD_VERSION = 1;

const envelopeSchema = z.object({
  v: z.literal(PUBLISH_PAYLOAD_VERSION),
  content_hash: z.string().min(1).nullable(),
  findings: z.array(publishFindingSchema),
});

/** 空の封筒。作成直後の要求はこれ。 */
export const EMPTY_PUBLISH_PAYLOAD: PublishPayload = { contentHash: null, findings: [] };

/**
 * 列の値 → 封筒。
 *
 * **例外を投げない**。ここで落とすと、過去の行が 1 件でも想定外の形だった瞬間に
 * 一覧 API 全体が 500 になる。読めない値は「情報が無い」として扱い、
 * 状態機械の判断 (status 列) は壊さない。
 */
export function decodePublishPayload(raw: string | null): PublishPayload {
  if (raw === null || raw.trim().length === 0) return EMPTY_PUBLISH_PAYLOAD;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_PUBLISH_PAYLOAD;
  }

  const envelope = envelopeSchema.safeParse(parsed);
  if (envelope.success) {
    return { contentHash: envelope.data.content_hash, findings: envelope.data.findings };
  }

  // 旧形式 (裸の finding 配列) の読み替え。封筒導入前に書かれた行を切り捨てないため。
  const legacy = z.array(publishFindingSchema).safeParse(parsed);
  return legacy.success ? { contentHash: null, findings: legacy.data } : EMPTY_PUBLISH_PAYLOAD;
}

/** 封筒 → 列の値。 */
export function encodePublishPayload(payload: PublishPayload): string {
  return JSON.stringify({
    v: PUBLISH_PAYLOAD_VERSION,
    content_hash: payload.contentHash,
    findings: payload.findings,
  });
}
