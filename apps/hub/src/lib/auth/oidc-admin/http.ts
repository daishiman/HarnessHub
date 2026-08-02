/**
 * 管理 API の業務結果 → HTTP 応答の変換
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * route ごとに status を書くと、同じ `state_conflict` が 409 だったり 400 だったりする。
 * 対応表を 1 枚にしておけば、運用手順書に「409 が出たら読み直して再試行」と 1 行書ける。
 *
 * 認可拒否 (`withAuthz` の 401/403/404) はここを通らない。混ぜないのは
 * 「権限が無い」と「順序が違う」で運用者の次の一手が全く違うため。
 */

import { oidcAdminErrorSchema } from '@harness-hub/schemas';

import type { OidcAdminErrorCode, OidcAdminResult } from './service.js';

/**
 * 業務エラー → HTTP status。
 *
 * `connection_not_found` だけ 404 で、残りは 409 か 400。
 * 409 (Conflict) に寄せるのは、いずれも「今の状態ではその操作を受け付けられない」であり、
 * **要求そのものは正しい**から。400 にすると client 側が「要求を直す」方向へ誘導され、
 * 実際に必要な「状態を読み直す」に辿り着けない。
 */
const STATUS_BY_ERROR: Readonly<Record<OidcAdminErrorCode, 400 | 404 | 409>> = {
  connection_not_found: 404,
  not_customer_managed: 409,
  state_conflict: 409,
  invalid_transition: 409,
  rotation_not_staged: 409,
  invalid_request: 400,
};

export function oidcAdminErrorResponse(error: OidcAdminErrorCode): Response {
  // schema を通してから返す。応答の形が契約から外れたらここで落ちる
  return Response.json(oidcAdminErrorSchema.parse({ error }), { status: STATUS_BY_ERROR[error] });
}

/**
 * 成功なら `toBody` の結果を 200、失敗なら対応表の status で返す。
 *
 * `toBody` に wire schema の `parse` を渡す前提。service の戻り値をそのまま
 * `Response.json` へ流すと、型に無いフィールドが増えたときに応答へ素通りする。
 */
export function oidcAdminResponse<T>(
  result: OidcAdminResult<T>,
  toBody: (value: T) => unknown,
  successStatus: 200 | 201 = 200,
): Response {
  if (!result.ok) return oidcAdminErrorResponse(result.error);
  return Response.json(toBody(result.value), { status: successStatus });
}

/**
 * 要求本文を JSON として読む。本文が無い・壊れている場合は `null`。
 *
 * 例外を投げないのは、`{}` を既定にできる要求 (テスト対象の指定など) で
 * 「本文なし」を正常系として扱いたいため。呼び出し側が `null` を
 * どう解釈するかを決める。
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
