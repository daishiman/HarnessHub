/**
 * `GET /api/hearing/{token}` 系 (公開・トークンスコープ) の共通解決ロジック。
 *
 * **`withAuthz` を使わない唯一の理由**: この経路はセッションを持たない依頼者/Claude Code が
 * 叩く前提の設計 (依頼者要件、"zip ファイル" 案を明示的に廃案にした代替)。
 * そのぶん、ここが唯一の境界になる:
 *   - トークンが無効/期限切れ/失効/存在しない場合はすべて同じ 404 に畳む (存在を伏せる)。
 *   - tenantId/workspaceId/sheetId は**トークン検証が返した値だけ**を正本にする
 *     (要求側の申告値は一切使わない — `resolveSheetResource` の逆で、ここは要求そのものを信用しない)。
 */
import { createRepositoryContext, type HearingShareTokenRow, type HearingSheetRow } from '@harness-hub/db';

import { sha256Hex } from '../../lib/auth/jwt.js';
import { hearingShareRuntime } from '../../lib/hearing-share/index.js';
import { hearingIntakeRuntime } from './runtime.js';

export interface ResolvedShareToken {
  readonly tokenRow: HearingShareTokenRow;
  readonly sheet: HearingSheetRow;
}

/**
 * token 平文からハッシュを引き、有効な `hearing_share_tokens` 行と対応する sheet を返す。
 * 無効・失効・期限切れ・sheet 不在のいずれも `null` (呼び出し側はすべて同じ 404 にする)。
 */
export async function resolveShareToken(plaintextToken: string): Promise<ResolvedShareToken | null> {
  if (plaintextToken.trim().length === 0) return null;

  const runtime = await hearingShareRuntime();
  const tokenHash = await sha256Hex(plaintextToken);
  const tokenRow = await runtime.shareTokens.findValidByTokenHash(tokenHash, Date.now());
  if (tokenRow === null) return null;

  const sheet = await hearingIntakeRuntime().repository.findSheet(
    createRepositoryContext({ tenantId: tokenRow.tenantId }),
    tokenRow.sheetId,
  );
  if (sheet === null) return null;

  return { tokenRow, sheet };
}

/** アクセスログの更新。失敗しても呼び出し元の応答は止めない (best-effort)。 */
export async function recordShareTokenAccess(tokenId: string): Promise<void> {
  try {
    const runtime = await hearingShareRuntime();
    await runtime.shareTokens.recordAccess(tokenId, Date.now());
  } catch {
    // アクセスログは可観測性のための付随情報。ここで例外を投げると本来の応答まで失敗する。
  }
}
