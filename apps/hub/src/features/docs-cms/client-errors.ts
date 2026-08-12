import type { DocumentScope, SessionRole } from '@harness-hub/schemas';
import { sessionActionVisible } from '../../lib/authz/session-action-visibility.js';

/**
 * 文書の scope に応じて必要な action を判定する。
 * `common` は `docs.write_tenant` に加えて `docs.write_common` (provider-admin) も要る
 * (POST /api/v1/docs と同じ二段ゲート。api/v1/docs/route.ts を参照)。
 * ここでの判定は「導線を出すかどうか」の表示制御であり、最終的な可否は API 側の 403 が正本。
 */
export function canWriteDocument(role: SessionRole | null, scope: DocumentScope): boolean {
  if (!sessionActionVisible(role, 'docs.write_tenant')) return false;
  if (scope === 'common') return sessionActionVisible(role, 'docs.write_common');
  return true;
}

/**
 * client 側 fetch のエラーメッセージ抽出。
 *
 * サーバは problem+json (`detail`/`errors[].message`/`title`) で失敗理由を返しているのに、
 * 各画面が `throw new Error('保存できませんでした。')` のような固定文言で握りつぶすと、
 * 権限不足 (403) もバリデーション失敗 (422) も同じ表示になり、利用者は原因を判断できない。
 * `builds/build-board.tsx` の既存パターンに合わせ、最も具体的な problem の理由を出す。
 */
export async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  if (response.status === 403) return '権限が不足しているため、この操作はできません。';
  try {
    const problem = (await response.json()) as {
      readonly detail?: string;
      readonly title?: string;
      readonly errors?: readonly { readonly message?: string }[];
    };
    return (
      problem.errors?.find((error) => error.message !== undefined)?.message ??
      problem.detail ??
      problem.title ??
      fallback
    );
  } catch {
    return fallback;
  }
}
